#!/usr/bin/env node
// Conflict-resolution guard (krizaka/krizaka-internal#2000): a PR whose branch took main in by hand (merge or rebase with conflicts) must not
// silently drop what main added meanwhile. It FAILS when the PR deletes more than N lines that main added since the PR was opened, or more
// than N lines under a generated folder, unless the PR body carries a `deletion-explained: <why>` line.
//
//   node scripts/merge-resolution-guard.mjs --repo-dir <checkout, full history> --opened-at <ISO> [--base origin/main] [--branch-point <sha>] [--max 50] [--body-file F]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const MAX_LINES = 50;
const GENERATED = /(^|\/)(_generated|generated)\//;
const TRIVIAL = 8; // a line shorter than this once trimmed (`}`, `);`, blank) says nothing about content

/** `git diff -U0` → { file: { added: string[], removed: string[] } } (the new path; a deleted file keeps its old path). */
export function parseDiff(text) {
  const files = {};
  let file = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      if (line.slice(4) !== "/dev/null") file = line.slice(6);
    } else if (file && (line.startsWith("+") || line.startsWith("-"))) {
      const entry = (files[file] ??= { added: [], removed: [] });
      (line[0] === "+" ? entry.added : entry.removed).push(line.slice(1));
    }
  }
  return files;
}

const significant = (l) => l.trim().length >= TRIVIAL;
export const explained = (body) => /^\s*deletion-explained:[ \t]*\S+/im.test(body ?? "");

/** @param prDiff base...head, @param mainDiff (last main commit before the PR was opened)..main */
export function judge(prDiff, mainDiff, body, max = MAX_LINES) {
  let dropped = 0;
  let generated = 0;
  const detail = [];
  for (const [file, { removed }] of Object.entries(prDiff)) {
    if (GENERATED.test(file)) generated += removed.length;
    const theirs = new Set((mainDiff[file]?.added ?? []).filter(significant));
    const n = removed.filter(significant).filter((l) => theirs.has(l)).length;
    dropped += n;
    if (n) detail.push(`${file}: ${n} line(s) main added are deleted`);
  }
  const reasons = [];
  if (dropped > max) reasons.push(`${dropped} lines that main added since this PR was opened are deleted by it (limit ${max})`);
  if (generated > max) reasons.push(`${generated} lines under generated folders are deleted (limit ${max})`);
  return { ok: reasons.length === 0 || explained(body), dropped, generated, reasons, detail, explained: explained(body) };
}

const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

export function main(argv) {
  const flag = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const dir = flag("--repo-dir", ".");
  const base = flag("--base", "origin/main");
  const max = Number(flag("--max", MAX_LINES));
  const openedAt = flag("--opened-at");
  const body = flag("--body-file") ? readFileSync(flag("--body-file"), "utf8") : (process.env.PR_BODY ?? "");
  const branchPoint = flag("--branch-point") ? flag("--branch-point") : openedAt ? git(dir, "rev-list", "-1", `--before=${openedAt}`, base).trim() : git(dir, "merge-base", base, "HEAD").trim();
  const prDiff = parseDiff(git(dir, "diff", "-U0", "--no-color", `${base}...HEAD`));
  const mainDiff = branchPoint ? parseDiff(git(dir, "diff", "-U0", "--no-color", branchPoint, base)) : {};
  const r = judge(prDiff, mainDiff, body, max);
  for (const d of r.detail) console.log(d);
  if (r.reasons.length && !r.explained) {
    console.error(`merge-resolution guard: ${r.reasons.join("; ")}.\nIf it is intended, add a line « deletion-explained: <why> » to the PR description.`);
    return 1;
  }
  console.log(r.reasons.length ? "deletions are explained in the PR description" : `ok: ${r.dropped} line(s) of main dropped, ${r.generated} generated line(s) deleted`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
