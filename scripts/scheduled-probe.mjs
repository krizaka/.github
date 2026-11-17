// WHY  Monitoring lives in DigitalOcean (alerts of the app spec) and Grafana (Synthetic Monitoring) only (krizaka-internal#4151, founder 2026-11-17): a scheduled workflow whose only job probes a live URL duplicates them, and its red runs are noise nobody reads.
// WHAT `probeOnlyJobs(text)`: the jobs of a scheduled workflow, when every job only probes a live URL (curl / wget on an http(s) address, nothing else of substance); [] otherwise.
// HOW  Pure text reading, dependency-free; used by the conformance check `scheduled-probe-only` (scripts/conformance-checks.mjs). Tests: tests/scheduled-probe.test.mjs.
// OWNER krizaka/.github (lane security).

const PROBE =
  /\b(?:curl|wget)\b[^\n]*(?:https?:\/\/|\$\{\{\s*(?:vars|env|inputs)\.[\w-]*(?:url|host)[\w-]*\s*\}\})/i;
/** A step that does real work: a build, a tool of the org, a deployment, a write to GitHub. A probe never needs them. */
const WORK =
  /\b(?:gh|git|doctl|docker|npm|npx|pnpm|node|python3?|krizaka-[\w-]+|kubectl|terraform|mvn|gradle)\b/;
/** The actions a probe may still use (a checkout, a toolchain): any other `uses:` is work. */
const NEUTRAL_USES = /^(?:actions\/(?:checkout|setup-[\w-]+))@/;
/** Workflow keys that carry no command (their values are words, not shell). */
const KEY_LINE =
  /^\s*(?:-\s*)?(?:uses|with|name|id|if|env|timeout-minutes|runs-on|permissions|environment|persist-credentials):.*$/gm;

const scheduled = (text) =>
  /^on:\s*(?:#.*)?\n(?:(?: {2,}.*|\s*)\n)*? {2}schedule:/m.test(text) ||
  /^on:\s*\[[^\]]*\bschedule\b/m.test(text);

/** The jobs of a workflow text: [{ name, body }] (two-space keys under the top-level `jobs:`). */
function jobsOf(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^jobs:\s*(#.*)?$/.test(l));
  if (start < 0) return [];
  const jobs = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S/.test(l) && !l.startsWith("#")) break;
    const head = /^ {2}([A-Za-z0-9_-]+):\s*(#.*)?$/.exec(l);
    if (head) jobs.push({ name: head[1], body: [] });
    else jobs.at(-1)?.body.push(l);
  }
  return jobs.map((j) => ({ name: j.name, body: j.body.join("\n") }));
}

function onlyProbes(body) {
  const uses = [...body.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
  if (uses.some((u) => !NEUTRAL_USES.test(u))) return false;
  const commands = body
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  return (
    PROBE.test(commands) &&
    !WORK.test(commands.replace(KEY_LINE, "").replace(PROBE, ""))
  );
}

/** The jobs that make a scheduled workflow a probe: all of them probe, none does anything else. [] when the workflow is not one. */
export function probeOnlyJobs(text) {
  if (!scheduled(text)) return [];
  const jobs = jobsOf(text);
  return jobs.length > 0 && jobs.every((j) => onlyProbes(j.body))
    ? jobs.map((j) => j.name)
    : [];
}
