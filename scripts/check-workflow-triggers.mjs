#!/usr/bin/env node
// Scorecard "Dangerous-Workflow" guard (krizaka/.github#372): a workflow triggered by `workflow_run` or `pull_request_target`
// runs with the repository's secrets, so it must never check out (or run) the code of the event's head. Fails on such a workflow
// whose checkout `ref:` is the event's head (workflow_run.head_*, pull_request.head.*, head_ref), or that runs `gh pr checkout`.
// A zizmor ignore comment does not exempt it. dependabot-automerge (pull_request_target, no checkout) is fine.
//
//   node scripts/check-workflow-triggers.mjs [workflows-dir]   # default .github/workflows
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PRIVILEGED = /(^|\s|\[|,)(workflow_run|pull_request_target)\s*:?/m;
const HEAD_REF = /ref:\s*["']?\$\{\{[^}]*(workflow_run\.head_(sha|branch)|pull_request\.head\.(sha|ref)|\bhead_ref\b|\.head\.sha|\.head\.ref)[^}]*\}\}/;
const PR_CHECKOUT = /gh\s+pr\s+checkout|git\s+(checkout|fetch)\b[^\n]*refs\/pull\//;

export function violations(name, source) {
  const code = source.replace(/^\s*#.*$/gm, "").replace(/\s#.*$/gm, "");
  if (!/^\s*(workflow_run|pull_request_target)\s*:/m.test(code) && !/^on:.*(workflow_run|pull_request_target)/m.test(code)) return [];
  const found = [];
  if (HEAD_REF.test(code)) found.push(`${name}: a workflow_run / pull_request_target workflow checks out the event's head`);
  if (PR_CHECKOUT.test(code)) found.push(`${name}: a workflow_run / pull_request_target workflow checks out a pull request`);
  return found;
}

export function check(dir) {
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => violations(f, readFileSync(join(dir, f), "utf8")));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const bad = check(process.argv[2] ?? ".github/workflows");
  for (const b of bad) console.error(`::error::${b} (Scorecard Dangerous-Workflow, krizaka/.github#372): use schedule / workflow_dispatch on main, or check out nothing from the event`);
  process.exit(bad.length ? 1 : 0);
}
