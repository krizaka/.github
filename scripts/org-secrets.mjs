// WHY  An org secret with `visibility: all` reaches every repository, the public ones too (audit finding A-10, krizaka-restricted#372).
//      Before a secret is scoped to the repositories that use it (slice 2), this says who uses each one, and the matrix fails a
//      repository that sees a secret it does not use. A wrong « unused » breaks a release once the secret is scoped: every doubt counts as used.
// WHAT Pure: `secretRefs`, `inheritCalls`, `secretUsage` (the usage of one repository), `seenBy`, `orgSecretVerdict`, `inventoryRows`, `renderInventory`.
// HOW  Imported by scripts/conformance-checks.mjs (the check `org-secret-scoped`) and scripts/org-secrets-inventory.mjs (the table).
//      Tests: tests/org-secrets.test.mjs. Names only: the API never returns a value and nothing here asks for one.
// OWNER krizaka/.github (lane security).

/** `secrets.NAME` or `secrets['NAME']`: a secret named in a workflow expression. */
const SECRET_REF = /\bsecrets\.([A-Za-z_]\w*)|\bsecrets\[\s*['"]([A-Za-z_]\w*)['"]\s*\]/g;
/** A lookup the reader cannot name: `secrets[expr]` or `toJSON(secrets)`. */
const DYNAMIC_REF = /\bsecrets\[\s*(?!['"])|toJSON\(\s*secrets\s*\)/;
/** GitHub's own token: never an org secret. */
const BUILT_IN = new Set(["GITHUB_TOKEN"]);
/** A reusable workflow: `owner/repo/.github/workflows/file.yml@ref`, or `./.github/workflows/file.yml` in the same repository. */
const REUSABLE = /^(?:([\w.-]+\/[\w.-]+)|\.)\/\.github\/workflows\/([\w.-]+\.ya?ml)(?:@([^\s"'#]+))?$/;
const ORG_PREFIX = "krizaka/";

/** The secrets a text names, with their line, and the first lookup it cannot name (null when none). */
export function secretRefs(text) {
  const names = [];
  let dynamic = null;
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(SECRET_REF)) {
      const name = (m[1] ?? m[2]).toUpperCase();
      if (!BUILT_IN.has(name)) names.push({ name, line: i + 1 });
    }
    if (!dynamic && DYNAMIC_REF.test(line)) dynamic = `line ${i + 1}: a computed secrets lookup`;
  });
  return { names, dynamic };
}

const indentOf = (line) => line.length - line.trimStart().length;
const isBlank = (line) => line.trim() === "" || line.trimStart().startsWith("#");
const valueOf = (line, key) => new RegExp(String.raw`^\s*${key}:\s*["']?([^"'#\s]+)["']?\s*(?:#.*)?$`).exec(line)?.[1];
const callOf = (uses) => {
  const m = REUSABLE.exec(uses ?? "");
  return m ? { repo: m[1] ?? ".", file: m[2], ref: m[3] ?? null } : null;
};

/** The jobs of a workflow: [{ job, uses, inherit }] from the keys at the job's own indent (a step's `uses:` is deeper). */
function jobsOf(lines) {
  const from = lines.findIndex((l) => /^jobs:\s*(?:#.*)?$/.test(l)) + 1;
  if (from === 0) return [];
  const body = lines.slice(from).filter((l) => !isBlank(l));
  const end = body.findIndex((l) => indentOf(l) === 0);
  const rows = end < 0 ? body : body.slice(0, end);
  const jobIndent = rows.length ? indentOf(rows[0]) : 0;
  return rows.flatMap((line, i) => (indentOf(line) === jobIndent ? [jobAt(rows, i, jobIndent)] : []));
}

/** The job whose header is `rows[i]`: its `uses:` and whether it passes `secrets: inherit`. */
function jobAt(rows, i, jobIndent) {
  const job = { job: /^\s*([\w-]+):/.exec(rows[i])?.[1] ?? "?", uses: null, inherit: false };
  const keyIndent = indentOf(rows[i + 1] ?? "");
  for (let j = i + 1; j < rows.length && indentOf(rows[j]) > jobIndent; j++) {
    if (indentOf(rows[j]) !== keyIndent) continue;
    job.uses = valueOf(rows[j], "uses") ?? job.uses;
    if (valueOf(rows[j], "secrets") === "inherit") job.inherit = true;
  }
  return job;
}

/** The jobs that call a reusable workflow with `secrets: inherit`: [{ job, repo, file, ref }] (`repo` "." for the same repository).
    When the file says `secrets: inherit` and no job can be tied to it, every reusable call of the file counts as inherit. */
export function inheritCalls(text) {
  const lines = text.split("\n");
  const jobs = jobsOf(lines).map((j) => ({ ...j, call: callOf(j.uses) })).filter((j) => j.call);
  const tied = jobs.filter((j) => j.inherit);
  const saysInherit = lines.some((l) => valueOf(l, "secrets") === "inherit");
  const picked = tied.length === 0 && saysInherit ? callsAnywhere(lines) : tied;
  return picked.map((j) => ({ job: j.job, ...j.call }));
}

function callsAnywhere(lines) {
  return lines
    .map((l) => ({ job: "?", call: callOf(valueOf(l.replace(/^\s*-\s*/, ""), "uses")) }))
    .filter((j) => j.call);
}

/**
 * The org secrets one repository uses: `files` are its workflows and composite actions ({ path, text }); `readReusable(repo, file, ref)`
 * reads a reusable workflow of the org (null when it cannot). Returns { used: Map name → where (the file and line that prove it, through
 * the inherited calls), inherits: [{ path, job, target }], unknown: [why] }: an unknown makes every unproven secret « maybe used ».
 */
export async function secretUsage(files, readReusable) {
  const used = new Map();
  const inherits = [];
  const unknown = [];
  const note = (text, where) => {
    const refs = secretRefs(text);
    for (const r of refs.names) if (!used.has(r.name)) used.set(r.name, `${where}:${r.line}`);
    if (refs.dynamic) unknown.push(`${where} ${refs.dynamic}: every secret counted as used`);
  };
  const followed = new Set();
  const follow = async (call, via) => {
    const target = `${call.repo}/.github/workflows/${call.file}@${call.ref}`;
    if (!call.repo.startsWith(ORG_PREFIX)) return unknown.push(`${via}: secrets: inherit to ${target}, outside the org: every secret counted as used`);
    if (followed.has(target)) return;
    followed.add(target);
    let text = null;
    try {
      text = await readReusable(call.repo.slice(ORG_PREFIX.length), call.file, call.ref);
    } catch {
      text = null;
    }
    if (text === null) return unknown.push(`${via}: secrets: inherit to ${target}, which could not be read: every secret counted as used`);
    const chain = `${via} → ${target}`;
    note(text, chain);
    for (const nested of inheritCalls(text)) await follow(nested.repo === "." ? { ...nested, repo: call.repo, ref: call.ref } : nested, chain);
  };
  for (const { path, text } of [...files].sort((a, b) => (a.path < b.path ? -1 : Number(a.path > b.path)))) {
    note(text, path);
    for (const call of inheritCalls(text)) {
      if (call.repo === ".") continue; // the called file is one of `files`: already read
      inherits.push({ path, job: call.job, target: `${call.repo}/.github/workflows/${call.file}@${call.ref}` });
      await follow(call, path);
    }
  }
  return { used, inherits, unknown };
}

/** The org secrets a repository sees: `all` every repository, `private` the private and internal ones, `selected` the listed ones. */
export function seenBy(orgSecrets, repo) {
  return orgSecrets.filter((s) => s.visibility === "all" || (s.visibility === "private" && repo.private) || (s.visibility === "selected" && (s.repos ?? []).includes(repo.name)));
}

export const FIX = "fix = set the secret to selected repositories (slice 2 of krizaka-restricted#372)";

/** Red when the repository sees an org secret it does not use; unknown (never red) when a usage could not be read. */
export function orgSecretVerdict(seen, usage) {
  const idle = seen.map((s) => s.name.toUpperCase()).filter((n) => !usage.used.has(n));
  if (idle.length === 0) return { ok: true, why: "" };
  const why = `sees ${idle.length} org secret(s) it does not use: ${idle.join(", ")}; ${FIX}`;
  return usage.unknown.length ? { ok: null, why: `${why}; not judged: ${usage.unknown[0]}` } : { ok: false, why };
}

/** Per org secret: { name, visibility, users: [{ repo, where }], idle: [repo], unknown: [repo] } over `repos` = [{ name, seen: [secret name], usage }]. */
export function inventoryRows(orgSecrets, repos) {
  return orgSecrets.map((s) => {
    const row = { name: s.name, visibility: s.visibility, users: [], idle: [], unknown: [] };
    for (const r of repos.filter((x) => x.seen.includes(s.name))) {
      const where = r.usage.used.get(s.name.toUpperCase());
      if (where) row.users.push({ repo: r.name, where });
      else (r.usage.unknown.length ? row.unknown : row.idle).push(r.name);
    }
    return row;
  });
}

const userCell = (u) => `${u.repo} (\`${u.where}\`)`;
const cell = (items) => (items.length ? items.join("<br>") : "—");

/** The inventory as a Markdown table: names and files only. */
export function renderInventory(rows) {
  return [
    "| Secret | Visibility today | Used by (the file that proves it) | Sees it without using it | Not judged (counted as used) |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| \`${r.name}\` | ${r.visibility} | ${cell(r.users.map(userCell))} | ${cell(r.idle)} | ${cell(r.unknown)} |`),
  ].join("\n");
}
