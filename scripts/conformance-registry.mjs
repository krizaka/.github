// WHY  The registry of rules (docs/standards/rules.json), the scope (which repositories are active), the snapshot a check reads and which rules concern which repository are about WHAT is judged, not how.
// WHAT `loadRules`, `validateRules`, `failing`, `exemptionProblems`, `scopeOf`, `snapshotOf`, `appliesTo`.
// HOW  Imported by scripts/conformance.mjs (which re-exports it); `node scripts/conformance.mjs --validate` runs the registry check. Tests: tests/conformance.test.mjs.
// OWNER krizaka/.github (lane platform), ADR-026 phase D. Entry point: scripts/conformance.mjs.

import { readFileSync } from "node:fs";
import { patternOf } from "./conformance-checks.mjs";
import { byCodePoint, CHECK_TYPES, FIX_TYPES, sha256, WORKFLOW_PATH } from "./conformance-basics.mjs";

export const HERE = new URL("../", import.meta.url);
export const readJson = (path) => JSON.parse(readFileSync(new URL(path, HERE), "utf8"));
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
    "path-forbids": () => Boolean(check.pattern),
    "lists-rule-ids": () => Boolean(check.path),
    manual: () => Boolean(check.note),
    "workflow-matches": () => Boolean(check.pattern),
    "workflow-forbids": () => Boolean(check.pattern),
    "file-exists": () => Boolean(check.paths?.length),
    "file-matches": () => Boolean(check.path && check.pattern),
    "manifests-forbid": () => Boolean(check.pattern),
    "no-mention": () => Boolean(patternOf(check)),
    "published-no-mention": () => Boolean(patternOf(check)),
    "no-public-email": () => ["domains", "extensions", "publicSegments", "skipSegments", "skipPaths", "publicFiles", "privacyPaths", "customerData"].every((k) => Array.isArray(check[k])) && check.domains.length > 0,
    "all-of": () => composite(check),
    "any-of": () => composite(check),
    "required-check": () => Boolean(check.context),
    "merged-result": () => true,
    "queue-reports": () => true,
    "time-limits": () => true,
    "format-declared": () => true,
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

/** The listed repositories (plus the extra names the token needs) that the org does not have: what makes the token request answer 422. */
export function missingFromOrg(listed, orgNames) {
  const known = new Set(orgNames);
  return [...new Set(listed)].filter((name) => name && !known.has(name)).sort(byCodePoint);
}

/** The line that names each missing repository, or null when all exist. */
export function missingMessage(missing) {
  return missing.length
    ? `Not in the org krizaka (or not visible to the app): ${missing.join(", ")}. Mark them Archive in repos.json (or fix the name) before the token is minted.`
    : null;
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

