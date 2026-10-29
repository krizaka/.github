#!/usr/bin/env node
// Fan-out of a rule (krizaka/.github#393): the conforming pull request in every red repository, template-driven.
//
//   node scripts/conformance-fanout.mjs --matrix matrix.json [--rules a,b] [--repos x,y]          the plan (dry run)
//   node scripts/conformance-fanout.mjs --matrix matrix.json --rules security-scan --apply        open the pull requests
//   --skip a,b leaves repositories that already have an open pull request for the rule
//
// `matrix.json` is `conformance.mjs --json`. One pull request per red repository, holding every auto-fixable red rule asked for
// (copy / append-section / settings-hook of docs/standards/rules.json); the rules that stay `manual` are listed, never guessed.
// Reads and writes GitHub with GH_TOKEN (the app token: the pull requests are the agents').
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadRules } from "./conformance.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
export const HOOK = {
  matcher: "Edit|Write",
  hooks: [{ type: "command", command: "npx --yes -p @krizaka/config krizaka-edit-check", timeout: 10 }],
};
const STUB = "# AGENTS.md\n\nThe org standards live in [krizaka/.github](https://github.com/krizaka/.github) (`docs/standards/`); this file adds what is specific to this repository.\n\n";

/** A workflow template, its reusable call pinned to a commit of krizaka/.github (`@main` -> `@<sha> # main`). */
export function pinTemplate(text, sha) {
  return text.replaceAll(/(uses:\s*krizaka\/\.github\/\.github\/workflows\/[\w.-]+\.yml)@main\b/g, `$1@${sha} # main`);
}

/** The section of the AGENTS template from its heading to the end of the file. */
export function sectionOf(template, heading) {
  const at = template.indexOf(heading);
  if (at < 0) throw new Error(`no « ${heading} » in the template`);
  // The template's relative links point into this repository's docs/: in another repository they are absolute.
  return template.slice(at).trimEnd().replaceAll("](docs/", "](https://github.com/krizaka/.github/blob/main/docs/") + "\n";
}

/** settings.json with the edit hook added once (existing hooks stay). */
export function withHook(existing) {
  const settings = existing ? JSON.parse(existing) : {};
  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];
  const has = JSON.stringify(settings.hooks.PostToolUse).includes("krizaka-edit-check");
  if (!has) settings.hooks.PostToolUse.push(HOOK);
  return JSON.stringify(settings, null, 2) + "\n";
}

/** The files a rule's fix writes in a repository: `[{ path, content }]`, or null when the fix is manual. */
export function filesFor(rule, { sha, current = async () => null, readLocal = read }) {
  return (async () => {
    const fix = rule.fix;
    if (fix.type === "copy") return [{ path: fix.to, content: pinTemplate(readLocal(fix.from), sha) }];
    if (fix.type === "append-section") {
      const before = await current(fix.file);
      const section = sectionOf(readLocal(fix.from), fix.heading);
      return [{ path: fix.file, content: (before ?? STUB).trimEnd() + "\n\n" + section }];
    }
    if (fix.type === "settings-hook") return [{ path: fix.file, content: withHook(await current(fix.file)) }];
    return null;
  })();
}

/** What to do per red repository: `{ repo, rules: [id], manual: [id] }`. */
export function planOf(rules, cells, only = {}) {
  const asked = rules.filter((r) => !only.rules || only.rules.includes(r.id));
  const plan = [];
  for (const [repo, row] of Object.entries(cells)) {
    if (only.repos && !only.repos.includes(repo)) continue;
    if (only.skip?.includes(repo)) continue;
    const red = asked.filter((r) => row[r.id]?.status === "red");
    const auto = red.filter((r) => r.fix.type !== "manual").map((r) => r.id);
    if (red.length > 0) plan.push({ repo, rules: auto, manual: red.filter((r) => r.fix.type === "manual").map((r) => r.id) });
  }
  return plan;
}

async function api(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GH_TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const fileAt = async (repo, path, ref) => {
  const meta = await api("GET", `/repos/krizaka/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
  return meta ? { sha: meta.sha, text: Buffer.from(meta.content, "base64").toString("utf8") } : null;
};

async function openPullRequest({ repo, rules }, all, sha) {
  const meta = await api("GET", `/repos/krizaka/${repo}`);
  const base = meta.default_branch;
  const head = await api("GET", `/repos/krizaka/${repo}/git/ref/heads/${base}`);
  const branch = `chore/conformance-${rules.join("-")}`.slice(0, 80);
  await api("POST", `/repos/krizaka/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha });
  for (const id of rules) {
    const rule = all.find((r) => r.id === id);
    const [file] = await filesFor(rule, { sha, current: async (p) => (await fileAt(repo, p, branch))?.text ?? null });
    const existing = await fileAt(repo, file.path, branch);
    await api("PUT", `/repos/krizaka/${repo}/contents/${file.path}`, {
      message: `chore: ${rule.id}, the org rule (krizaka/.github#393)\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`,
      content: Buffer.from(file.content).toString("base64"),
      branch,
      ...(existing ? { sha: existing.sha } : {}),
    });
  }
  const list = rules.map((id) => `- \`${id}\`: ${all.find((r) => r.id === id).title}`).join("\n");
  const pr = await api("POST", `/repos/krizaka/${repo}/pulls`, {
    title: `chore: conform to the org rules (${rules.join(", ")})`,
    head: branch,
    base,
    body: `Rolls out the org rules this repository was red on in the conformance matrix (docs/standards/rules.json, krizaka/.github#393):\n\n${list}\n\nRefs krizaka/.github#393\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
  });
  return pr.html_url;
}

const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

export async function main(argv) {
  const matrix = JSON.parse(readFileSync(flag(argv, "--matrix") ?? "matrix.json", "utf8"));
  const rules = loadRules();
  const plan = planOf(rules, matrix.cells, { rules: flag(argv, "--rules")?.split(","), repos: flag(argv, "--repos")?.split(","), skip: flag(argv, "--skip")?.split(",") });
  const apply = argv.includes("--apply");
  const sha = apply ? (await api("GET", "/repos/krizaka/.github/commits/main")).sha : "<sha of main>";
  for (const step of plan) {
    const manual = step.manual.length ? ` (manual: ${step.manual.join(", ")})` : "";
    if (step.rules.length === 0) {
      console.log(`${step.repo}: nothing to template${manual}`);
    } else if (apply) {
      console.log(`${step.repo}: ${await openPullRequest(step, rules, sha)}${manual}`);
    } else {
      console.log(`${step.repo}: would open a pull request for ${step.rules.join(", ")}${manual}`);
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
