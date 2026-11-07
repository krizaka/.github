// Reads a GitHub workflow, workflow template or composite action with a real YAML parser: what starts it (events, cron
// schedules), what it uses (actions, reusable workflows), the shell it runs (`run:` blocks), the scripts of `github-script`
// steps and every string it holds (the text callers are looked for in).
import YAML from "yaml";

const isObject = (v) => v !== null && typeof v === "object";

function triggersOf(doc) {
  const on = doc.on ?? doc[true];
  if (typeof on === "string") return { events: [on], schedules: [] };
  if (Array.isArray(on)) return { events: on.map(String), schedules: [] };
  if (!isObject(on)) return { events: [], schedules: [] };
  return { events: Object.keys(on), schedules: (on.schedule ?? []).map((s) => s.cron).filter(Boolean) };
}

/** Every string value of a parsed document, in order. */
export function stringsOf(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringsOf(v, out));
  else if (isObject(value)) Object.values(value).forEach((v) => stringsOf(v, out));
  return out;
}

function stepsOf(doc) {
  const jobs = Object.values(doc.jobs ?? {}).filter(isObject);
  return [...jobs.flatMap((job) => job.steps ?? []), ...(doc.runs?.steps ?? [])].filter(isObject);
}

/** { name, events, schedules, uses, runs, scripts, jobs, strings, error } of a workflow or action file. */
export function workflowInfo(text) {
  let doc;
  try {
    doc = YAML.parse(text);
  } catch (error) {
    return { error: String(error.message).slice(0, 160), events: [], schedules: [], uses: [], runs: [], scripts: [], jobs: 0, strings: [] };
  }
  if (!isObject(doc)) return { error: "empty", events: [], schedules: [], uses: [], runs: [], scripts: [], jobs: 0, strings: [] };
  const { events, schedules } = triggersOf(doc);
  const steps = stepsOf(doc);
  const jobs = Object.values(doc.jobs ?? {}).filter(isObject);
  return {
    name: doc.name ?? "",
    events,
    schedules,
    uses: [...jobs.map((j) => j.uses), ...steps.map((s) => s.uses)].filter(Boolean).map(String),
    runs: [...steps.map((s) => s.run), doc.runs?.main ? `node ${doc.runs.main}` : null].filter(Boolean).map(String),
    scripts: steps.filter((s) => String(s.uses ?? "").includes("github-script") && s.with?.script).map((s) => String(s.with.script)),
    jobs: jobs.length,
    strings: stringsOf(doc),
  };
}

/** Where a `uses:` value points inside the org: { repo, kind: "workflow" | "action", path } or null (a third-party action). */
export function usesTarget(uses, ownRepo, org = "krizaka") {
  if (uses.startsWith("./")) {
    const path = uses.slice(2).split("@")[0];
    return path.startsWith(".github/workflows/") ? { repo: ownRepo, kind: "workflow", path } : { repo: ownRepo, kind: "action", path: path.startsWith(".github/") ? path.slice(".github/".length) : path };
  }
  const [location] = uses.split("@");
  const parts = location.split("/");
  if (parts[0] !== org || parts.length < 3) return null;
  const repo = parts[1];
  const rest = parts.slice(2).join("/");
  if (rest.startsWith(".github/workflows/")) return { repo, kind: "workflow", path: rest };
  if (rest.startsWith(".github/actions/")) return { repo, kind: "action", path: rest.slice(".github/".length) };
  return rest.startsWith("actions/") || repo === ".github" ? { repo, kind: "action", path: rest } : null;
}
