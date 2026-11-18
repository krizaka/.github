// WHY  A workflow token holds only what its job needs (krizaka-internal#4204, OpenSSF Scorecard Token-Permissions): without a top-level
//      `permissions:` the repository's default token decides, and a write nobody can explain is the first thing a reviewer must question.
// WHAT `tokenPermissionProblems(text)`: [{ line, why }] for one workflow. The top level is read-only: `permissions: {}`, `read-all`, or a
//      block whose every scope is `read` or `none` (what Scorecard scores 10); a job that needs more declares it on the job; each `write`
//      (or `write-all`) carries a comment saying why, on its line or the line above.
// HOW  Pure text reading, line by line, dependency-free; used by the conformance check `token-permissions` (scripts/conformance-checks.mjs).
//      Tests: tests/token-permissions.test.mjs.
// OWNER krizaka/.github (lane security).

/** The inline top-level values that grant nothing beyond reading. */
const READ_ONLY_INLINE = new Set(["{}", "read-all"]);
/** A top-level `permissions:` that grants nothing beyond reading: `{}`, `read-all`, or a block of `read` / `none` scopes. */
const readOnly = (block) => (block.inline === undefined ? block.rows.length > 0 && block.rows.every((r) => r.level !== "write") : READ_ONLY_INLINE.has(block.inline));
const keyAt = (indent) => new RegExp(String.raw`^ {${indent}}permissions:[ \t]*([^#\s][^#]*?)?[ \t]*(?:#(.*))?$`);
const ROW = /^\s+([\w-]+):\s*(none|read|write)\s*(?:#(.*))?$/;
const COMMENT = /^\s*#(.*)$/;
const said = (comment) => Boolean(comment?.trim());
const indentOf = (line) => /^ */.exec(line)[0].length;
const isTopLevelKey = (line) => /^\S/.test(line) && !line.startsWith("#");

/** The `permissions:` at `indent` on line `i`: { inline, why, rows: [{ scope, level, why, line }] }, or null when line `i` is not one. */
function permissionsAt(lines, i, indent) {
  const m = keyAt(indent).exec(lines[i]);
  if (!m) return null;
  const block = { inline: m[1]?.trim(), why: said(m[2]), line: i + 1, rows: [] };
  if (block.inline?.replace(/\s/g, "") === "{}") block.inline = "{}";
  const flow = /^\{(.*)\}$/.exec(block.inline ?? "");
  if (block.inline !== "{}" && flow) {
    // `{ contents: read, issues: write } # why`: the same rows on one line, the trailing comment explains them.
    block.inline = undefined;
    for (const entry of flow[1].split(",")) {
      const row = /^\s*([\w-]+):\s*(none|read|write)\s*$/.exec(entry);
      if (row) block.rows.push({ scope: row[1], level: row[2], why: block.why, line: i + 1 });
    }
    return block;
  }
  let above = false;
  for (let j = i + 1; j < lines.length && (lines[j].trim() === "" || indentOf(lines[j]) > indent); j++) {
    const comment = COMMENT.exec(lines[j]);
    const row = !comment && ROW.exec(lines[j]);
    if (row) block.rows.push({ scope: row[1], level: row[2], why: said(row[3]) || above, line: j + 1 });
    above = Boolean(comment) && said(comment[1]);
  }
  return block;
}

/** The jobs of a workflow with their own `permissions:` (two-space job keys under the top-level `jobs:`, the job's keys at four). */
function jobBlocks(lines) {
  const from = lines.findIndex((l) => /^jobs:\s*(#.*)?$/.test(l));
  const jobs = [];
  if (from < 0) return jobs;
  for (let i = from + 1; i < lines.length && !isTopLevelKey(lines[i]); i++) {
    const name = /^ {2}([\w-]+):\s*(#.*)?$/.exec(lines[i])?.[1];
    if (name) jobs.push({ name, block: null });
    const own = jobs.length > 0 && permissionsAt(lines, i, 4);
    if (own) jobs.at(-1).block = own;
  }
  return jobs;
}

/** The writes of a job's block that nobody explains. */
function unexplainedWrites(name, block) {
  if (block.inline === "write-all") return block.why ? [] : [{ line: block.line, why: `job \`${name}\`: write-all without a comment saying why` }];
  return block.rows
    .filter((r) => r.level === "write" && !r.why)
    .map((r) => ({ line: r.line, why: `job \`${name}\`: ${r.scope}: write without a comment saying why` }));
}

/** The problems of one workflow text: [{ line, why }], [] when it complies. */
export function tokenPermissionProblems(text) {
  const lines = text.split("\n");
  const problems = [];
  const top = lines.map((_, i) => permissionsAt(lines, i, 0)).find(Boolean);
  if (!top) problems.push({ line: 1, why: "no top-level permissions: declare `permissions: {}` (or `read-all`) and the minimum per job" });
  else if (!readOnly(top)) problems.push({ line: top.line, why: "top-level permissions are not read-only ({}, read-all or read scopes): move each write onto the job that needs it" });
  for (const job of jobBlocks(lines)) {
    if (job.block) problems.push(...unexplainedWrites(job.name, job.block));
  }
  return problems;
}
