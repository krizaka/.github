#!/usr/bin/env node
// One issue per red repository (krizaka/.github#393): the weekly conformance run opens it, refreshes it while cells stay red,
// and closes it when the repository is green again. Never a board card: the issue is the repository's own reminder.
//
//   node scripts/conformance-issues.mjs --matrix matrix.json [--apply]      the plan (dry run) or the changes
//
// The issues live in the PRIVATE krizaka-internal, never in the red (often public) repository: an issue of ours in a public repo
// is red in « Public issues conformance » (krizaka-internal#1999). Title `<repo> · chore(conformance): Org rules: N red`; found by its marker and its title prefix.
// Reads/writes GitHub with the agents' app credential from the environment (issues: write on krizaka-internal).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadRules } from "./conformance.mjs";

export const MARKER = "<!-- krizaka-conformance -->";
export const INTERNAL = "krizaka-internal";
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

export const titleOf = (reds, repo) => `${repo} · chore(conformance): Org rules: ${reds.length} red in the conformance matrix`;

/** The repository a conformance issue is about: the title's first word. */
export const repoOfTitle = (title) => /^(\S+) · /.exec(title)?.[1] ?? null;

/** Labels of the internal issue (the rule: repo:, product:, lane:, type:). */
export const labelsOf = (repo) => [`repo:${repo}`, "product:platform", "lane:platform", "type:chore", "conformance-org-rules"];

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
    const title = titleOf(list, repo);
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

/** The open conformance issue of each repository, read from krizaka-internal (found by its marker and its title prefix). */
async function openIssues() {
  const open = {};
  for (let page = 1; ; page++) {
    const issues = await api("GET", `/repos/krizaka/${INTERNAL}/issues?state=open&labels=conformance-org-rules&per_page=100&page=${page}`);
    for (const i of issues) {
      const repo = repoOfTitle(i.title);
      if (!i.pull_request && repo && (i.body ?? "").startsWith(MARKER)) open[repo] = { number: i.number, title: i.title, body: i.body };
    }
    if (issues.length < 100) return open;
  }
}

export async function main(argv) {
  const at = argv.indexOf("--matrix");
  const matrix = JSON.parse(readFileSync(at < 0 ? "matrix.json" : argv[at + 1], "utf8"));
  const apply = argv.includes("--apply");
  const reds = redByRepo(matrix.cells);
  const open = await openIssues();
  for (const step of planIssues(reds, open, loadRules())) {
    if (!apply) {
      console.log(`${step.repo}: would ${step.action}`);
    } else if (step.action === "open") {
      const made = await api("POST", `/repos/krizaka/${INTERNAL}/issues`, { title: step.title, body: step.body, labels: labelsOf(step.repo) });
      console.log(`${step.repo}: opened ${made.html_url}`);
    } else if (step.action === "update") {
      await api("PATCH", `/repos/krizaka/${INTERNAL}/issues/${step.number}`, { title: step.title, body: step.body });
      console.log(`${step.repo}: refreshed #${step.number}`);
    } else {
      await api("PATCH", `/repos/krizaka/${INTERNAL}/issues/${step.number}`, { state: "closed", state_reason: "completed" });
      console.log(`${step.repo}: closed #${step.number}`);
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
