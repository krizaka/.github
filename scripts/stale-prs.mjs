#!/usr/bin/env node
// Stale PRs (krizaka/krizaka-internal#2000): an open PR older than 7 days is brought up to date (a new head = a full CI re-run before any train);
// one idle for more than 21 days is closed with a note. The `keep-open` label opts a PR out.
//   node scripts/stale-prs.mjs [--dry-run]     (token: the agents app, pull requests write)
import { pathToFileURL } from "node:url";

export const REFRESH_DAYS = 7;
export const CLOSE_IDLE_DAYS = 21;
const DAY = 86400000;

/** @returns "close" | "update" | "none" */
export function classify(pr, now = Date.now()) {
  if ((pr.labels ?? []).some((l) => (l.name ?? l) === "keep-open")) return "none";
  const idle = (now - Date.parse(pr.updated_at)) / DAY;
  const age = (now - Date.parse(pr.created_at)) / DAY;
  if (idle > CLOSE_IDLE_DAYS) return "close";
  if (age > REFRESH_DAYS && !pr.draft) return "update";
  return "none";
}

export const NOTE = `Closed by the stale-PR sweep: no activity for more than ${CLOSE_IDLE_DAYS} days. A branch that old no longer tests against what main became (krizaka-internal#2000). Reopen it after bringing it up to date, or label it \`keep-open\` to opt out.`;

async function call(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GH_TOKEN}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok && res.status !== 422) throw new Error(`${path}: ${res.status}`);
  return res.status === 204 || res.status === 202 ? null : res.json().catch(() => null);
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await call(`/orgs/krizaka/repos?type=all&per_page=100&page=${page}`);
    if (!batch?.length) break;
    repos.push(...batch.filter((r) => !r.archived && !r.disabled));
  }
  for (const { name } of repos) {
    for (const pr of (await call(`/repos/krizaka/${name}/pulls?state=open&per_page=100`)) ?? []) {
      const action = classify(pr);
      if (action === "none") continue;
      console.log(`${name}#${pr.number}: ${action}${dry ? " (dry run)" : ""}`);
      if (dry) continue;
      if (action === "close") {
        await call(`/repos/krizaka/${name}/issues/${pr.number}/comments`, { method: "POST", body: JSON.stringify({ body: NOTE }) });
        await call(`/repos/krizaka/${name}/pulls/${pr.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
      } else {
        await call(`/repos/krizaka/${name}/pulls/${pr.number}/update-branch`, { method: "PUT", body: "{}" }); // 422: already up to date or conflicted, nothing to do
      }
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
