// Commit identities are an allow-list (founder 2026-11-04, krizaka-internal#2433): a made-up e-mail in a `Co-authored-by:` line once
// listed a stranger as an akinaza contributor (2026-10-31). Now no e-mail can be invented: the author, the committer and every
// co-author trailer must be in scripts/commit-identities.json (the Krizaka apps' bots and the founder). Nothing else passes; a
// refused e-mail is masked in the output. The local hooks of krizaka-agents read the same file, pinned to the same sha.
// Run by security-scan.yml on pull requests (the PR's commits) and in the merge queue (the squash commit itself).
//   node scripts/check-trailers.mjs [--squash] <base-sha> <head-sha>   (--squash: merge queue, GitHub's noreply trailer of an allowed account passes)
// It also refuses the WRITERS of a trailer that do not name an allowed identity on the line (a workflow or script).
//   node scripts/check-trailers.mjs --sources <dir-or-file>...
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The trailer's line when `line` is one (case-insensitive, leading blanks allowed), else null. Plain string work: no backtracking. */
function trailerValue(line) {
  const text = line.trimStart();
  const colon = text.indexOf(":");
  if (colon < 0 || text.slice(0, colon).trimEnd().toLowerCase() !== "co-authored-by") return null;
  return text.slice(colon + 1);
}

/** The allow-list of scripts/commit-identities.json: Sets of lower-case e-mails, plus the accounts (login, id) for GitHub's squash trailers. */
export function loadIdentities(file = fileURLToPath(new URL("./commit-identities.json", import.meta.url))) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const accounts = [...raw.bots, ...raw.humans];
  const emails = new Set(accounts.flatMap((a) => a.emails.map((e) => e.toLowerCase())));
  const committerOnly = new Set((raw.committerOnly ?? []).map((e) => e.toLowerCase()));
  return { emails, committerOnly, accounts };
}

/** An e-mail that is not in the list is never echoed in full: first letter only. */
export function maskEmail(email) {
  const e = email.trim();
  return e ? `${e[0]}***@***` : "(empty)";
}

/** « <id>+<login>@users.noreply.github.com » or « <login>@users.noreply.github.com » of an allowed account (GitHub's squash trailers). */
function isAllowedNoreply(email, { accounts }) {
  const m = /^(?:(\d+)\+)?([^@\s]+)@users\.noreply\.github\.com$/i.exec(email.trim());
  if (!m) return false;
  return accounts.some((a) => a.login.toLowerCase() === m[2].toLowerCase() && (m[1] === undefined || Number(m[1]) === a.id));
}

/** The e-mail inside « Name <email> », or "" when there is none. */
function trailerEmail(value) {
  const open = value.indexOf("<");
  const close = value.lastIndexOf(">");
  return open < 0 || close < open ? "" : value.slice(open + 1, close).trim();
}

/**
 * commits: [{ sha, message, author?, committer? }] -> the offending ones. A `Co-authored-by:` trailer passes only for an allowed
 * e-mail (in the merge queue, `squash`: also the noreply address of an allowed account); the author and committer e-mails are
 * checked against the same list. A refused e-mail is masked in the output.
 */
export function trailerProblems(commits, { squash = false, identities = loadIdentities() } = {}) {
  const inList = (e, committer = false) =>
    identities.emails.has(e.toLowerCase()) || (committer && identities.committerOnly.has(e.toLowerCase()));
  const trailerOk = (e) => e !== "" && (inList(e) || (squash && isAllowedNoreply(e, identities)));
  const problems = [];
  for (const c of commits) {
    const sha = c.sha.slice(0, 7);
    if (c.author !== undefined && !inList(c.author)) problems.push(`${sha} author e-mail ${maskEmail(c.author)} is not in ${LIST}`);
    if (c.committer !== undefined && !inList(c.committer, true)) problems.push(`${sha} committer e-mail ${maskEmail(c.committer)} is not in ${LIST}`);
    const emails = c.message.split("\n").map(trailerValue).filter((v) => v !== null).map(trailerEmail);
    for (const e of emails.filter((e) => !trailerOk(e))) {
      problems.push(`${sha} co-author trailer with e-mail ${maskEmail(e)} is not in ${LIST}: reword the line with an allowed identity or remove it`);
    }
  }
  return problems;
}

const LIST = "scripts/commit-identities.json";

/** The e-mail-looking words of a line, quotes, angle brackets and trailing punctuation removed. Plain string work: no backtracking. */
function emailsOf(line) {
  return line
    .split(/[\s<>"']+/)
    .filter((w) => w.includes("@"))
    .map((w) => {
      let end = w.length;
      while (end > 0 && ".,;)\\".includes(w[end - 1])) end--;
      return w.slice(0, end);
    });
}

const SELF = new Set(["check-trailers.mjs", "check-trailers.test.mjs"]);

/** files: [{ path, text }] -> each non-comment line with the literal trailer name that does not carry an allowed e-mail (a step name or a comment may say it). */
export function sourceProblems(files, identities = loadIdentities()) {
  const problems = [];
  for (const f of files) {
    if (SELF.has(basename(f.path))) continue;
    f.text.split("\n").forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith("#") || t.startsWith("//") || t.startsWith("*") || t.startsWith("- name:")) return;
      if (!t.toLowerCase().includes("co-authored-by")) return;
      const emails = emailsOf(line);
      if (emails.length === 0 || emails.some((e) => !identities.emails.has(e.toLowerCase()))) {
        problems.push(`${f.path}:${i + 1} writes a co-author trailer without an identity of scripts/commit-identities.json on the line`);
      }
    });
  }
  return problems;
}

/** A git committing-identity set in a workflow or script: `user.email`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_EMAIL`. */
const IDENTITY_KEY = /user\.email|GIT_(?:AUTHOR|COMMITTER)_EMAIL/i;
/** A GitHub-noreply address anywhere on a line: `<id>+<login>@users.noreply.github.com` or the bare `<login>@…`. */
const NOREPLY = /(?:(\d+)\+)?([A-Za-z0-9._%[\]-]+)@users\.noreply\.github\.com/gi;

/**
 * files: [{ path, text }] -> each line that sets a git author/committer e-mail to the GitHub-noreply of an
 * allow-listed login but NOT its exact e-mail (the bare, prefix-less or wrong-id form). A direct author or committer
 * needs the `<id>+<login>@users.noreply.github.com` of scripts/commit-identities.json; the bare form only ever passes
 * as a squash-merge co-author trailer, so an automation that commits with it is refused by the commit check above —
 * the whole org at once (krizaka/akinaza#691, the propagate-pins fan-out, 2026-11-05). This catches that at the
 * source. An unknown login (a bot not on the list) is a different matter, left to the commit check; a non-noreply
 * e-mail is none of this guard's business.
 */
export function committerSourceProblems(files, identities = loadIdentities()) {
  const known = new Set(identities.accounts.map((a) => a.login.toLowerCase()));
  const problems = [];
  for (const f of files) {
    if (SELF.has(basename(f.path)) || /\.test\.[cm]?js$/.test(f.path)) continue;
    f.text.split("\n").forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith("#") || t.startsWith("//") || t.startsWith("*")) return;
      if (!IDENTITY_KEY.test(line)) return;
      for (const m of line.matchAll(NOREPLY)) {
        if (!known.has(m[2].toLowerCase())) continue;
        if (!identities.emails.has(m[0].toLowerCase())) {
          problems.push(`${f.path}:${i + 1} commits as ${m[2]} but not with its allow-listed e-mail (a direct author or committer needs the id+login form of ${LIST})`);
        }
      }
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

/** git log --format=%H%x00%ae%x00%ce%x00%B%x1e -> [{ sha, author, committer, message }] */
export function parseLog(raw) {
  return raw
    .split("\x1e")
    .map((r) => r.replace(/^\n/, ""))
    .filter(Boolean)
    .map((r) => {
      const [sha, author, committer, ...rest] = r.split("\x00");
      return { sha, author, committer, message: rest.join("\x00") };
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === "--sources") {
    const files = collectSources(args.slice(1));
    const problems = [...sourceProblems(files), ...committerSourceProblems(files)];
    for (const p of problems) console.log(`::error::${p}`);
    console.log(problems.length ? `${problems.length} script(s) or workflow(s) name an identity outside the allow-list` : "no script or workflow names an identity outside the allow-list");
    process.exit(problems.length ? 1 : 0);
  }
  const squash = args[0] === "--squash";
  const [base, head] = squash ? args.slice(1) : args;
  const raw = execFileSync("/usr/bin/git", ["log", "--format=%H%x00%ae%x00%ce%x00%B%x1e", `${base}..${head}`], { encoding: "utf8" });
  const problems = trailerProblems(parseLog(raw), { squash });
  for (const p of problems) console.log(`::error::${p}`);
  console.log(problems.length ? `${problems.length} identity problem(s) in the commits` : "every author, committer and co-author is in the allow-list");
  process.exit(problems.length ? 1 : 0);
}
