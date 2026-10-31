#!/usr/bin/env node
// How long does a pull request, and a merge queue entry, wait for its checks? (ADR-018, the speed budgets)
//
//   node scripts/ci-speed.mjs [--org krizaka] [--days 7] [--json] [--fail-over-budget]
//   node scripts/ci-speed.mjs --from rows.json     render rows measured earlier (no network)
//
// For each public repository of the organisation, the workflow runs of the last `--days` days are read from the REST API
// (never GraphQL: its quota is shared by every session). The feedback time of one head commit for one event
// (`pull_request`, `merge_group`) is the first run's start to the last run's end, cancelled runs left out (a superseded
// push is not feedback). The 90th percentile is compared with the repository's budget (docs/standards/ci-profiles.json).
// Read-only: an environment credential only raises the rate limit.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const EVENTS = ["pull_request", "merge_group"];

/** The value at percentile `p` (0..1) of a list of numbers (nearest rank); null for an empty list. */
export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

/** Feedback seconds per head commit for one event: [{ sha, seconds, slowest }]. Runs without times or cancelled are skipped. */
// A re-run (run_attempt > 1) and a run started more than LATE_MINUTES after the commit's first one (a workflow dispatched
// by hand days later, a baseline update) are not the feedback the push waited for: left out. So is a run « longer » than a
// hosted job can last (MAX_RUN_MINUTES): its updated_at moved after the end (an approval, a log deletion), not its work.
export const LATE_MINUTES = 30;
export const MAX_RUN_MINUTES = 360;
export function feedbackTimes(runs, event) {
  const bySha = new Map();
  const eligible = runs.filter(
    (r) => r.event === event && r.conclusion !== "cancelled" && r.conclusion !== "skipped" && r.status === "completed" && r.run_started_at && r.updated_at && (r.run_attempt ?? 1) === 1 &&
      r.conclusion !== "action_required" && Date.parse(r.updated_at) - Date.parse(r.run_started_at) <= MAX_RUN_MINUTES * 60000,
  );
  const first = new Map();
  for (const r of eligible) first.set(r.head_sha, Math.min(first.get(r.head_sha) ?? Infinity, Date.parse(r.run_started_at)));
  for (const r of eligible) {
    if (Date.parse(r.run_started_at) - first.get(r.head_sha) > LATE_MINUTES * 60000) continue;
    const start = Date.parse(r.run_started_at);
    const end = Date.parse(r.updated_at);
    if (!(end >= start)) continue;
    const cur = bySha.get(r.head_sha) ?? { sha: r.head_sha, start, end, slowest: { name: r.name, seconds: 0 } };
    cur.start = Math.min(cur.start, start);
    cur.end = Math.max(cur.end, end);
    if ((end - start) / 1000 > cur.slowest.seconds) cur.slowest = { name: r.name, seconds: (end - start) / 1000 };
    bySha.set(r.head_sha, cur);
  }
  return [...bySha.values()].map((x) => ({ sha: x.sha, seconds: (x.end - x.start) / 1000, slowest: x.slowest.name }));
}

/** The budgets (minutes) of a repository: the organisation's, unless its entry in `repos` is an object with `budgets`. */
export function budgetsFor(repo, cfg) {
  const entry = cfg.repos?.[repo];
  const own = entry && !Array.isArray(entry) ? entry.budgets : null;
  return { ...pick(cfg.budgets), ...pick(own ?? {}) };
}
const pick = (o) => Object.fromEntries(EVENTS.filter((e) => typeof o[e] === "number").map((e) => [e, o[e]]));

/** The profiles of a repository ([] when unknown). */
export function profilesOf(repo, cfg) {
  const entry = cfg.repos?.[repo];
  return Array.isArray(entry) ? entry : (entry?.profiles ?? []);
}

/** The workflow most often the slowest of a commit's runs (the one to look at when a repository is over budget). */
export function usualSlowest(times) {
  const count = new Map();
  for (const t of times) count.set(t.slowest, (count.get(t.slowest) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** One row per repository and event: { repo, event, n, p50, p90, budget, over, slowest } (minutes, one decimal). */
export function measure(repo, runs, cfg) {
  const budgets = budgetsFor(repo, cfg);
  const rows = [];
  for (const event of EVENTS) {
    const times = feedbackTimes(runs, event);
    if (!times.length) continue;
    const secs = times.map((t) => t.seconds);
    const min = (s) => Math.round(s / 6) / 10;
    const p90 = min(percentile(secs, 0.9));
    const budget = budgets[event] ?? null;
    rows.push({ repo, event, n: times.length, p50: min(percentile(secs, 0.5)), p90, budget, over: budget !== null && p90 > budget, slowest: usualSlowest(times) });
  }
  return rows;
}

/** The report as Markdown: over-budget rows first, then the others by p90. */
export function render(rows, { days }) {
  const sorted = [...rows].sort((a, b) => Number(b.over) - Number(a.over) || b.p90 - a.p90);
  const over = sorted.filter((r) => r.over);
  const lines = [
    `### CI speed, last ${days} days (budget at the 90th percentile)`,
    "",
    over.length ? `**${over.length} over budget**: ${over.map((r) => `${r.repo} (${r.event})`).join(", ")}` : "Every repository is within its budget.",
    "",
    "| Repository | Event | Commits | p50 (min) | p90 (min) | Budget | | Usually the slowest |",
    "| :--- | :--- | --: | --: | --: | --: | :-: | :--- |",
    ...sorted.map((r) => `| ${r.repo} | ${r.event} | ${r.n} | ${r.p50} | ${r.p90} | ${r.budget ?? "—"} | ${r.over ? "over" : "ok"} | ${r.slowest ?? ""} |`),
  ];
  return lines.join("\n");
}

async function api(path) {
  const auth = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/** The runs of one event since a date (at most 1,000: ten pages). */
async function runsOf(org, repo, event, since) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const { workflow_runs: batch = [] } = await api(`/repos/${org}/${repo}/actions/runs?event=${event}&created=%3E%3D${since}&per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
  const org = arg("--org", "krizaka");
  const days = Number(arg("--days", "7"));
  if (argv.includes("--from")) {
    console.log(render(JSON.parse(readFileSync(arg("--from"), "utf8")), { days }));
    return;
  }
  const cfg = JSON.parse(readFileSync(new URL("../docs/standards/ci-profiles.json", import.meta.url), "utf8"));
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await api(`/orgs/${org}/repos?type=public&per_page=100&page=${page}`);
    repos.push(...batch.filter((r) => !r.archived));
    if (batch.length < 100) break;
  }
  const rows = [];
  for (const repo of repos.map((r) => r.name).sort((a, b) => a.localeCompare(b))) {
    const runs = [];
    for (const event of EVENTS) runs.push(...(await runsOf(org, repo, event, since)));
    rows.push(...measure(repo, runs, cfg));
  }
  console.log(argv.includes("--json") ? JSON.stringify(rows, null, 2) : render(rows, { days }));
  if (argv.includes("--fail-over-budget") && rows.some((r) => r.over)) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
