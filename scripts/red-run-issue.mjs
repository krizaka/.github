#!/usr/bin/env node
// A scheduled guard that goes red opens an issue (krizaka-internal#883): `audit-guards` was red three days with nobody told.
// One issue per guard, found by its exact title: red opens it or comments on it, green closes it.
//
//   node scripts/red-run-issue.mjs --guard audit-guards --state red|green --run-url <url> [--log file] [--repo krizaka/krizaka-internal] [--dry-run]
//
// GH_TOKEN: the agents' app token with issues: write on the target repository.
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const titleOf = (guard) => `.github · fix(guards): the scheduled guard ${guard} is red`;

/** What to do with the guard's issue: open, comment, close or nothing. */
export function plan({ state, open }) {
  if (state === "red") return open ? { action: "comment", number: open.number } : { action: "open" };
  return open ? { action: "close", number: open.number } : { action: "none" };
}

/** The issue body (or comment): the run, then the last lines of its log. */
export function bodyOf({ guard, runUrl, log = "" }) {
  const tail = log.trim().split("\n").slice(-40).join("\n");
  return `The scheduled run of \`${guard}\` is red: ${runUrl}\n\n${tail ? `\`\`\`\n${tail}\n\`\`\`\n\n` : ""}Fix the guard's finding (or the guard), then the next green run closes this issue by itself.\n`;
}

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GH_TOKEN ?? ""}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status}`);
  return res.json();
}

const flag = (argv, name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);

export async function main(argv) {
  const guard = flag(argv, "--guard");
  const state = flag(argv, "--state");
  const repo = flag(argv, "--repo", "krizaka/krizaka-internal");
  const runUrl = flag(argv, "--run-url", "");
  const logFile = flag(argv, "--log");
  if (!guard || !["red", "green"].includes(state)) {
    console.error("usage: red-run-issue.mjs --guard <name> --state red|green --run-url <url> [--log file] [--repo owner/name] [--dry-run]");
    return 2;
  }
  const title = titleOf(guard);
  const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title "${title}"`);
  const found = await gh(`/search/issues?q=${q}`);
  const open = found.items.find((i) => i.title === title);
  const step = plan({ state, open });
  const body = bodyOf({ guard, runUrl, log: logFile && existsSync(logFile) ? readFileSync(logFile, "utf8") : "" });
  console.log(`${guard} ${state}: ${step.action}${step.number ? ` #${step.number}` : ""} in ${repo}`);
  if (argv.includes("--dry-run") || step.action === "none") return 0;
  if (step.action === "open") await gh(`/repos/${repo}/issues`, { method: "POST", body: JSON.stringify({ title, body }) });
  if (step.action === "comment") await gh(`/repos/${repo}/issues/${step.number}/comments`, { method: "POST", body: JSON.stringify({ body }) });
  if (step.action === "close") {
    await gh(`/repos/${repo}/issues/${step.number}/comments`, { method: "POST", body: JSON.stringify({ body: `Green again: ${runUrl}` }) });
    await gh(`/repos/${repo}/issues/${step.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
