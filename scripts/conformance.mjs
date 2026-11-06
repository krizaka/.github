#!/usr/bin/env node
// The conformance matrix of the org (krizaka/.github#393): every rule of docs/standards/rules.json against every active repository.
//
//   node scripts/conformance.mjs                      the matrix (markdown) on stdout
//   node scripts/conformance.mjs --json out.json      also the cells as JSON
//   node scripts/conformance.mjs --repos a,b --rules x,y   a slice
//   node scripts/conformance.mjs --validate           only the registry (every rule has its check); no network
//   node scripts/conformance.mjs --repo-list           the active repositories, comma separated (scopes the workflow's token)
//   node scripts/conformance.mjs --fail               exit 1 while a cell of a security rule fails (rules review of 2026-11-05:
//                                                     the same-day rollout holds only for the rules marked `"security": true`)
//
// Deterministic (founder 2026-11-06, « la matrice doit le prouver d'une façon déterministe »): each repository is read at one pinned
// commit (the default branch's SHA, recorded in the output), every file a check reads is recorded with the SHA-256 of what it judged,
// a live setting (rulesets, npm) with its URL and the SHA-256 of the answer. A cell is `pass`, `fail`, `unknown` (a fetch error or
// nothing readable: never pass, never fail), `manual` (no deterministic check exists: never shown as pass) or `n/a`.
//
// Active = repos.json minus archived, `Archive` and `Paused` repositories, which are listed out of scope (never « exceptions »).
// Reads GitHub with GH_TOKEN / GITHUB_TOKEN (the app token for the private ones).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { problemsOf } from "./agents-md.mjs";
import { behind, latestOf, pinsOf, renderVersions, versionsVerdict } from "./conformance-versions.mjs";

const HERE = new URL("../", import.meta.url);
import { jobsWithoutTimeout, configWithoutTestTimeout, nodeTestWithoutTimeout } from "./check-timeouts.mjs";
const TEST_CONFIG = /(^|\/)((playwright|vitest|jest)\.config\.[cm]?[jt]s|junit-platform\.properties)$/;
export const CHECK_TYPES = ["path-matches", "lists-rule-ids", "manual", "workflow-calls", "workflow-matches", "workflow-forbids", "file-exists", "file-matches", "manifests-forbid", "no-mention", "published-no-mention", "all-of", "any-of", "agents-template", "required-check", "merged-result", "queue-reports", "required-profile", "time-limits", "versions-current"];
/** The states of a cell. `unknown` and `manual` are never counted as pass nor as fail. */
export const STATUSES = ["pass", "fail", "unknown", "manual", "n/a"];
/** A sort order that does not depend on the machine's locale (determinism). */
export function byCodePoint(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
export const sha256 = (text) => createHash("sha256").update(text ?? "").digest("hex");
export const FIX_TYPES = ["copy", "append-section", "settings-hook", "agents-template", "manual"];
const WORKFLOW_PATH = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const CALL = /uses:\s*krizaka\/(?:\.github|orazaka)\/\.github\/workflows\/([\w.-]+\.ya?ml)@/g;

const readJson = (path) => JSON.parse(readFileSync(new URL(path, HERE), "utf8"));
export const loadRules = () => readJson("docs/standards/rules.json").rules;

/** Problems of the registry itself: a rule must name an issue and carry a known check and fix. */
export function validateRules(rules) {
  const problems = [];
  const ids = new Set();
  for (const rule of rules) {
    const at = rule.id ?? "(no id)";
    if (!rule.id || ids.has(rule.id)) problems.push(`${at}: missing or duplicate id`);
    ids.add(rule.id);
    if (!rule.title) problems.push(`${at}: no title`);
    if (!/^krizaka\/[\w.-]+#\d+$/.test(rule.issue ?? "")) problems.push(`${at}: no issue (krizaka/<repo>#<n>)`);
    if (!CHECK_TYPES.includes(rule.check?.type)) problems.push(`${at}: no check (a rule without its check is refused)`);
    if (!FIX_TYPES.includes(rule.fix?.type)) problems.push(`${at}: no fix (use manual with a note)`);
    if (rule.security !== undefined && rule.security !== true) problems.push(`${at}: security is true or absent`);
    problems.push(...checkShape(rule));
    problems.push(...exemptionProblems(rule));
  }
  return problems;
}

/** A security rule is rolled out to every repository the same day (rules review of 2026-11-05); the others are reported only. */
export const isSecurity = (rule) => rule?.security === true;

/** The security rules with a red cell: what fails the daily run. */
export function failing(rules, summary) {
  const security = new Set(rules.filter(isSecurity).map((r) => r.id));
  return summary.filter((s) => s.fail > 0 && security.has(s.id)).map((s) => s.id);
}

/** A repository that truly cannot follow a rule is declared in `exempt` with its reason (at least 30 characters: a sentence a reviewer can judge). */
export const MIN_REASON = 30;
export function exemptionProblems({ id, exempt = {} }) {
  return Object.entries(exempt)
    .filter(([, reason]) => typeof reason !== "string" || reason.trim().length < MIN_REASON)
    .map(([repo]) => `${id}: the exemption of ${repo} needs a reason of at least ${MIN_REASON} characters`);
}

/** A composite check lists real sub-checks (themselves complete, composite or not). */
const composite = (check) =>
  Array.isArray(check.checks) &&
  check.checks.length > 0 &&
  check.checks.every((c) => CHECK_TYPES.includes(c.type) && (!["all-of", "any-of"].includes(c.type) || composite(c)));

function checkShape({ id, check = {} }) {
  const needs = {
    "workflow-calls": () => Boolean(check.workflows?.length || check.byKind),
    "path-matches": () => Boolean(check.pattern),
    "lists-rule-ids": () => Boolean(check.path),
    manual: () => Boolean(check.note),
    "workflow-matches": () => Boolean(check.pattern),
    "workflow-forbids": () => Boolean(check.pattern),
    "file-exists": () => Boolean(check.paths?.length),
    "file-matches": () => Boolean(check.path && check.pattern),
    "manifests-forbid": () => Boolean(check.pattern),
    "no-mention": () => Boolean(patternOf(check)),
    "published-no-mention": () => Boolean(patternOf(check)),
    "all-of": () => composite(check),
    "any-of": () => composite(check),
    "required-check": () => Boolean(check.context),
    "merged-result": () => true,
    "queue-reports": () => true,
    "time-limits": () => true,
    "versions-current": () => !check.ecosystems || check.ecosystems.every((e) => ["npm", "maven"].includes(e)),
    "required-profile": () => Boolean(check.byKind && Object.values(check.byKind).every((gs) => Array.isArray(gs) && gs.every((g) => g.name && g.pattern))),
  };
  return needs[check.type]?.() === false ? [`${id}: the ${check.type} check is incomplete`] : [];
}

/** Active repositories and the ones out of scope, from repos.json. */
export function scopeOf(repositories) {
  const outOfScope = (r) => r.archived === true || /^(Archive|Paused)\b/.test(r.status ?? "");
  return {
    active: repositories.filter((r) => !outOfScope(r)),
    paused: repositories.filter((r) => outOfScope(r)),
  };
}

/** A repository as the checks see it: its tracked paths and a reader of one file (null when absent). */
export function snapshotOf(name, kind, paths, readFile, { commit = null, scan = null, published = null, requiredChecks = null, mergeGuard = null, latest = null, now = Date.now() } = {}) {
  const cache = new Map();
  const evidence = [];
  const read = async (path) => {
    if (!paths.includes(path)) return null;
    if (!cache.has(path)) cache.set(path, await readFile(path));
    const body = cache.get(path);
    evidence.push({ path, sha256: body === null ? null : sha256(body) });
    return body;
  };
  const workflows = async () => {
    const texts = await Promise.all(paths.filter((p) => WORKFLOW_PATH.test(p)).map(read));
    return texts.filter(Boolean).join("\n");
  };
  return { name, kind, commit, paths, read, workflows, scan, published, requiredChecks, mergeGuard, latest, now, evidence };
}

/** Does the rule concern this repository? */
export async function appliesTo(rule, snap, lists = {}) {
  const { kinds, notRepos = [], onlyRepos, when = [] } = rule.applies ?? {};
  if (kinds && !kinds.includes(snap.kind)) return false;
  if (onlyRepos && !onlyRepos.includes(snap.name)) return false;
  if (notRepos.includes(snap.name)) return false;
  for (const w of when) {
    if (!(await holds(w, snap, lists))) return false;
  }
  return true;
}

async function holds(w, snap, lists) {
  if (w.pathMatches) return snap.paths.some((p) => new RegExp(w.pathMatches).test(p));
  if (w.pathEndsWith) return snap.paths.some((p) => p === w.pathEndsWith || p.endsWith(`/${w.pathEndsWith}`));
  if (w.fileExists) return snap.paths.includes(w.fileExists);
  if (w.fileMatches) return new RegExp(w.fileMatches.pattern).test((await snap.read(w.fileMatches.path)) ?? "");
  if (w.inList) return (lists[w.inList] ?? []).includes(snap.name);
  return false;
}

const MANIFEST = /(^|\/)(package\.json|pnpm-workspace\.yaml|\.gitmodules|pom\.xml|build\.gradle(\.kts)?)$/;

const callsOf = (text) => new Set([...text.matchAll(CALL)].map((m) => m[1]));

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
    for (const p of snap.paths.filter((x) => MANIFEST.test(x))) {
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
      } else if (TEST_CONFIG.test(p)) {
        const why = configWithoutTestTimeout(p, (await snap.read(p)) ?? "");
        if (why) return { ok: false, why: `${p}: ${why}` };
      } else if (/(^|\/)package\.json$/.test(p) && !/node_modules/.test(p) && nodeTestWithoutTimeout((await snap.read(p)) ?? "")) {
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

/** A check's answer as a cell state: true pass, false fail, null unknown (manual when the check is `manual`). */
export function statusOf({ ok, manual }) {
  if (manual) return "manual";
  if (ok === true) return "pass";
  if (ok === false) return "fail";
  return "unknown";
}

/** Evidence, sorted and without duplicates, so the same content gives the same text. */
function evidenceOf(result, reads) {
  const seen = new Map();
  // A check that names what proved it keeps only that (with its hash); otherwise every read is the evidence.
  const named = result.evidence?.length ? new Set(result.evidence.map((e) => e.path ?? e.url)) : null;
  for (const e of [...(result.evidence ?? []), ...reads.filter((r) => !named || named.has(r.path ?? r.url))]) {
    const key = e.path ?? e.url;
    seen.set(key, { ...seen.get(key), ...e });
  }
  return [...seen.values()].sort((a, b) => byCodePoint(String(a.path ?? a.url), String(b.path ?? b.url)));
}

/**
 * The matrix: `cells[repo][rule]` = { status: "pass" | "fail" | "unknown" | "manual" | "n/a", why, commit, check, evidence }.
 * A check that throws (a fetch error) is `unknown` with the reason, never pass nor fail.
 */
export async function evaluate(rules, snapshots, lists = {}) {
  const cells = {};
  const ruleIds = rules.map((r) => r.id);
  for (const snap of snapshots) {
    cells[snap.name] = {};
    snap.ruleIds = ruleIds;
    for (const rule of rules) {
      cells[snap.name][rule.id] = await cellOf(rule, snap, lists);
    }
  }
  return cells;
}

async function cellOf(rule, snap, lists) {
  const base = { commit: snap.commit ?? null, check: rule.check.type, evidence: [] };
  if (snap.error) return { status: "unknown", why: snap.error, ...base };
  if (!(await appliesTo(rule, snap, lists))) return { status: "n/a", why: "", ...base };
  const reason = rule.exempt?.[snap.name];
  if (reason) return { status: "n/a", why: `exempt: ${reason}`, ...base };
  const reads = snap.evidence ?? [];
  reads.length = 0;
  let result;
  try {
    result = await runCheck(rule.check, snap);
  } catch (error) {
    result = { ok: null, why: `could not read: ${String(error?.message ?? error).replace(/\s+/g, " ")}` };
  }
  return { status: statusOf(result), why: result.why ?? "", ...base, evidence: evidenceOf(result, reads) };
}

/** Counts per rule: pass, fail, unknown, manual. */
export function summarise(rules, cells) {
  return rules.map((rule) => {
    const states = Object.values(cells).map((row) => row[rule.id]?.status);
    const count = (st) => states.filter((s) => s === st).length;
    return { id: rule.id, pass: count("pass"), fail: count("fail"), unknown: count("unknown"), manual: count("manual") };
  });
}

/** Where a rule's text lives: rules.json at the registry's commit (or main), scrolled to its id. */
export function ruleLink(id, commit = "main") {
  const anchor = encodeURIComponent(`"id": "${id}"`);
  return `https://github.com/krizaka/.github/blob/${commit}/docs/standards/rules.json#:~:text=${anchor}`;
}

/**
 * The machine-readable matrix (what the cockpit, session-start and the checkpoint read): pure, so the same cells give the same text.
 * `results` is one line per cell: rule x repo x commit x check x status x evidence x run date x link to the rule.
 */
export function reportOf({ rules, cells, summary, versions = {}, paused = [], generatedAt, runUrl = null, rulesCommit = null }) {
  const repos = Object.keys(cells).sort(byCodePoint);
  const link = (id) => ruleLink(id, rulesCommit ?? "main");
  const results = repos.flatMap((repo) =>
    rules
      .filter((rule) => cells[repo][rule.id])
      .map((rule) => {
        const c = cells[repo][rule.id];
        return { rule: rule.id, repo, commit: c.commit, check: c.check, status: c.status, why: c.why, evidence: c.evidence, runDate: generatedAt, link: link(rule.id) };
      }),
  );
  return {
    schema: 2,
    generatedAt,
    runUrl,
    rulesCommit,
    statuses: STATUSES,
    rules: rules.map((r) => ({ id: r.id, title: r.title, issue: r.issue, security: r.security === true, check: r.check.type, link: link(r.id) })),
    repos: Object.fromEntries(repos.map((repo) => [repo, { commit: Object.values(cells[repo])[0]?.commit ?? null }])),
    summary,
    cells: Object.fromEntries(repos.map((repo) => [repo, cells[repo]])),
    results,
    versions,
    outOfScope: paused.map((r) => r.name),
  };
}

/** The matrix as markdown: counts per rule, then the red cells per repository, then the repositories out of scope. */
export function render(rules, cells, summary, paused = []) {
  const lines = ["| rule | pass | fail | unknown | manual |", "|---|---:|---:|---:|---:|"];
  for (const s of summary) lines.push(`| ${s.id} | ${s.pass} | ${s.fail} | ${s.unknown} | ${s.manual} |`);
  const total = summary.reduce((acc, s) => ({ p: acc.p + s.pass, f: acc.f + s.fail, u: acc.u + s.unknown, m: acc.m + s.manual }), { p: 0, f: 0, u: 0, m: 0 });
  lines.push(`| **all** | **${total.p}** | **${total.f}** | **${total.u}** | **${total.m}** |`, "", "| repo | commit | failing rules | unknown |", "|---|---|---|---|");
  for (const repo of Object.keys(cells).sort(byCodePoint)) {
    const row = cells[repo];
    const of = (st) => Object.entries(row).filter(([, c]) => c.status === st).map(([id]) => id);
    const commit = Object.values(row)[0]?.commit?.slice(0, 7) ?? "?";
    lines.push(`| ${repo} | ${commit} | ${of("fail").join(", ") || "none"} | ${of("unknown").join(", ") || "none"} |`);
  }
  if (paused.length) lines.push("", `Out of scope (paused or archived): ${paused.map((r) => r.name).join(", ")}.`);
  const security = rules.filter(isSecurity).map((r) => r.id);
  lines.push("", `Same-day rollout (security rules): ${security.join(", ") || "none"}. The other rules are reported here, never fanned out.`);
  return lines.join("\n");
}

async function api(path, accept = "application/vnd.github+json", record = null) {
  const auth = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept, ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404 || res.status === 409) {
    record?.({ url: `https://api.github.com${path}`, http: res.status, sha256: null });
    return null;
  }
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const text = await res.text();
  record?.({ url: `https://api.github.com${path}`, http: res.status, sha256: sha256(text) });
  return accept.includes("raw") ? text : JSON.parse(text);
}

/** Paths of the text files of a gzipped tarball whose content matches `re` (GitHub's tarball: one top folder, ustar headers). */
export function tarballMatches(gz, re) {
  const tar = gunzipSync(gz);
  const hits = [];
  let off = 0;
  while (off + 512 <= tar.length) {
    const head = tar.subarray(off, off + 512);
    if (head[0] === 0) break;
    const name = head.subarray(0, 100).toString("utf8").split("\0", 1)[0];
    const prefix = head.subarray(345, 500).toString("utf8").split("\0", 1)[0];
    const size = parseInt(head.subarray(124, 136).toString("utf8").split("\0", 1)[0].trim() || "0", 8);
    const type = String.fromCharCode(head[156] || 48);
    const body = tar.subarray(off + 512, off + 512 + size);
    if (type === "0" && size < 2_000_000 && !body.includes(0)) {
      const full = (prefix ? `${prefix}/${name}` : name).split("/").slice(1).join("/");
      if (full && re.test(body.toString("utf8"))) hits.push(full);
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return hits;
}

/** The live snapshot of one repository (default branch). */
export async function liveSnapshot({ name, kind }, org = "krizaka") {
  let commit = null;
  let paths;
  try {
    // One commit for the whole run: the tree, the files and the tarball are all read at this SHA.
    commit = (await api(`/repos/${org}/${name}/commits/HEAD`))?.sha ?? null;
    if (!commit) throw new Error("no default branch commit");
    const tree = await api(`/repos/${org}/${name}/git/trees/${commit}?recursive=1`);
    paths = (tree?.tree ?? []).filter((e) => e.type === "blob").map((e) => e.path).sort(byCodePoint);
  } catch (error) {
    return { ...snapshotOf(name, kind, [], async () => null, { commit }), error: `could not read the repository: ${error.message}` };
  }
  let snap;
  const record = (e) => snap?.evidence.push(e);
  const raw = (path) => api(`/repos/${org}/${name}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${commit}`, "application/vnd.github.raw+json");
  const scan = async (re) => {
    record({ url: `https://api.github.com/repos/${org}/${name}/tarball/${commit}` });
    const res = await fetch(`https://api.github.com/repos/${org}/${name}/tarball/${commit}`, {
      headers: { accept: "application/vnd.github+json", ...(process.env.GH_TOKEN || process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`${name} tarball: ${res.status}`);
    return tarballMatches(Buffer.from(await res.arrayBuffer()), re);
  };
  const published = async (re) => {
    const manifests = paths.filter((p) => /(^|\/)package\.json$/.test(p) && !/node_modules/.test(p));
    const hits = [];
    for (const m of manifests) {
      let pkg;
      try {
        pkg = JSON.parse((await raw(m)) ?? "{}");
      } catch {
        continue;
      }
      if (!pkg.name || pkg.private) continue;
      const meta = await fetch(`https://registry.npmjs.org/${pkg.name.replaceAll("/", "%2F")}/latest`, { signal: AbortSignal.timeout(30000) });
      if (!meta.ok) continue;
      const { version, dist } = await meta.json();
      record({ url: dist.tarball, integrity: dist.integrity ?? null });
      const tgz = await fetch(dist.tarball, { signal: AbortSignal.timeout(120000) });
      if (!tgz.ok) throw new Error(`${pkg.name} tarball: ${tgz.status}`);
      hits.push(...tarballMatches(Buffer.from(await tgz.arrayBuffer()), re).map((f) => `${pkg.name}@${version}:${f}`));
    }
    return hits;
  };
  // Required status checks on main: the rulesets that apply to the branch, then classic branch protection.
  const requiredChecks = async () => {
    const contexts = new Set();
    const rules = (await api(`/repos/${org}/${name}/rules/branches/main`, undefined, record)) ?? [];
    for (const r of rules) if (r.type === "required_status_checks") for (const c of r.parameters?.required_status_checks ?? []) contexts.add(c.context);
    const classic = await api(`/repos/${org}/${name}/branches/main/protection/required_status_checks`, undefined, record);
    for (const c of classic?.contexts ?? []) contexts.add(c);
    for (const c of classic?.checks ?? []) contexts.add(c.context);
    return [...contexts];
  };
  const mergeGuard = async () => {
    const rules = (await api(`/repos/${org}/${name}/rules/branches/main`, undefined, record)) ?? [];
    const classic = await api(`/repos/${org}/${name}/branches/main/protection/required_status_checks`, undefined, record);
    return { mergeQueue: rules.some((r) => r.type === "merge_queue"), strict: classic?.strict === true || rules.some((r) => r.type === "required_status_checks" && r.parameters?.strict_required_status_checks_policy === true) };
  };
  snap = snapshotOf(name, kind, paths, raw, { commit, scan, published, requiredChecks, mergeGuard, latest: (pin) => latestOf(pin, api) });
  return snap;
}

const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

/** The repositories that learn of a release (krizaka/.github#388); none while that list is not merged. */
function consumersList() {
  try {
    return Object.keys(readJson("orchestration/release-consumers.json").repos);
  } catch {
    return [];
  }
}

export async function main(argv) {
  const rules = loadRules();
  const problems = validateRules(rules);
  if (problems.length) {
    console.error(problems.join("\n"));
    return 1;
  }
  if (argv.includes("--validate")) {
    console.log(`${rules.length} rules, each with its check and its fix`);
    return 0;
  }
  const { active, paused } = scopeOf(readJson("repos.json").repositories);
  if (argv.includes("--repo-list")) {
    console.log(active.map((r) => r.name).join(","));
    return 0;
  }
  const only = flag(argv, "--repos")?.split(",");
  const onlyRules = flag(argv, "--rules")?.split(",");
  const picked = onlyRules ? rules.filter((r) => onlyRules.includes(r.id)) : rules;
  const targets = active.filter((r) => !only || only.includes(r.name));
  const snapshots = [];
  for (const r of targets) snapshots.push(await liveSnapshot(r)); // one at a time: dozens of parallel lookups exhaust the resolver
  const lists = { "orchestration/release-consumers.json": consumersList() };
  const cells = await evaluate(picked, snapshots, lists);
  const summary = summarise(picked, cells);
  const versions = await versionsReport(snapshots);
  console.log(`${render(picked, cells, summary, paused)}\n\n### Family versions\n\n${renderVersions(versions)}`);
  const jsonOut = flag(argv, "--json");
  if (jsonOut) {
    const report = reportOf({ rules: picked, cells, summary, versions, paused, generatedAt: new Date().toISOString(), runUrl: process.env.RUN_URL || null, rulesCommit: process.env.GITHUB_SHA || null });
    writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  }
  return argv.includes("--fail") && failing(picked, summary).length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
