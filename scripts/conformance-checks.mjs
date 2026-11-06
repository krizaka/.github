// WHY  Each type of check of the conformance matrix (a file exists, a workflow calls, a setting holds, a pin is current…) is one small handler; they live together, apart from the registry that names them and the live reading that feeds them.
// WHAT CHECKS (one handler per check type), `runCheck`, and the verdicts they use (queue reports, merged result, required profile, register, versions).
// HOW  Imported by scripts/conformance-registry.mjs and scripts/conformance.mjs (which re-export it); nothing to run. Tests: tests/conformance.test.mjs.
// OWNER krizaka/.github (lane platform), ADR-026 phase D. Entry point: scripts/conformance.mjs.

import { problemsOf } from "./agents-md.mjs";
import { jobsWithoutTimeout, configWithoutTestTimeout, nodeTestWithoutTimeout } from "./check-timeouts.mjs";
import { behind, pinsOf, versionsVerdict } from "./conformance-versions.mjs";
import { candidateOf, isPublicSource, publicEmailHits } from "./public-email.mjs";
import { byCodePoint, isPackageManifest, isTestConfig, WORKFLOW_PATH } from "./conformance-basics.mjs";

/** The files that can name a dependency: npm, pnpm workspaces, git submodules, Maven, Gradle (by file name, in any folder). */
export const MANIFEST_FILES = ["package.json", "pnpm-workspace.yaml", ".gitmodules", "pom.xml", "build.gradle", "build.gradle.kts"];
export const isManifest = (path) => MANIFEST_FILES.some((name) => path === name || path.endsWith(`/${name}`));

/** The org repositories whose reusable workflows count as the org's own CI (`uses: krizaka/<repo>/.github/workflows/x.yml@…`). */
export const REUSABLE_WORKFLOW_REPOS = [".github", "sovkora", "orazaka"];
/** `uses: krizaka/<repo>/.github/workflows/<file>.yml@`: a call to a reusable workflow of the org. */
const WORKFLOW_USE = /uses:\s*krizaka\/([\w.-]+)\/\.github\/workflows\/([\w.-]+\.ya?ml)@/g;
const callsOf = (text) =>
  new Set([...text.matchAll(WORKFLOW_USE)].filter((m) => REUSABLE_WORKFLOW_REPOS.includes(m[1])).map((m) => m[2]));

const verdict = (ok, why) => ({ ok, why: ok ? "" : why });
/** A check that has nothing to read (offline, no token): neither pass nor fail. */
const unread = (what) => ({ ok: null, why: `not read: ${what}` });
const lineOf = (body, re) => {
  const m = re.exec(body);
  return m ? body.slice(0, m.index).split("\n").length : null;
};

/** The ids of the org rules a register lists: the first cell (`id` in backticks) of each table row between the markers. */
export const REGISTER_START = "<!-- org-rules:start -->";
export const REGISTER_END = "<!-- org-rules:end -->";
export function registerIds(text) {
  const from = text.indexOf(REGISTER_START);
  const to = text.indexOf(REGISTER_END);
  if (from < 0 || to < from) return null;
  return text
    .slice(from, to)
    .split("\n")
    .map((l) => /^\|\s*`([\w.-]+)`\s*\|/.exec(l)?.[1])
    .filter(Boolean);
}
export function registerVerdict(text, ids) {
  const listed = registerIds(text ?? "");
  if (!listed) return { ok: false, why: `no ${REGISTER_START} … ${REGISTER_END} table` };
  const missing = ids.filter((id) => !listed.includes(id));
  const extra = listed.filter((id) => !ids.includes(id));
  const twice = listed.filter((id, i) => listed.indexOf(id) !== i);
  const problems = [missing.length && `missing: ${missing.join(", ")}`, extra.length && `not in rules.json: ${extra.join(", ")}`, twice.length && `twice: ${twice.join(", ")}`].filter(Boolean);
  return verdict(problems.length === 0, problems.join("; "));
}

const SONAR_APP_CHECK = /^SonarCloud Code Analysis$/;
const triggersOf = (text) => (text.split(/^jobs:/m)[0].match(/^ {2}([a-z_]+):/gm) ?? []).map((t) => t.trim().replace(":", ""));
const nameOf = (text) => {
  const raw = /^name:[ \t]*["']?([^"'\n#]*)/m.exec(text)?.[1];
  return raw?.trim().toLowerCase() || undefined;
};
const jobKeys = (text) => (text.split(/^jobs:/m)[1]?.match(/^ {2}([\w-]+):/gm) ?? []).map((k) => k.trim().replace(":", "").toLowerCase());

/** Which workflow files produce a required check, and do they run in the queue? */
export function queueReportsVerdict(required, workflows) {
  const problems = [];
  const heads = required.filter((c) => !SONAR_APP_CHECK.test(c)).map((c) => c.split(" / ")[0].trim().toLowerCase());
  const scans = workflows.filter((w) => /sonar-scan@|^[ \t]+sonar:[ \t]*true/m.test(w.text));
  for (const w of workflows) {
    const triggers = triggersOf(w.text);
    if (!triggers.includes("pull_request") || triggers.includes("merge_group")) continue;
    const produces = heads.includes(nameOf(w.text)) || jobKeys(w.text).some((k) => heads.includes(k));
    if (produces || scans.includes(w)) problems.push(`${w.path} produces a required check but has no merge_group trigger`);
  }
  if (required.some((c) => SONAR_APP_CHECK.test(c)) && scans.length === 0) problems.push("« SonarCloud Code Analysis » is required but no CI scan job (sonar-scan) exists: the app does not analyse a merge queue SHA");
  return verdict(problems.length === 0, problems.join("; "));
}

/** One handler per check type: each returns { ok, why }. */
const CHECKS = {
  // A tracked path matches `pattern` (the per-repo test a rule requires, named by convention); with `contains`, one of them also holds
  // that text. Paths are sorted, so the first match is always the same one.
  "path-matches": async (check, snap) => {
    const re = new RegExp(check.pattern);
    const hits = snap.paths.filter((p) => re.test(p)).sort(byCodePoint);
    if (hits.length === 0) return { ok: false, why: `no tracked file matches ${check.pattern}` };
    if (!check.contains) return { ok: true, why: "", evidence: [{ path: hits[0] }] };
    const body = new RegExp(check.contains);
    for (const p of hits) {
      const text = (await snap.read(p)) ?? "";
      if (body.test(text)) return { ok: true, why: "", evidence: [{ path: p, line: lineOf(text, body) }] };
    }
    return { ok: false, why: `${hits[0]} (and ${hits.length - 1} more) lack ${check.contains}` };
  },
  // The rules register (krizaka-agents docs/rules-register.md) names exactly the rules of this registry: none missing, none extra.
  "lists-rule-ids": async (check, snap) => {
    const text = await snap.read(check.path);
    if (text === null) return { ok: false, why: `no ${check.path}` };
    return registerVerdict(text, snap.ruleIds ?? []);
  },
  // No deterministic check exists yet: the cell says so and is never shown as pass.
  manual: async (check) => ({ ok: null, manual: true, why: check.note }),
  "workflow-calls": async (check, snap) => {
    const wanted = check.byKind ? (check.byKind[snap.kind] ?? []) : check.workflows;
    const calls = callsOf(await snap.workflows());
    return verdict(wanted.some((w) => calls.has(w)), `calls none of ${wanted.join(", ")}`);
  },
  "workflow-matches": async (check, snap) =>
    verdict(new RegExp(check.pattern).test(await snap.workflows()), `no workflow matches ${check.pattern}`),
  "workflow-forbids": async (check, snap) => {
    const found = new RegExp(check.pattern).exec(await snap.workflows());
    return { ok: !found, why: found ? `a workflow has « ${found[0]} »` : "" };
  },
  "file-exists": async (check, snap) =>
    verdict(check.paths.some((p) => snap.paths.includes(p)), `no ${check.paths[0]}`),
  "file-matches": async (check, snap) => {
    const body = await snap.read(check.path);
    if (body === null) return { ok: false, why: `no ${check.path}` };
    const re = new RegExp(check.pattern);
    return { ...verdict(re.test(body), `${check.path} lacks ${check.pattern}`), evidence: [{ path: check.path, line: lineOf(body, re) }] };
  },
  // The manifests that can name a dependency: npm, pnpm workspaces, git submodules, Maven, Gradle.
  "manifests-forbid": async (check, snap) => {
    const re = new RegExp(check.pattern);
    for (const p of snap.paths.filter(isManifest)) {
      const found = re.exec((await snap.read(p)) ?? "");
      if (found) return { ok: false, why: `${p} names « ${found[0]} »` };
    }
    return { ok: true, why: "" };
  },
  // Several checks, all of which must hold (a rule made of a config file, a script and a CI step): the first failure is the reason.
  "all-of": async (check, snap) => {
    for (const sub of check.checks) {
      const result = await runCheck(sub, snap);
      if (!result.ok) return result;
    }
    return { ok: true, why: "" };
  },
  // Several checks, one of which must hold (the same fact done in a workflow input or in a package script).
  "any-of": async (check, snap) => {
    const results = [];
    for (const sub of check.checks) {
      const result = await runCheck(sub, snap);
      if (result.ok) return result;
      results.push(result);
    }
    // One sub-check could not be read: the cell cannot be called a failure.
    const unreadable = results.some((r) => r.ok !== false);
    return { ok: unreadable ? null : false, why: results.map((r) => r.why).join("; or ") };
  },
  // AGENTS.md rendered from docs/standards/agents-template.md: the marker, the headings, at most 80 lines, the skill linked, relative links resolve.
  "agents-template": async (_check, snap) => {
    const problems = problemsOf(await snap.read("AGENTS.md"), snap.paths);
    return verdict(problems.length === 0, problems.join("; "));
  },
  // The check is REQUIRED on main (ruleset or branch protection). `requiredChecks` is absent offline: nothing to prove.
  "required-check": async (check, snap) => {
    if (!snap.requiredChecks) return unread("the required checks of main");
    const required = await snap.requiredChecks();
    return verdict(required.includes(check.context), `« ${check.context} » is not a required check on main`);
  },
  // Every required check reports in the merge queue (krizaka-internal#2000): the workflow that produces a required check triggers on
  // `merge_group`, and « SonarCloud Code Analysis » (posted by the SonarCloud app, which never analyses a queue SHA) has a CI scan job.
  // `requiredChecks` is absent offline: nothing to prove.
  "queue-reports": async (_check, snap) => {
    if (!snap.requiredChecks) return unread("the required checks of main");
    return queueReportsVerdict(await snap.requiredChecks(), await Promise.all(snap.paths.filter((p) => WORKFLOW_PATH.test(p)).map(async (p) => ({ path: p, text: (await snap.read(p)) ?? "" }))));
  },
  // Time limits everywhere (krizaka-internal#2007): every workflow job has `timeout-minutes` (a job that only calls a reusable workflow is exempt),
  // every test config has a per-test timeout, `node --test` scripts carry --test-timeout. A longer value is fine; none is not.
  "time-limits": async (_check, snap) => {
    for (const p of snap.paths) {
      if (WORKFLOW_PATH.test(p)) {
        const missing = jobsWithoutTimeout((await snap.read(p)) ?? "");
        if (missing.length) return { ok: false, why: `${p}: job \`${missing[0].job}\` has no timeout-minutes` };
      } else if (isTestConfig(p)) {
        const why = configWithoutTestTimeout(p, (await snap.read(p)) ?? "");
        if (why) return { ok: false, why: `${p}: ${why}` };
      } else if (isPackageManifest(p) && nodeTestWithoutTimeout((await snap.read(p)) ?? "")) {
        return { ok: false, why: `${p}: \`node --test\` without --test-timeout` };
      }
    }
    return { ok: true, why: "" };
  },
  // The merged result is tested (krizaka-internal#2000): a merge queue, or branch protection that requires the branch up to date (`strict`).
  // `mergeGuard` is absent offline: nothing to prove.
  "merged-result": async (_check, snap) => {
    if (!snap.mergeGuard) return unread("the merge guard of main");
    return mergedResultVerdict(await snap.mergeGuard());
  },
  // The required checks on main match the repository profile (apps: CI gate, Sonar, security scan, + journeys / visual where the repo has them;
  // libraries: CI gate, Sonar, security). Each group is a regex over the required contexts; `when` (a workflow it calls) scopes a group to repos that have the thing.
  "required-profile": async (check, snap) => {
    if (!snap.requiredChecks) return unread("the required checks of main");
    const groups = check.byKind[snap.kind] ?? [];
    const required = await snap.requiredChecks();
    const text = await snap.workflows();
    return profileVerdict(groups, required, callsOf(text), snap.name);
  },
  "no-mention": async (check, snap) => {
    // `allow`: path prefixes whose text is history (a released chapter, a changelog). `scan` is absent offline: nothing to prove.
    if (!snap.scan) return unread("the repository's files");
    const allowed = [...(check.allow ?? []), ...(check.allowIn?.[snap.name] ?? [])];
    const hits = (await snap.scan(new RegExp(patternOf(check), "i"))).filter((p) => !allowed.some((a) => p === a || p.startsWith(a) || p.endsWith(`/${a}`)));
    return verdict(hits.length === 0, `${hits.length} file(s) name a departed product, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // No Krizaka address on a public page (krizaka-internal#2764): the scan finds the files naming one, the public sources among them are
  // read and judged line by line (scripts/public-email.mjs); the privacy officer and a customer's own data are the written exceptions.
  "no-public-email": async (check, snap) => {
    if (!snap.scan) return unread("the repository's files");
    const files = (await snap.scan(candidateOf(check))).filter((p) => isPublicSource(p, check));
    const hits = [];
    for (const path of files) {
      for (const hit of publicEmailHits(path, (await snap.read(path)) ?? "", check)) hits.push(`${path}:${hit.line} ${hit.address}`);
    }
    return verdict(hits.length === 0, `${hits.length} Krizaka address(es) on a public page, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // What the repository PUBLISHES: the latest npm tarball of each of its public packages (built CSS/JS included), not its sources.
  // A rule change reached the repository (krizaka-internal#879): no family pin older than a version out for `graceDays`.
  // `latest` is absent offline: nothing to prove.
  "versions-current": async (check, snap) => {
    if (!snap.latest) return unread("the published versions");
    return versionsVerdict(await lateOf(snap, check));
  },
  // `published` is absent offline: nothing to prove. `allow`: files that are history inside a package (its CHANGELOG).
  "published-no-mention": async (check, snap) => {
    if (!snap.published) return unread("the published packages");
    const allowed = check.allow ?? [];
    const hits = (await snap.published(new RegExp(patternOf(check), "i"))).filter((h) => !allowed.some((a) => h.endsWith(`:${a}`) || h.includes(`:${a}`)));
    return verdict(hits.length === 0, `${hits.length} published file(s) name a departed product, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
};

/** A check's pattern: `pattern`, or `patternBase64` when the words it looks for must not be spelled in the registry itself
    (the names of the products that left the org, krizaka/.github#413). */
/** The family pins of a snapshot that are behind what is published. */
export async function lateOf(snap, { ecosystems, graceDays = 7 } = {}) {
  const pins = await pinsOf(snap, ecosystems);
  const latest = {};
  for (const pin of pins) latest[`${pin.ecosystem}:${pin.name}`] = await snap.latest(pin);
  return behind(pins, latest, { now: snap.now, graceDays });
}

/** Per repository: what it pins and what is behind (the versions section of the matrix). */
export async function versionsReport(snapshots) {
  const out = {};
  for (const snap of snapshots) {
    if (!snap.latest) continue;
    out[snap.name] = { pins: await pinsOf(snap), behind: await lateOf(snap) };
  }
  return out;
}

export function patternOf(check) {
  return check.pattern ?? (check.patternBase64 ? Buffer.from(check.patternBase64, "base64").toString("utf8") : undefined);
}

/** `guard` = { mergeQueue, strict } as read from the rulesets and the branch protection of main. */
export function mergedResultVerdict({ mergeQueue, strict }) {
  return verdict(mergeQueue || strict, "main neither has a merge queue nor requires branches to be up to date (strict): a PR can land untested against the merged result");
}

/** The groups of the profile that no required context satisfies; a group with `when` only counts when the repository calls that workflow. */
export function profileVerdict(groups, required, calls, repo = "") {
  const missing = groups
    .filter((g) => !g.when || calls.has(g.when))
    .filter((g) => !g.skipRepos?.includes(repo)) // a private repository cannot have SonarCloud: skipRepos names it, skipWhy says why
    .filter((g) => !required.some((c) => new RegExp(g.pattern).test(c)))
    .map((g) => g.name);
  return verdict(missing.length === 0, `required checks on main lack: ${missing.join(", ")}`);
}

/** @returns {Promise<{ ok: boolean, why: string }>} */
export async function runCheck(check, snap) {
  const handler = CHECKS[check.type];
  return handler ? handler(check, snap) : { ok: false, why: `unknown check ${check.type}` };
}

