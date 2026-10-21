// After a deploy: the commit that runs is the head of the branch the app follows (krizaka/.github#113).
// A force-rebuild can reuse a cached source clone and ship old code under an ACTIVE deployment (orazaka-dev core,
// 2026-10-21); the deployment's own report is therefore not trusted alone. Three sources must agree with the branch head
// read from GitHub: each component's `source_commit_hash`, the `Checking out commit` lines of the build log, and — for a
// deployment caused by a push — `cause_details.git_push.commit_sha`. Anything else throws a GuardError("commit").
import { GuardError } from "./errors.mjs";

export const COMPONENT_KINDS = ["services", "static_sites", "workers", "jobs", "functions"];
export const componentsOf = (obj) => COMPONENT_KINDS.flatMap((k) => obj?.[k] ?? []);

const short = (sha) => String(sha).slice(0, 10);
const ANSI = /\u001b\[[0-9;]*m/g;

/** The head commit of `branch` of `repo`, from GitHub (a token from GITHUB_TOKEN / GH_TOKEN is used when set). */
export async function branchHead(repo, branch, { fetch, env = process.env }) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  const headers = { accept: "application/vnd.github.sha", "user-agent": "krizaka-deploy", ...(token ? { authorization: `Bearer ${token}` } : {}) };
  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`, { headers, signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new GuardError("commit", `cannot read the head of ${repo}@${branch}: ${error.message}`);
  }
  const sha = (await res.text()).trim();
  if (res.status !== 200 || !/^[0-9a-f]{40}$/.test(sha)) throw new GuardError("commit", `cannot read the head of ${repo}@${branch} (GitHub answered ${res.status})`);
  return sha;
}

/** The commits the build log says it checked out. */
export const checkedOutCommits = (log) => [...new Set([...String(log).replace(ANSI, "").matchAll(/Checking out commit "([0-9a-f]{7,40})"/g)].map((m) => m[1]))];

const STALE_HINT = "main may have moved during the deploy (run it again), or the build reused a cached clone: ship the commit with a plain apply (krizaka-deploy deploy --apply, or doctl apps update <id> --spec) instead of --force-rebuild alone";

/**
 * @returns the verified [{ component, repo, branch, commit }]
 * @throws GuardError("commit") on any disagreement, an unreadable head or an empty build log
 */
export async function verifyRunningHead({ doctl, fetch, appId, deployment, spec, env = process.env }) {
  const sources = componentsOf(spec).filter((c) => c.github?.repo);
  if (!sources.length) return [];
  const heads = new Map();
  for (const { repo, branch } of sources.map((c) => c.github)) {
    const key = `${repo}@${branch}`;
    if (!heads.has(key)) heads.set(key, await branchHead(repo, branch, { fetch, env }));
  }
  const built = new Map(componentsOf(deployment).map((c) => [c.name, c.source_commit_hash]));
  const verified = [];
  for (const c of sources) {
    const { repo, branch } = c.github;
    const head = heads.get(`${repo}@${branch}`);
    const running = built.get(c.name);
    if (running !== head) {
      throw new GuardError("commit", `component ${c.name} runs ${running ? short(running) : "an unknown commit"} but ${repo}@${branch} is at ${short(head)}. ${STALE_HINT}`);
    }
    verified.push({ component: c.name, repo, branch, commit: head });
  }
  const log = await doctl.run(["apps", "logs", appId, "--type", "build", "--deployment", deployment.id]);
  const checkedOut = checkedOutCommits(log);
  if (!checkedOut.length) throw new GuardError("commit", `the build log of deployment ${deployment.id} names no checked-out commit, so the clone cannot be verified (use --skip-head-check only if you checked it yourself)`);
  const known = [...heads.values()];
  for (const sha of checkedOut) {
    if (!known.some((h) => h.startsWith(sha))) throw new GuardError("commit", `the build log checked out ${short(sha)}, not the head (${known.map(short).join(", ")}) — a cached source clone. ${STALE_HINT}`);
  }
  const push = deployment.cause_details?.git_push;
  if (push?.commit_sha) {
    const head = heads.get(`${push.github?.repo}@${push.github?.branch}`) ?? known[0];
    if (push.commit_sha !== head) throw new GuardError("commit", `the deployment cause says commit ${short(push.commit_sha)} was pushed, but the head is ${short(head)}. ${STALE_HINT}`);
  }
  return verified;
}
