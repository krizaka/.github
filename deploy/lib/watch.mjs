// The post-merge deploy check (krizaka/.github#113 P2-8): a merge to main that starts no deployment within the grace
// period is reported — and, with `trigger`, deployed with a plain create-deployment. One run looks at every app of the
// Krizaka team (a few doctl reads, no polling job per merge); the workflow runs it on a short schedule.
import { GuardError } from "./errors.mjs";
import { assertContext } from "./doctl.mjs";
import { componentsOf } from "./head.mjs";

const STARTED_PHASES = new Set(["PENDING_BUILD", "BUILDING", "PENDING_DEPLOY", "DEPLOYING", "ACTIVE", "SUPERSEDED", "ERROR", "CANCELED"]);

/** The head of `branch` and when it was committed. */
async function headOf(repo, branch, { fetch, env }) {
  const auth = env.GITHUB_TOKEN || env.GH_TOKEN;
  const headers = { accept: "application/vnd.github+json", "user-agent": "krizaka-deploy", ...(auth ? { authorization: `Bearer ${auth}` } : {}) };
  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`, { headers, signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new GuardError("commit", `cannot read the head of ${repo}@${branch}: ${error.message}`);
  }
  if (res.status !== 200) throw new GuardError("commit", `cannot read the head of ${repo}@${branch} (GitHub answered ${res.status})`);
  const body = await res.json();
  const date = Date.parse(body?.commit?.committer?.date ?? "");
  if (!/^[0-9a-f]{40}$/.test(body?.sha ?? "") || Number.isNaN(date)) throw new GuardError("commit", `GitHub's answer for ${repo}@${branch} has no sha or date`);
  return { sha: body.sha, at: date };
}

/** Did a deployment of this commit start? (any phase: a failed one started, it is reported apart.) */
function deploymentOf(deployments, sha) {
  return deployments.find((d) => STARTED_PHASES.has(d.phase) && (componentsOf(d).some((c) => c.source_commit_hash === sha) || d.cause_details?.git_push?.commit_sha === sha));
}

const FAILED_PHASES = new Set(["ERROR", "CANCELED"]);

/** An automatic or manual rollback: it re-activates an older commit, it is never the outcome of a commit being deployed. */
const isRollback = (d) => /rollback/i.test(`${d.cause ?? ""} ${JSON.stringify(d.cause_details ?? {})}`);

/** The newest deployment caused by a commit (a push or a plain create-deployment), a rollback never counting: its phase is the verdict of the last commit. */
export function newestCommitDeployment(deployments) {
  return [...deployments].filter((d) => !isRollback(d)).sort((a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0))[0];
}

function reasonLine(name, reason) {
  const detail = reason?.message ?? reason?.code;
  return detail ? name + ": " + detail : name;
}

/** The reasons of the steps that failed in a deployment's progress, one string: « build/npm-ci: message ». */
export function failureReason(deployment) {
  const out = [];
  const walk = (steps, path) => {
    for (const step of steps ?? []) {
      const name = [...path, step.name].filter(Boolean).join("/");
      if (step.status === "ERROR") out.push(reasonLine(name, step.reason));
      walk(step.steps, [...path, step.name]);
    }
  };
  walk(deployment.progress?.steps, []);
  return out.join("; ") || "no step reason reported";
}

/** Files one GitHub component of an app in the report: manual, ok, failed, waiting or missing. */
async function checkComponent(report, entry, github, { doctl, fetch, now, env, graceMinutes }) {
  if (!github.deploy_on_push) {
    report.manual.push({ ...entry, note: "deploy_on_push is off: deployed by hand or by `krizaka-deploy`" });
    return;
  }
  const head = await headOf(github.repo, github.branch, { fetch, env });
  const ageMinutes = Math.floor((now() - head.at) / 60_000);
  const deployments = JSON.parse((await doctl.run(["apps", "list-deployments", entry.appId, "-o", "json"])) || "[]");
  const found = deploymentOf(deployments, head.sha);
  const row = { ...entry, sha: head.sha, ageMinutes };
  // The newest commit-caused deployment decides, even when DigitalOcean's automatic rollback is ACTIVE after it (verikora-dev, krizaka-internal#3780).
  const newest = newestCommitDeployment(deployments);
  const failedOne = newest && FAILED_PHASES.has(newest.phase) ? newest : null;
  if (failedOne) {
    const commit = failedOne.cause_details?.git_push?.commit_sha ?? componentsOf(failedOne)[0]?.source_commit_hash ?? head.sha;
    report.failed.push({ ...row, sha: commit, deployment: failedOne.id, phase: failedOne.phase, reason: failureReason(failedOne) });
  }
  if (found) {
    if (!failedOne) report.ok.push({ ...row, deployment: found.id, phase: found.phase });
  } else (ageMinutes < graceMinutes ? report.waiting : report.missing).push(row);
}

/** Starts a plain deployment for each app whose branch head has none, and logs what it found. */
async function reportProblems(report, { doctl, log, trigger }) {
  for (const m of report.missing) {
    log(`MISSING ${m.app}: ${m.repo}@${m.branch} head ${m.sha.slice(0, 10)} merged ${m.ageMinutes} min ago, no deployment started`);
    if (!trigger) continue;
    const created = await doctl.json(["apps", "create-deployment", m.appId]);
    m.triggered = created?.id ?? null;
    log(`  triggered deployment ${m.triggered} (plain, no --force-rebuild; \`krizaka-deploy\` verifies the commit that runs)`);
  }
  for (const f of report.failed) log(`FAILED ${f.app}: deployment ${f.deployment} of commit ${f.sha.slice(0, 10)} ended ${f.phase}: ${f.reason}`);
}

/**
 * @returns { ok, waiting, missing, failed, manual }: lists of { app, repo, branch, sha, ageMinutes, … }
 */
export async function watch(options, deps) {
  const { graceMinutes = 10, trigger = false, only = [] } = options;
  const { doctl, fetch = globalThis.fetch, now = Date.now, log = console.log, env = process.env, argv = [] } = deps;
  assertContext({ env, argv });
  await doctl.assertTeam();
  const apps = JSON.parse((await doctl.run(["apps", "list", "-o", "json"])) || "[]");
  const report = { ok: [], waiting: [], missing: [], failed: [], manual: [] };
  for (const app of apps.filter((a) => !only.length || only.includes(a?.spec?.name))) {
    const seen = new Set();
    for (const component of componentsOf(app.spec)) {
      const github = component.github;
      const key = `${github?.repo}@${github?.branch}`;
      if (!github?.repo || seen.has(key)) continue;
      seen.add(key);
      const entry = { app: app.spec.name, appId: app.id, repo: github.repo, branch: github.branch };
      await checkComponent(report, entry, github, { doctl, fetch, now, env, graceMinutes });
    }
  }
  await reportProblems(report, { doctl, log, trigger });
  return report;
}
