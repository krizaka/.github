#!/usr/bin/env node
// The conformance matrix of the org (krizaka/.github#393): every rule of docs/standards/rules.json against every active repository.
//
//   node scripts/conformance.mjs                      the matrix (markdown) on stdout
//   node scripts/conformance.mjs --json out.json      also the cells as JSON
//   node scripts/conformance.mjs --repos a,b --rules x,y   a slice
//   node scripts/conformance.mjs --validate           only the registry (every rule has its check); no network
//   node scripts/conformance.mjs --fail               exit 1 while a cell is red
//
// Active = repos.json minus archived, `Archive` and `Paused` repositories, which are listed out of scope (never « exceptions »).
// Reads GitHub with GH_TOKEN / GITHUB_TOKEN (the app token for the private ones).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const HERE = new URL("../", import.meta.url);
export const CHECK_TYPES = ["workflow-calls", "workflow-matches", "workflow-forbids", "file-exists", "file-matches"];
export const FIX_TYPES = ["copy", "append-section", "settings-hook", "manual"];
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
    problems.push(...checkShape(rule));
  }
  return problems;
}

function checkShape({ id, check = {} }) {
  const needs = {
    "workflow-calls": () => Boolean(check.workflows?.length || check.byKind),
    "workflow-matches": () => Boolean(check.pattern),
    "workflow-forbids": () => Boolean(check.pattern),
    "file-exists": () => Boolean(check.paths?.length),
    "file-matches": () => Boolean(check.path && check.pattern),
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
export function snapshotOf(name, kind, paths, readFile) {
  const cache = new Map();
  const read = async (path) => {
    if (!paths.includes(path)) return null;
    if (!cache.has(path)) cache.set(path, await readFile(path));
    return cache.get(path);
  };
  const workflows = async () => {
    const texts = await Promise.all(paths.filter((p) => WORKFLOW_PATH.test(p)).map(read));
    return texts.filter(Boolean).join("\n");
  };
  return { name, kind, paths, read, workflows };
}

/** Does the rule concern this repository? */
export async function appliesTo(rule, snap, lists = {}) {
  const { kinds, notRepos = [], when = [] } = rule.applies ?? {};
  if (kinds && !kinds.includes(snap.kind)) return false;
  if (notRepos.includes(snap.name)) return false;
  for (const w of when) {
    if (!(await holds(w, snap, lists))) return false;
  }
  return true;
}

async function holds(w, snap, lists) {
  if (w.pathEndsWith) return snap.paths.some((p) => p === w.pathEndsWith || p.endsWith(`/${w.pathEndsWith}`));
  if (w.fileExists) return snap.paths.includes(w.fileExists);
  if (w.fileMatches) return new RegExp(w.fileMatches.pattern).test((await snap.read(w.fileMatches.path)) ?? "");
  if (w.inList) return (lists[w.inList] ?? []).includes(snap.name);
  return false;
}

const callsOf = (text) => new Set([...text.matchAll(CALL)].map((m) => m[1]));

/** @returns {Promise<{ ok: boolean, why: string }>} */
export async function runCheck(check, snap) {
  const text = async () => snap.workflows();
  switch (check.type) {
    case "workflow-calls": {
      const wanted = check.byKind ? (check.byKind[snap.kind] ?? []) : check.workflows;
      const calls = callsOf(await text());
      const ok = wanted.some((w) => calls.has(w));
      return { ok, why: ok ? "" : `calls none of ${wanted.join(", ")}` };
    }
    case "workflow-matches": {
      const ok = new RegExp(check.pattern).test(await text());
      return { ok, why: ok ? "" : `no workflow matches ${check.pattern}` };
    }
    case "workflow-forbids": {
      const found = new RegExp(check.pattern).exec(await text());
      return { ok: !found, why: found ? `a workflow has « ${found[0]} »` : "" };
    }
    case "file-exists": {
      const ok = check.paths.some((p) => snap.paths.includes(p));
      return { ok, why: ok ? "" : `no ${check.paths[0]}` };
    }
    case "file-matches": {
      const body = await snap.read(check.path);
      if (body === null) return { ok: false, why: `no ${check.path}` };
      const ok = new RegExp(check.pattern).test(body);
      return { ok, why: ok ? "" : `${check.path} lacks ${check.pattern}` };
    }
    default:
      return { ok: false, why: `unknown check ${check.type}` };
  }
}

/** The matrix: `cells[repo][rule]` = { status: "green" | "red" | "n/a", why }. */
export async function evaluate(rules, snapshots, lists = {}) {
  const cells = {};
  for (const snap of snapshots) {
    cells[snap.name] = {};
    for (const rule of rules) {
      if (!(await appliesTo(rule, snap, lists))) {
        cells[snap.name][rule.id] = { status: "n/a", why: "" };
        continue;
      }
      const { ok, why } = await runCheck(rule.check, snap);
      cells[snap.name][rule.id] = { status: ok ? "green" : "red", why };
    }
  }
  return cells;
}

/** Red/green counts per rule. */
export function summarise(rules, cells) {
  return rules.map((rule) => {
    const states = Object.values(cells).map((row) => row[rule.id]?.status);
    return { id: rule.id, red: states.filter((s) => s === "red").length, green: states.filter((s) => s === "green").length };
  });
}

/** The matrix as markdown: counts per rule, then the red cells per repository, then the repositories out of scope. */
export function render(rules, cells, summary, paused = []) {
  const lines = ["| rule | green | red |", "|---|---:|---:|"];
  for (const s of summary) lines.push(`| ${s.id} | ${s.green} | ${s.red} |`);
  const total = summary.reduce((acc, s) => ({ g: acc.g + s.green, r: acc.r + s.red }), { g: 0, r: 0 });
  lines.push(`| **all** | **${total.g}** | **${total.r}** |`, "", "| repo | red rules |", "|---|---|");
  for (const [repo, row] of Object.entries(cells)) {
    const red = Object.entries(row).filter(([, c]) => c.status === "red").map(([id]) => id);
    lines.push(`| ${repo} | ${red.length ? red.join(", ") : "all green"} |`);
  }
  if (paused.length) lines.push("", `Out of scope (paused or archived): ${paused.map((r) => r.name).join(", ")}.`);
  return lines.join("\n");
}

async function api(path, accept = "application/vnd.github+json") {
  const auth = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept, ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404 || res.status === 409) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return accept.includes("raw") ? res.text() : res.json();
}

/** The live snapshot of one repository (default branch). */
export async function liveSnapshot({ name, kind }, org = "krizaka") {
  const tree = await api(`/repos/${org}/${name}/git/trees/HEAD?recursive=1`);
  const paths = (tree?.tree ?? []).filter((e) => e.type === "blob").map((e) => e.path);
  const raw = (path) => api(`/repos/${org}/${name}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, "application/vnd.github.raw+json");
  return snapshotOf(name, kind, paths, raw);
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
  const only = flag(argv, "--repos")?.split(",");
  const onlyRules = flag(argv, "--rules")?.split(",");
  const picked = onlyRules ? rules.filter((r) => onlyRules.includes(r.id)) : rules;
  const targets = active.filter((r) => !only || only.includes(r.name));
  const snapshots = [];
  for (const r of targets) snapshots.push(await liveSnapshot(r)); // one at a time: dozens of parallel lookups exhaust the resolver
  const lists = { "orchestration/release-consumers.json": consumersList() };
  const cells = await evaluate(picked, snapshots, lists);
  const summary = summarise(picked, cells);
  console.log(render(picked, cells, summary, paused));
  const jsonOut = flag(argv, "--json");
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ summary, cells, outOfScope: paused.map((r) => r.name) }, null, 2));
  return argv.includes("--fail") && summary.some((s) => s.red > 0) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
