// WHY  A job that calls a reusable workflow cannot get more `permissions:` than its caller grants: GitHub refuses the whole run
//      (`startup_failure`, 0 jobs, no log) when the called job asks for more. « Bump @krizaka packages » never ran in any consumer
//      for that reason (krizaka-internal#3342); this reads the two sides and says it before the merge.
// WHAT `callerPermissionProblems(path, text, readReusable)`: the problems of one caller workflow; pure, the called file is passed in.
// HOW  Imported by scripts/conformance-checks.mjs (the check `caller-permissions`). Tests: tests/caller-permissions.test.mjs.
// OWNER krizaka/.github (lane platform).

const LEVEL = { none: 0, read: 1, write: 2 };
/** The reusable workflows judged: those of the org's own repositories (same list as the `workflow-calls` check). */
const USES = /^ {4}uses:\s*krizaka\/([\w.-]+)\/\.github\/workflows\/([\w.-]+\.ya?ml)@([^\s#]+)/;

/** A `permissions:` value at `indent` starting at line `i`: { perms, next } where perms is { scope: level } (`*` for read-all / write-all) or undefined. */
function permissionsAt(lines, i, indent) {
  const m = new RegExp(`^ {${indent}}permissions:\\s*([^#\\s][^#]*?)?\\s*(#.*)?$`).exec(lines[i]);
  if (!m) return null;
  const inline = m[1]?.trim();
  if (inline === "{}") return { perms: {}, next: i + 1 };
  if (inline === "read-all" || inline === "write-all") return { perms: { "*": inline.slice(0, -4) }, next: i + 1 };
  const perms = {};
  let j = i + 1;
  for (; j < lines.length; j++) {
    const row = new RegExp(`^ {${indent + 2}}([\\w-]+):\\s*(none|read|write)\\s*(#.*)?$`).exec(lines[j]);
    if (!row) break;
    perms[row[1]] = row[2];
  }
  return { perms, next: j };
}

/** { top, jobs: [{ name, perms, uses }] } of a workflow text: the workflow-level permissions and, per job, its own and what it calls. */
export function shapeOf(text) {
  const lines = text.split("\n");
  let top;
  const jobs = [];
  let inJobs = false;
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^jobs:\s*(#.*)?$/.test(l)) { inJobs = true; continue; }
    if (/^\S/.test(l) && !l.startsWith("#")) {
      inJobs = false;
      const p = permissionsAt(lines, i, 0);
      if (p) { top = p.perms; i = p.next - 1; }
      continue;
    }
    if (!inJobs) continue;
    const job = /^ {2}([\w-]+):\s*(#.*)?$/.exec(l);
    if (job) { cur = { name: job[1], perms: undefined, uses: null }; jobs.push(cur); continue; }
    if (!cur) continue;
    const p = permissionsAt(lines, i, 4);
    if (p) { cur.perms = p.perms; i = p.next - 1; continue; }
    const u = USES.exec(l);
    if (u) cur.uses = { repo: u[1], file: u[2], ref: u[3] };
  }
  return { top, jobs };
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
