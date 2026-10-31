// No co-author trailer in any commit (founder 2026-10-31): a made-up e-mail in a `Co-authored-by:` line made GitHub list a
// stranger as an akinaza contributor. The krizaka-agents app is the only author; no AI, bot or human trailer.
// Run by security-scan.yml on pull requests (the PR's commits) and in the merge queue (the squash commit itself).
//   node scripts/check-trailers.mjs <base-sha> <head-sha>
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TRAILER = /^\s*co-authored-by\s*:/im;

/** commits: [{ sha, message }] → the offending ones, with the trailer's name only (the e-mail is never echoed). */
export function trailerProblems(commits) {
  return commits
    .filter((c) => TRAILER.test(c.message))
    .map((c) => {
      const line = c.message.split("\n").find((l) => TRAILER.test(l)) ?? "";
      const name = line.replace(/^\s*co-authored-by\s*:\s*/i, "").replace(/<[^>]*>/, "").trim();
      return `${c.sha.slice(0, 7)} carries a co-author trailer (${name || "unnamed"}): reword it without the line`;
    });
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
  const [base, head] = process.argv.slice(2);
  const raw = execFileSync("git", ["log", "--format=%H%x00%B%x1e", `${base}..${head}`], {
    encoding: "utf8",
    // Fixed system directories only, never a search path inherited from the caller (Sonar S4036).
    env: { ...process.env, PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin" },
  });
  const problems = trailerProblems(parseLog(raw));
  for (const p of problems) console.log(`::error::${p}`);
  console.log(problems.length ? `${problems.length} commit(s) with a co-author trailer` : "no co-author trailer");
  process.exit(problems.length ? 1 : 0);
}
