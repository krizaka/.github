// WHY  A job that calls a reusable workflow cannot get more `permissions:` than its caller grants: GitHub refuses the whole run
//      (`startup_failure`, 0 jobs, no log) when the called job asks for more. « Bump @krizaka packages » never ran in any consumer
//      for that reason (krizaka-internal#3342); this reads the two sides and says it before the merge.
// WHAT `callerPermissionProblems(path, text, readReusable)`: the problems of one caller workflow; pure, the called file is passed in.
// HOW  Imported by scripts/conformance-checks.mjs (the check `caller-permissions`). Tests: tests/caller-permissions.test.mjs.
// OWNER krizaka/.github (lane platform).

const LEVEL = { none: 0, read: 1, write: 2 };
/** The reusable workflows judged: those of the org's own repositories (same list as the `workflow-calls` check). */
const USES = /^ {4}uses:\s*krizaka\/([\w.-]+)\/\.github\/workflows\/([\w.-]+\.ya?ml)@([^\s#]+)/;

const permissionsKey = (indent) => new RegExp(String.raw`^ {${indent}}permissions:\s*([^#\s][^#]*?)?\s*(#.*)?$`);
const permissionRow = (indent) => new RegExp(String.raw`^ {${indent + 2}}([\w-]+):\s*(none|read|write)\s*(#.*)?$`);

/** A `permissions:` value at `indent` starting at line `i`: { perms, next } where perms is { scope: level } (`*` for read-all / write-all), or null when line `i` is not one. */
function permissionsAt(lines, i, indent) {
  const m = permissionsKey(indent).exec(lines[i]);
  if (!m) return null;
  const inline = m[1]?.trim();
  if (inline === "{}") return { perms: {}, next: i + 1 };
  if (inline === "read-all" || inline === "write-all") return { perms: { "*": inline.slice(0, -4) }, next: i + 1 };
  const perms = {};
  let j = i + 1;
  for (let row = permissionRow(indent).exec(lines[j] ?? ""); row; row = permissionRow(indent).exec(lines[j] ?? "")) {
    perms[row[1]] = row[2];
    j++;
  }
  return { perms, next: j };
}

/** The `jobs:` section of a workflow, job by job: [{ name, perms, uses }] (`perms` undefined when the job has none of its own). */
function jobsOf(lines) {
  const jobs = [];
  let cur = null;
  const from = lines.findIndex((l) => /^jobs:\s*(#.*)?$/.test(l)) + 1;
  if (from === 0) return jobs;
  let i = from;
  while (i < lines.length && !(/^\S/.test(lines[i]) && !lines[i].startsWith("#"))) {
    const name = /^ {2}([\w-]+):\s*(#.*)?$/.exec(lines[i])?.[1];
    const own = cur && permissionsAt(lines, i, 4);
    if (name) {
      cur = { name, perms: undefined, uses: null };
      jobs.push(cur);
    } else if (own) {
      cur.perms = own.perms;
    } else {
      const u = cur && USES.exec(lines[i]);
      if (u) cur.uses = { repo: u[1], file: u[2], ref: u[3] };
    }
    i = own ? own.next : i + 1;
  }
  return jobs;
}

/** { top, jobs } of a workflow text: the workflow-level permissions (undefined when none) and the jobs with their own and what they call. */
export function shapeOf(text) {
  const lines = text.split("\n");
  const top = lines.map((_, i) => permissionsAt(lines, i, 0)).find(Boolean)?.perms;
  return { top, jobs: jobsOf(lines) };
}

const grant = (perms, scope) => LEVEL[perms[scope] ?? perms["*"] ?? "none"];

/** What the jobs of a called workflow ask for, the highest level per scope: { scope: level }. A job with no `permissions:` of its own asks what the file asks. */
export function askedBy(text) {
  const { top, jobs } = shapeOf(text);
  const asked = {};
  for (const job of jobs) {
    for (const [scope, level] of Object.entries(job.perms ?? top ?? {})) {
      if (LEVEL[level] > (LEVEL[asked[scope]] ?? 0)) asked[scope] = level;
    }
  }
  return asked;
}

/** The problems of one caller workflow: each job that calls an org reusable workflow and grants less than the called jobs ask for. */
export async function callerPermissionProblems(path, text, readReusable) {
  const { top, jobs } = shapeOf(text);
  const problems = [];
  for (const job of jobs) {
    if (!job.uses) continue;
    const granted = job.perms ?? top;
    if (granted === undefined) continue; // no `permissions:` anywhere: the repository's default token decides, nothing to compare
    const called = await readReusable(job.uses.repo, job.uses.file, job.uses.ref);
    if (called === null || called === undefined) continue;
    for (const [scope, level] of Object.entries(askedBy(called))) {
      if (grant(granted, scope) < LEVEL[level]) {
        problems.push(`${path}: job \`${job.name}\` calls ${job.uses.file} which asks ${scope}: ${level}, but grants ${scope}: ${granted[scope] ?? granted["*"] ?? "none"} (the run would be a startup_failure)`);
      }
    }
  }
  return problems;
}
