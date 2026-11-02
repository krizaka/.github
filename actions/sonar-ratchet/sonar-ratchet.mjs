#!/usr/bin/env node
// SonarCloud overall counts, ratcheted (krizaka/.github, security lane; founder 2026-11-01: a blocking threshold, smells included).
//
//   node sonar-ratchet.mjs [--baseline sonar-ratchet.json] [--pull-request N] [--update]
//
// The quality gate "Krizaka" refuses NEW bugs, vulnerabilities and major-or-worse smells; Sonar cannot hold the OLD ones down. This does:
// the counts of the project's overall code (bugs, vulnerabilities, hotspots to review, code smells per severity) are compared with the
// repository's committed `sonar-ratchet.json`, and none may rise. A pull request analysis only carries the issues of its own new code, so
// its figure is the default branch's overall count plus the pull request's own. `--update` lowers the baseline to the current counts and
// never raises one (a new file is written with the current counts). Needs only Node 22+ and the org token in the environment; it is never printed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const HOST = "https://sonarcloud.io";
const SEVERITIES = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"];
export const KEYS = ["bugs", "vulnerabilities", "hotspots", ...SEVERITIES.map((s) => `smells_${s.toLowerCase()}`)];

const zero = () => Object.fromEntries(KEYS.map((k) => [k, 0]));

/** The counts of one analysis (the default branch, or a pull request when `pullRequest` is set), through an injectable `get(path)`. */
export async function counts(get, project, { pullRequest } = {}) {
  const scope = pullRequest ? `&pullRequest=${pullRequest}` : "";
  const out = zero();
  for (const type of ["BUG", "VULNERABILITY", "CODE_SMELL"]) {
    const d = await get(`/api/issues/search?componentKeys=${encodeURIComponent(project)}&types=${type}&resolved=false&ps=1&facets=severities${scope}`);
    if (type === "BUG") out.bugs = d.total ?? 0;
    else if (type === "VULNERABILITY") out.vulnerabilities = d.total ?? 0;
    else for (const v of d.facets?.find((f) => f.property === "severities")?.values ?? []) out[`smells_${v.val.toLowerCase()}`] = v.count;
  }
  const h = await get(`/api/hotspots/search?projectKey=${encodeURIComponent(project)}&status=TO_REVIEW&ps=1${scope}`);
  out.hotspots = h.paging?.total ?? 0;
  return out;
}

/** What is measured: the default branch overall, plus the pull request's own new-code issues when there is one. */
export async function current(get, project, { pullRequest } = {}) {
  const main = await counts(get, project);
  if (!pullRequest) return main;
  const own = await counts(get, project, { pullRequest });
  return Object.fromEntries(KEYS.map((k) => [k, main[k] + own[k]]));
}

/** The keys whose count rose above the baseline. A key missing from the baseline counts as 0. */
export function regressions(now, baseline) {
  return KEYS.filter((k) => now[k] > (baseline[k] ?? 0)).map((k) => ({ key: k, now: now[k], baseline: baseline[k] ?? 0 }));
}

/** The next baseline: never higher than the current one (a key absent from the file takes the current count). */
export function lowered(now, baseline) {
  return Object.fromEntries(KEYS.map((k) => [k, k in baseline ? Math.min(now[k], baseline[k]) : now[k]]));
}

const arg = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

export function projectOf(file, properties) {
  if (file?.project) return file.project;
  const line = (properties ?? "").split("\n").map((l) => l.trim()).find((l) => l.startsWith("sonar.projectKey"));
  return line?.split("=")[1]?.trim() || undefined;
}

export async function main(argv, { get, read = readFileSync, write = writeFileSync, exists = existsSync, log = console.log } = {}) {
  const path = arg(argv, "--baseline") ?? "sonar-ratchet.json";
  const update = argv.includes("--update");
  const file = exists(path) ? JSON.parse(read(path, "utf8")) : null;
  const props = exists("sonar-project.properties") ? read("sonar-project.properties", "utf8") : "";
  const project = projectOf(file, props);
  if (!project) { log("::error::no Sonar project: set `project` in sonar-ratchet.json or sonar.projectKey in sonar-project.properties"); return 2; }
  if (!file && !update) { log(`::error::no ${path}: run \`node sonar-ratchet.mjs --update\` once and commit it`); return 1; }
  const pullRequest = arg(argv, "--pull-request") || undefined;
  const now = await current(get, project, { pullRequest });
  const baseline = file?.counts ?? {};
  if (update) {
    const next = { project, counts: lowered(now, baseline) };
    write(path, `${JSON.stringify(next, null, 2)}\n`);
    log(`${path} updated: ${JSON.stringify(next.counts)}`);
    return 0;
  }
  const bad = regressions(now, baseline);
  if (bad.length) {
    for (const r of bad) log(`::error::sonar ratchet: ${r.key} is ${r.now}, baseline ${r.baseline}: the overall count may only go down (fix the new findings)`);
    return 1;
  }
  const better = KEYS.filter((k) => now[k] < (baseline[k] ?? 0));
  const lowerable = better.map((k) => `${k} ${baseline[k]} -> ${now[k]}`).join(", ");
  log(better.length ? `sonar ratchet ok; lower the baseline with --update: ${lowerable}` : "sonar ratchet ok");
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const credential = process.env.SONAR_TOKEN;
  if (!credential) { console.log("::error::the Sonar credential is empty"); process.exit(2); }
  const get = async (p) => {
    const res = await fetch(`${HOST}${p}`, { headers: { Authorization: `Bearer ${credential}` }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Sonar API ${res.status} on ${p.split("?")[0]}`);
    return res.json();
  };
  process.exit(await main(process.argv.slice(2), { get }));
}
