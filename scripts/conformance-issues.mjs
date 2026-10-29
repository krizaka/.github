#!/usr/bin/env node
// One issue per red repository (krizaka/.github#393): the weekly conformance run opens it, refreshes it while cells stay red,
// and closes it when the repository is green again. Never a board card: the issue is the repository's own reminder.
//
//   node scripts/conformance-issues.mjs --matrix matrix.json [--apply]      the plan (dry run) or the changes
//
// Reads/writes GitHub with the agents' app credential from the environment (issues: write on the repositories).
// The issue is found by its marker, never by its title.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadRules } from "./conformance.mjs";

export const MARKER = "<!-- krizaka-conformance -->";
const RULES_URL = "https://github.com/krizaka/.github/blob/main/docs/standards/rules.json";

/** The red cells of each repository: { repo: [{ id, why }] }, only repositories with a red cell. */
export function redByRepo(cells) {
  const out = {};
  for (const [repo, byRule] of Object.entries(cells)) {
    const reds = Object.entries(byRule).filter(([, c]) => c.status === "red").map(([id, c]) => ({ id, why: c.why ?? "" }));
    if (reds.length > 0) out[repo] = reds;
  }
  return out;
}

export const titleOf = (reds) => `Org rules: ${reds.length} red in the conformance matrix`;

/** The body: one line per red rule with its title, the reason and the rule's issue; refreshed in place every week. */
export function bodyOf(repo, reds, rules) {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const lines = reds.map(({ id, why }) => {
    const rule = byId.get(id);
    const link = rule?.issue ? ` (${rule.issue})` : "";
    return `- [ ] \`${id}\`: ${rule?.title ?? id}${link}${why ? `. ${why}` : ""}`;
  });
  return `${MARKER}\nThe weekly conformance run found these org rules red in \`${repo}\`. The fix is in \`fix\` of each rule in [rules.json](${RULES_URL}); the run closes this issue by itself when the repository is green.\n\n${lines.join("\n")}\n`;
}

/** What to do: open for a red repository without an issue, update when the text changed, close when it is green. */
export function planIssues(reds, open, rules) {
  const steps = [];
  for (const [repo, list] of Object.entries(reds)) {
    const body = bodyOf(repo, list, rules);
    const title = titleOf(list);
    const existing = open[repo];
    if (!existing) steps.push({ repo, action: "open", title, body });
    else if (existing.body !== body || existing.title !== title) steps.push({ repo, action: "update", number: existing.number, title, body });
  }
  for (const [repo, existing] of Object.entries(open)) {
    if (!reds[repo]) steps.push({ repo, action: "close", number: existing.number });
  }
  return steps;
}

async function api(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/** The open conformance issue of each repository (found by its marker). */
async function openIssues(repos) {
  const open = {};
  for (const repo of repos) {
    const issues = await api("GET", `/repos/krizaka/${repo}/issues?state=open&per_page=100`);
    const found = issues.find((i) => !i.pull_request && (i.body ?? "").startsWith(MARKER));
    if (found) open[repo] = { number: found.number, title: found.title, body: found.body };
  }
  return open;
}

export async function main(argv) {
  const at = argv.indexOf("--matrix");
  const matrix = JSON.parse(readFileSync(at < 0 ? "matrix.json" : argv[at + 1], "utf8"));
  const apply = argv.includes("--apply");
  const reds = redByRepo(matrix.cells);
  const open = await openIssues(Object.keys(matrix.cells));
  for (const step of planIssues(reds, open, loadRules())) {
    if (!apply) {
      console.log(`${step.repo}: would ${step.action}`);
    } else if (step.action === "open") {
      const made = await api("POST", `/repos/krizaka/${step.repo}/issues`, { title: step.title, body: step.body });
      console.log(`${step.repo}: opened ${made.html_url}`);
    } else if (step.action === "update") {
      await api("PATCH", `/repos/krizaka/${step.repo}/issues/${step.number}`, { title: step.title, body: step.body });
      console.log(`${step.repo}: refreshed #${step.number}`);
    } else {
      await api("PATCH", `/repos/krizaka/${step.repo}/issues/${step.number}`, { state: "closed", state_reason: "completed" });
      console.log(`${step.repo}: closed #${step.number}`);
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
