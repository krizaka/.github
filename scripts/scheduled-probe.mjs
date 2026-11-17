// WHY  Monitoring lives in DigitalOcean (alerts of the app spec) and Grafana (Synthetic Monitoring) only (krizaka-internal#4151, founder 2026-11-17): a scheduled workflow whose only job probes a live URL duplicates them, and its red runs are noise nobody reads.
// WHAT `probeOnlyJobs(text)`: the jobs of a scheduled workflow, when every job only probes a live URL (curl / wget on an http(s) address, nothing else of substance); [] otherwise.
// HOW  Pure text reading, line by line, dependency-free; used by the conformance check `scheduled-probe-only` (scripts/conformance-checks.mjs). Tests: tests/scheduled-probe.test.mjs.
// OWNER krizaka/.github (lane security).

const FETCHER = /\b(?:curl|wget)\b/;
const ADDRESS = /https?:\/\/|\{\{\s*(?:vars|env|inputs)\./;
/** A step that does real work: a build, a tool of the org, a deployment, a write to GitHub. A probe never needs them. */
const WORK = /\b(?:gh|git|doctl|docker|npm|npx|pnpm|node|python3?|krizaka-[\w-]+|kubectl|terraform|mvn|gradle)\b/;
/** The actions a probe may still use (a checkout, a toolchain): any other `uses:` is work. */
const NEUTRAL_USES = /^actions\/(?:checkout|setup-[\w-]+)@/;
/** Workflow keys that carry no command (their values are words, not shell). */
const WORDS_ONLY = new Set(["uses", "with", "name", "id", "if", "env", "timeout-minutes", "runs-on", "permissions", "environment", "persist-credentials"]);

const keyOf = (line) => /^\s*(?:-\s*)?([\w-]+):/.exec(line)?.[1];
const isTopLevelKey = (line) => /^\S/.test(line) && !line.startsWith("#");

/** Does the `on:` block name a `schedule` trigger (block form, or inline list)? */
function scheduled(lines) {
  const start = lines.findIndex((l) => l.startsWith("on:"));
  if (start < 0) return false;
  if (/\bschedule\b/.test(lines[start])) return true;
  for (const l of lines.slice(start + 1)) {
    if (isTopLevelKey(l)) return false;
    if (/^ {2}schedule:/.test(l)) return true;
  }
  return false;
}

/** The jobs of a workflow: [{ name, lines }] (two-space keys under the top-level `jobs:`). */
function jobsOf(lines) {
  const start = lines.findIndex((l) => l.startsWith("jobs:"));
  if (start < 0) return [];
  const jobs = [];
  for (const l of lines.slice(start + 1)) {
    if (isTopLevelKey(l)) break;
    const name = /^ {2}([\w-]+):/.exec(l)?.[1];
    if (name) jobs.push({ name, lines: [] });
    else jobs.at(-1)?.lines.push(l);
  }
  return jobs;
}

const usesOf = (lines) => lines.filter((l) => keyOf(l) === "uses").map((l) => l.split("uses:")[1].trim());

function onlyProbes(lines) {
  if (usesOf(lines).some((u) => !NEUTRAL_USES.test(u))) return false;
  const commands = lines.filter((l) => !l.trim().startsWith("#") && !WORDS_ONLY.has(keyOf(l)));
  const probing = commands.filter((l) => FETCHER.test(l) && ADDRESS.test(l));
  const rest = commands.filter((l) => !probing.includes(l));
  return probing.length > 0 && !rest.some((l) => WORK.test(l));
}

/** The jobs that make a scheduled workflow a probe: all of them probe, none does anything else. [] when the workflow is not one. */
export function probeOnlyJobs(text) {
  const lines = text.split("\n");
  if (!scheduled(lines)) return [];
  const jobs = jobsOf(lines);
  return jobs.length > 0 && jobs.every((j) => onlyProbes(j.lines)) ? jobs.map((j) => j.name) : [];
}
