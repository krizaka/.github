// No co-author trailer in any commit (founder 2026-10-31): a made-up e-mail in a `Co-authored-by:` line made GitHub list a
// stranger as an akinaza contributor. The krizaka-agents app is the only author; no AI, bot or human trailer.
// Run by security-scan.yml on pull requests (the PR's commits) and in the merge queue (the squash commit itself).
//   node scripts/check-trailers.mjs <base-sha> <head-sha>
// It also refuses the WRITERS of the trailer: a workflow or script whose commit command carries the literal (2026-10-31, our own
// workflows wrote it and the check above then rejected their commits).
//   node scripts/check-trailers.mjs --sources <dir-or-file>...
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

/** The trailer's line when `line` is one (case-insensitive, leading blanks allowed), else null. Plain string work: no backtracking. */
function trailerValue(line) {
  const text = line.trimStart();
  const colon = text.indexOf(":");
  if (colon < 0 || text.slice(0, colon).trimEnd().toLowerCase() !== "co-authored-by") return null;
  return text.slice(colon + 1);
}

/** commits: [{ sha, message }] → the offending ones, with the trailer's name only (the e-mail is never echoed). */
export function trailerProblems(commits) {
  const problems = [];
  for (const c of commits) {
    for (const line of c.message.split("\n")) {
      const value = trailerValue(line);
      if (value === null) continue;
      const angle = value.indexOf("<");
      const name = (angle < 0 ? value : value.slice(0, angle)).trim();
      problems.push(`${c.sha.slice(0, 7)} carries a co-author trailer (${name || "unnamed"}): reword it without the line`);
      break;
    }
  }
  return problems;
}

const SELF = new Set(["check-trailers.mjs", "check-trailers.test.mjs"]);

/** files: [{ path, text }] -> each non-comment line with the literal trailer name (a step name or a comment may say it). */
export function sourceProblems(files) {
  const problems = [];
  for (const f of files) {
    if (SELF.has(basename(f.path))) continue;
    f.text.split("\n").forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith("#") || t.startsWith("//") || t.startsWith("*") || t.startsWith("- name:")) return;
      if (t.toLowerCase().includes("co-authored-by")) problems.push(`${f.path}:${i + 1} writes a co-author trailer: remove the line (commits carry the bot identity only)`);
    });
  }
  return problems;
}

/** The workflow, script and tool files under the given paths (node_modules and .git skipped). */
export function collectSources(paths) {
  const out = [];
  const walk = (p) => {
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st) return;
    if (st.isDirectory()) {
      if (basename(p) === "node_modules" || basename(p) === ".git") return;
      for (const e of readdirSync(p)) walk(join(p, e));
    } else if (/\.(ya?ml|mjs|cjs|js|ts|sh)$/.test(p)) out.push({ path: p, text: readFileSync(p, "utf8") });
  };
  paths.forEach(walk);
  return out;
}

export function parseLog(raw) {
  return raw
    .split("\x1e")
    .map((r) => r.replace(/^\n/, ""))
    .filter(Boolean)
    .map((r) => {
      const [sha, ...rest] = r.split("\x00");
      return { sha, message: rest.join("\x00") };
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === "--sources") {
    const problems = sourceProblems(collectSources(args.slice(1)));
    for (const p of problems) console.log(`::error::${p}`);
    console.log(problems.length ? `${problems.length} writer(s) of a co-author trailer` : "no writer of a co-author trailer");
    process.exit(problems.length ? 1 : 0);
  }
  const [base, head] = args;
  const raw = execFileSync("/usr/bin/git", ["log", "--format=%H%x00%B%x1e", `${base}..${head}`], { encoding: "utf8" });
  const problems = trailerProblems(parseLog(raw));
  for (const p of problems) console.log(`::error::${p}`);
  console.log(problems.length ? `${problems.length} commit(s) with a co-author trailer` : "no co-author trailer");
  process.exit(problems.length ? 1 : 0);
}
