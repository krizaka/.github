#!/usr/bin/env node
/* Conformance: no open issue of ours in a public repository (security lane, founder 2026-10-30).
   Every issue we open lives in krizaka/krizaka-internal; public repos keep only what outside people open. This check counts,
   per public repository, the open issues opened by OUR identities (the founder, the apps, the Actions bot). Any count above
   zero exits 1 (red) and opens/updates ONE tracking issue in krizaka-internal listing them; it closes it when all is zero.
   The logs of this repository are public: the script prints counts only, never a title or a body.
   Env: GH_TOKEN (read the public repos, write issues in krizaka-internal); CHECK_DRY_RUN=1 (no write). */

export const ORG = "krizaka";
export const INTERNAL = "krizaka-internal";
export const TRACKING_LABEL = "conformance-public-issues";
/** Our identities: the founder's login, the two apps, the workflows' bot. Anyone else is the public and stays public. */
export const OURS = new Set(["oussamaabid", "wu-sama", "krizaka-agents[bot]", "orazaka[bot]", "github-actions[bot]"]);

/** Whether an open issue (REST shape) is ours: not a pull request, opened by one of OURS. */
export function isOurs(issue) {
  if (issue.pull_request) return false;
  return OURS.has((issue.user?.login ?? "").toLowerCase());
}

/** { repo: [numbers] } from { repo: issues[] }, only the repositories with at least one of ours. */
export function offenders(issuesByRepo) {
  const out = {};
  for (const [repo, issues] of Object.entries(issuesByRepo)) {
    const mine = issues.filter(isOurs).map((i) => i.number).sort((a, b) => a - b);
    if (mine.length) out[repo] = mine;
  }
  return out;
}

export const total = (found) => Object.values(found).reduce((n, list) => n + list.length, 0);

/** The log line: counts only. */
export function summary(repoCount, found) {
  const per = Object.entries(found).map(([r, l]) => `${r}=${l.length}`).join(" ");
  const detail = per ? ` (${per})` : "";
  return `public repos: ${repoCount}, open issues of ours in public repos: ${total(found)}${detail}`;
}

/** The tracking issue's body (private repo, so numbers may be listed). */
export function renderReport(found, now = new Date()) {
  const head = `Open issues opened by our identities in **public** repositories (rule: every issue of ours lives in krizaka-internal). Move each with \`gh issue transfer <n> krizaka/${INTERNAL} -R krizaka/<repo>\` (tools/issue-migrate.py renames, labels and restores the board card). Updated ${now.toISOString().slice(0, 10)} by krizaka/.github « Public issues conformance ».`;
  if (!total(found)) return `${head}\n\nNone: every public repository is clean.`;
  const links = (r, l) => l.map((n) => `https://github.com/${ORG}/${r}/issues/${n}`).join(" ");
  const rows = Object.entries(found).map(([r, l]) => `- \`${r}\` (${l.length}): ${links(r, l)}`);
  return `${head}\n\n**${total(found)} issue(s) in ${rows.length} repo(s):**\n\n${rows.join("\n")}`;
}

/** What to do with the tracking issue: open, update, close or nothing. */
export function plan(found, tracking) {
  if (total(found) === 0) return tracking ? "close" : "none";
  return tracking ? "update" : "open";
}

/** Only paths of the GitHub REST API under this org, made of safe characters. */
export const SAFE_PATH = /^(?:orgs\/krizaka\/repos|repos\/krizaka\/[\w.-]+\/issues(?:\/\d+)?)(?:\?[\w=&%.:-]*)?$/;

async function gh(path, init = {}) {
  if (!SAFE_PATH.test(path) || path.includes("..")) throw new Error("refused API path");
  const res = await fetch(new URL(path, "https://api.github.com/"), {
    ...init,
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}`);
  return res.json();
}

async function all(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

async function main() {
  const repos = (await all(`orgs/${ORG}/repos?type=public`)).filter((r) => !r.archived && !r.private);
  const byRepo = {};
  for (const r of repos) byRepo[r.name] = await all(`repos/${ORG}/${encodeURIComponent(r.name)}/issues?state=open`);
  const found = offenders(byRepo);
  console.log(summary(repos.length, found));
  if (process.env.CHECK_DRY_RUN !== "1") {
    const open = await gh(`repos/${ORG}/${INTERNAL}/issues?state=open&labels=${TRACKING_LABEL}&per_page=1`);
    const tracking = open[0];
    const action = plan(found, tracking);
    const body = renderReport(found);
    if (action === "open") await gh(`repos/${ORG}/${INTERNAL}/issues`, { method: "POST", body: JSON.stringify({ title: "krizaka-internal · chore(conformance): open issues of ours still in public repos", body, labels: [TRACKING_LABEL, "repo:.github", "product:platform", "lane:security", "type:chore"] }) });
    else if (action === "update") await gh(`repos/${ORG}/${INTERNAL}/issues/${tracking.number}`, { method: "PATCH", body: JSON.stringify({ body }) });
    else if (action === "close") await gh(`repos/${ORG}/${INTERNAL}/issues/${tracking.number}`, { method: "PATCH", body: JSON.stringify({ body, state: "closed", state_reason: "completed" }) });
    console.log(`tracking issue: ${action}`);
  }
  if (total(found) > 0) {
    console.error("RED: open issues of ours remain in public repositories");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
