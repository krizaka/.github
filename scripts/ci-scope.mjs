#!/usr/bin/env node
// Which suites of this repository's own CI does a pull request need? (the `CI gate` workflow, ci-gate.yml)
//
//   gh api repos/<repo>/pulls/<n>/files --paginate --jq '.[].filename' | node scripts/ci-scope.mjs   # prints name=true|false
//
// Fail-open, like changes.yml: an empty list (an API error, a truncated list) needs every suite. Nothing is skipped because
// the scope itself broke. The path lists below are the ones the suites used as `paths:` filters; they live here alone now.
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Glob (`*`, `**`) to an anchored RegExp. */
export function globToRegExp(glob) {
  const body = glob
    .split("**/")
    .map((part) =>
      part
        .split("**")
        .map((seg) => seg.split("*").map((lit) => lit.replace(/[.+^${}()|[\]\\?]/g, "\\$&")).join("[^/]*"))
        .join(".*"),
    )
    .join("(?:.*/)?");
  return new RegExp(`^${body}$`);
}

const SELFTEST = [
  ".github/workflows/node-ci.yml",
  ".github/workflows/java-ci.yml",
  ".github/workflows/expo-ci.yml",
  ".github/workflows/python-ci.yml",
  ".github/workflows/krizaka-ci.yml",
  ".github/workflows/changes.yml",
  ".github/workflows/selftest-ci.yml",
  "actions/**",
  "tests/fixtures/**",
  "tests/buildpack/**",
];

/** suite id -> globs. A pull request needs a suite when one of its files matches. */
export const SUITES = {
  lint: [".github/workflows/**", "actions/**", "deploy/**", "scripts/**", "tests/**", "repos.json"],
  selftest: SELFTEST,
  profile: ["scripts/profile-products.mjs", "tests/**", "profile/**", ".github/workflows/profile-check.yml"],
  registry: [
    "repos.json",
    "docs/standards/repositories.md",
    "deploy/apps.json",
    "scripts/gen-repos.mjs",
    "scripts/rename-repo.mjs",
    "scripts/repository-names.mjs",
    "tests/repos-registry.test.mjs",
    "tests/rename-repo.test.mjs",
    ".github/workflows/repos-registry.yml",
  ],
  names: [
    "docs/standards/repositories.md",
    "profile/README.md",
    "scripts/repository-names.mjs",
    "scripts/repository-names.test.mjs",
    ".github/workflows/repository-names.yml",
  ],
  docs: [
    "docs/standards/**",
    "scripts/gen-docs.mjs",
    "tests/gen-docs.test.mjs",
    "repos.json",
    ".github/workflows/*-ci.yml",
    ".github/workflows/maven.yml",
    ".github/workflows/docs-current.yml",
  ],
  roadmap: ["scripts/roadmap-sync.mjs", "tests/roadmap-sync.test.mjs", ".github/workflows/roadmap-sync.yml"],
};

// The gate itself and its scope run every suite: a change to the gate is a change to everything.
const EVERYTHING = [".github/workflows/ci-gate.yml", "scripts/ci-scope.mjs", "tests/ci-scope.test.mjs"];

/** { suite: boolean } for a list of changed files. An empty list needs every suite (fail-open). */
export function scope(files, suites = SUITES) {
  const list = files.map((f) => f.trim()).filter(Boolean);
  const all = list.length === 0 || list.some((f) => EVERYTHING.includes(f));
  const out = {};
  for (const [id, globs] of Object.entries(suites)) {
    const res = globs.map(globToRegExp);
    out[id] = all || list.some((f) => res.some((r) => r.test(f)));
  }
  return out;
}

/**
 * The gate's verdict from `needs` (toJSON(needs)): every suite the scope asked for must have succeeded; a suite the scope said
 * `false` for may be skipped (or have run, then it must not have failed). A broken scope (no answer) asks for every suite.
 * Returns the problems; empty means green.
 */
export function verdict(needs, suites = Object.keys(SUITES)) {
  const problems = [];
  const answers = needs.scope?.outputs ?? {};
  for (const id of suites) {
    const result = needs[id]?.result ?? "missing";
    const wanted = answers[id] !== "false";
    if (wanted && result !== "success") problems.push(`${id}: ${result} (it had to succeed)`);
    if (!wanted && !["skipped", "success"].includes(result)) problems.push(`${id}: ${result}`);
  }
  return problems;
}

if (process.argv[2] === "--verdict") {
  const problems = verdict(JSON.parse(process.env["NEEDS"] ?? "{}"));
  for (const p of problems) console.log(`::error::${p}`);
  process.exit(problems.length ? 1 : 0);
}

if (process.argv[2] !== "--verdict" && import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = scope(readFileSync(0, "utf8").split("\n"));
  const lines = Object.entries(result).map(([k, v]) => `${k}=${v}`);
  console.log(lines.join("\n"));
  const target = process.env["GITHUB_OUTPUT"];
  if (target) appendFileSync(target, `${lines.join("\n")}\n`);
}
