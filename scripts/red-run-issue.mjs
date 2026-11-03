#!/usr/bin/env node
// A scheduled guard that goes red opens an issue (krizaka-internal#883): `audit-guards` was red three days with nobody told.
// One issue per guard, found by its exact title: red opens it or comments on it, green closes it.
//
//   node scripts/red-run-issue.mjs --guard audit-guards --state red|green --run-url <url> [--log file] [--repo krizaka/krizaka-internal] [--dry-run]
//   node scripts/red-run-issue.mjs --title "<repo> · fix(ci): main is red" --labels repo:orazaka,type:fix --body-file body.md --state red --run-url <url>
//     (any alert, not only a guard: an exact title, a body written by the caller, labels on open; the action `actions/alert-issue` wraps it)
//   ... --alert-key main-red/orazaka   ONE issue per key, whatever its title does (ADR-001 §A.4, krizaka-internal#2282, #2023): the key is stored in
//     the body as `<!-- alert-key: main-red/orazaka -->` and the issue carries the label `alert`. red: an open issue of the key gets a comment with the run,
//     a closed one is reopened, none is opened (an open issue of the same title with no key adopts it); green closes the open one with the run as proof.
//     The same contract as krizaka-agents `tools/alerts.py` (`issue-new --alert-key`), the tool the sessions use: keep the marker and the label identical.
//
// GH_TOKEN: the agents' app token with issues: write on the target repository.
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const titleOf = (guard) => `.github · fix(guards): the scheduled guard ${guard} is red`;

/** The issue's exact title: the caller's own, or the guard's standard one. */
export const titleFor = ({ guard, title }) => title || titleOf(guard);

/** `a,b` -> ["a", "b"]; nothing -> []. */
export const labelsOf = (csv = "") => csv.split(",").map((l) => l.trim()).filter(Boolean);

export const ALERT_LABEL = "alert";
const KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,119}$/;

/** The line that stores an alert key in an issue body; refused (throws) when the key is not a plain path-like word. */
export function markerOf(key) {
  if (!KEY.test(key ?? "")) throw new Error("--alert-key: 3 to 120 characters of letters, digits and . _ / - (e.g. main-red/orazaka)");
  return `<!-- alert-key: ${key} -->`;
}

/** The most recent issue (open or closed, never a pull request) carrying the key; `issues` come newest first. */
export const findByKey = (issues, key) => issues.find((i) => !i.pull_request && (i.body ?? "").includes(markerOf(key)));

/** What to do with an alert known by its key: red opens, comments, or reopens a closed one; green closes the open one. */
export function planKey({ state, issue }) {
  if (state === "red") {
    if (!issue) return { action: "open" };
    return issue.state === "closed" ? { action: "reopen", number: issue.number } : { action: "comment", number: issue.number };
  }
  return issue?.state === "open" ? { action: "close", number: issue.number } : { action: "none" };
}

/** A new alert issue's body: the caller's text, then the marker. */
export const withMarker = (body, key) => `${body.trimEnd()}\n\n${markerOf(key)}\n`;

/** What to do with the guard's issue: open, comment, close or nothing. */
export function plan({ state, open }) {
  if (state === "red") return open ? { action: "comment", number: open.number } : { action: "open" };
  return open ? { action: "close", number: open.number } : { action: "none" };
}

/** The issue body (or comment): the run, then the last lines of its log. */
export function bodyOf({ guard, runUrl, log = "" }) {
  const tail = log.trim().split("\n").slice(-40).join("\n");
  const fence = "```";
  const excerpt = tail ? [fence, tail, fence, "", ""].join("\n") : "";
  return `The scheduled run of \`${guard}\` is red: ${runUrl}\n\n${excerpt}Fix the guard's finding (or the guard), then the next green run closes this issue by itself.\n`;
}

export async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GH_TOKEN ?? ""}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status}`);
  return res.json();
}

/** The alerts of the repository, newest first (the label keeps the read small; 5 pages of 100 at most). */
async function alertIssues(api, repo) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const part = await api(`/repos/${repo}/issues?labels=${ALERT_LABEL}&state=all&per_page=100&page=${page}`);
    all.push(...part);
    if (part.length < 100) break;
  }
  return all;
}

/** An alert by key: comment / reopen / open (red) or close with the run as proof (green). Returns the action taken. */
export async function alertByKey({ api, repo, key, state, title, body, labels, runUrl, dryRun = false }) {
  let issue = findByKey(await alertIssues(api, repo), key);
  let adopted = false;
  if (!issue && state === "red") {  // an open issue of the same title with no key yet takes it: the alerts filed before the key
    const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title "${title}"`);
    const same = (await api(`/search/issues?q=${q}`)).items.find((i) => i.title === title && !(i.body ?? "").includes("<!-- alert-key:"));
    if (same) { issue = same; adopted = true; }
  }
  const step = planKey({ state, issue: adopted ? { ...issue, state: "open" } : issue });
  if (dryRun || step.action === "none") return step;
  const post = (path, method, payload) => api(path, { method, body: JSON.stringify(payload) });
  const base = `/repos/${repo}/issues`;
  if (step.action === "open") await post(base, "POST", { title, body: withMarker(body, key), labels: [...new Set([...labels, ALERT_LABEL])] });
  if (adopted) {
    await post(`${base}/${step.number}`, "PATCH", { body: withMarker(issue.body ?? "", key) });
    await post(`${base}/${step.number}/labels`, "POST", { labels: [ALERT_LABEL] });
  }
  if (step.action === "reopen") await post(`${base}/${step.number}`, "PATCH", { state: "open" });
  if (step.action === "comment" || step.action === "reopen") await post(`${base}/${step.number}/comments`, "POST", { body });
  if (step.action === "close") {
    await post(`${base}/${step.number}/comments`, "POST", { body: `Resolved: the check is green again. Proof: ${runUrl}` });
    await post(`${base}/${step.number}`, "PATCH", { state: "closed", state_reason: "completed" });
  }
  return step;
}

const flag = (argv, name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);

const describe = (step) => (step.number ? `${step.action} #${step.number}` : step.action);
const readBody = (bodyFile, fallback) => (bodyFile && existsSync(bodyFile) ? readFileSync(bodyFile, "utf8") : fallback());
const readLog = (logFile) => (logFile && existsSync(logFile) ? readFileSync(logFile, "utf8") : "");

/** One issue per alert key (see alertByKey): the by-key path of main. */
async function fileByKey({ argv, api, repo, alertKey, state, title, bodyFile, guard, labels, runUrl }) {
  const body = readBody(bodyFile, () => bodyOf({ guard: guard ?? title, runUrl, log: "" }));
  const step = await alertByKey({ api, repo, key: alertKey, state, title, body, labels, runUrl, dryRun: argv.includes("--dry-run") });
  console.log(`${alertKey} ${state}: ${describe(step)} in ${repo}`);
}

/** The title-dedupe path of main: one open issue per title. */
async function fileByTitle({ argv, api, repo, state, title, guard, bodyFile, logFile, labels, runUrl }) {
  const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title "${title}"`);
  const found = await api(`/search/issues?q=${q}`);
  const step = plan({ state, open: found.items.find((i) => i.title === title) });
  const body = readBody(bodyFile, () => bodyOf({ guard: guard ?? title, runUrl, log: readLog(logFile) }));
  console.log(`${guard} ${state}: ${describe(step)} in ${repo}`);
  if (argv.includes("--dry-run") || step.action === "none") {
    return;
  }
  const send = (path, method, payload) => api(`/repos/${repo}/issues${path}`, { method, body: JSON.stringify(payload) });
  if (step.action === "open") {
    await send("", "POST", { title, body, ...(labels.length ? { labels } : {}) });
  }
  if (step.action === "comment") {
    await send(`/${step.number}/comments`, "POST", { body });
  }
  if (step.action === "close") {
    await send(`/${step.number}/comments`, "POST", { body: `Green again: ${runUrl}` });
    await send(`/${step.number}`, "PATCH", { state: "closed", state_reason: "completed" });
  }
}

export async function main(argv, api = gh) {
  const guard = flag(argv, "--guard");
  const state = flag(argv, "--state");
  const ownTitle = flag(argv, "--title");
  if ((!guard && !ownTitle) || !["red", "green"].includes(state)) {
    console.error("usage: red-run-issue.mjs (--guard <name> | --title <t> [--body-file f] [--labels a,b] [--alert-key k]) --state red|green --run-url <url> [--log file] [--repo owner/name] [--dry-run]");
    return 2;
  }
  const common = {
    argv,
    api,
    state,
    guard,
    repo: flag(argv, "--repo", "krizaka/krizaka-internal"),
    runUrl: flag(argv, "--run-url", ""),
    logFile: flag(argv, "--log"),
    bodyFile: flag(argv, "--body-file"),
    labels: labelsOf(flag(argv, "--labels", "")),
    title: titleFor({ guard, title: ownTitle }),
  };
  const alertKey = flag(argv, "--alert-key");
  await (alertKey ? fileByKey({ ...common, alertKey }) : fileByTitle(common));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
