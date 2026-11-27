// The data stores and machine services a repository runs, read from its files (krizaka-internal#4547, ADR-027 § 7). A model must
// bind every one of them, as it binds every unit; the binding is the element's `covers` metadata. Pure: files in, sorted facts out.

/** The kinds of machine fact, declared once. */
export const MACHINE_KINDS = ["store", "database", "job", "service"];

/** A new `undocumented` machine fact blocks a verdict only when this is true: flip it once krizaka-agents' C2 names them (krizaka-internal#4549). */
export const MACHINE_BLOCKING = false;

const TEST_DIR = /(?:^|\/)(?:node_modules|fixtures?|tests?|__tests__)\//;
const TEST_FILE = /\.(?:test|spec)\.[a-z]+$/;
const LOCK_PATH = /(?:(?:^|\/)package-lock\.json|\.lock)$/;
const IGNORE_FILE = /(?:^|\/)\.[\w-]*ignore$/;
const MODEL_FILE = /\.c4$/;
const DOC_FILE = /\.mdx?$/;
/** The closed set of file paths no machine fact is read from: tests, lockfiles, ignore files, models and prose docs. */
export const IGNORED_SOURCES = Object.freeze([TEST_DIR, TEST_FILE, LOCK_PATH, IGNORE_FILE, MODEL_FILE, DOC_FILE]);
/** A data file name in a string literal or path, never a bare property access or dotted identifier. */
const STORE_FILE = /(?<=["'`/])([A-Za-z][\w-]*\.(?:db|sqlite3?))(?![\w.-])/g;
const DATABASE_URL = /\b((?:[A-Z][A-Z0-9]*_)*(?:DATABASE|DB)_URL)\b/g;
const LAUNCH_LABEL = /\b(com\.krizaka\.[a-z][a-z0-9-]*)\.plist\b/g;
const RUNNER_LABEL = /\b(actions\.runner\.[\w.-]*\w)/g;
/** The credential rotation tools: one job each, under `tools/`. */
const ROTATION_TOOL = /^tools\/(credential[-_](?:age|rotate))(?:\.(?:py|sh|mjs))?$/;
/** A scratch store of a test helper (`ops-test.db`, `test-events.db`). */
const TEST_STORE = /(?:^|[-_.])tests?[-_.]/;
/** A line building a throw-away file inside a temporary directory. */
const SCRATCH_LINE = /\b(?:mkdtemp|TemporaryDirectory)\b|\bjoin\(\s*(?:tmp|tmpdir|tempdir|sandbox)\b/i;
const INSTALL_FILE = /(?:^|\/)install\.json$/;

const byString = (a, b) => Number(a > b) - Number(a < b);
const fact = (kind, name, path, detail = "") => ({ kind, name, path, detail });
const stripLabel = (label) => label.replace(/^com\.krizaka\./, "");

/** Compiled LikeC4 diagram JSON (e.g. from `@krizaka/architecture`): its element ids are diagram nodes, not data files. */
function isDiagramJson(path, text) {
  if (!path.endsWith(".json") || !text.includes('"likec4"')) {
    return false;
  }
  try {
    const data = JSON.parse(text);
    return typeof data?.tool?.likec4 === "string";
  } catch {
    return false;
  }
}

const isSkipped = (path, text) => IGNORED_SOURCES.some((source) => source.test(path)) || isDiagramJson(path, text);

function scan(text, pattern) {
  return [...text.matchAll(pattern)].map((m) => m[1]);
}

function scanStores(text) {
  return text
    .split("\n")
    .filter((line) => !SCRATCH_LINE.test(line))
    .flatMap((line) => scan(line, STORE_FILE))
    .filter((name) => !TEST_STORE.test(name));
}

function installFacts(path, text) {
  let install;
  try {
    install = JSON.parse(text);
  } catch {
    return [];
  }
  const jobs = (install.crons?.entries ?? []).map((c) => fact("job", c.id, path, `cron ${c.schedule ?? ""}`.trim()));
  const services = (install.launchAgents ?? []).map((a) => {
    const port = (a.args ?? []).join(" ").match(/--port\s+(\d+)/)?.[1];
    const label = a.label ?? a.id;
    return fact("service", stripLabel(label), path, port ? `LaunchAgent ${label}, port ${port}` : `LaunchAgent ${label}`);
  });
  return [...jobs, ...services];
}

function patternFacts(path, text) {
  const stores = scanStores(text).map((n) => fact("store", n, path, "data file"));
  const databases = scan(text, DATABASE_URL).map((n) => fact("database", n, path, "external database connection"));
  const agents = scan(text, LAUNCH_LABEL).map((l) => fact("service", stripLabel(l), path, `LaunchAgent ${l}`));
  const runners = scan(text, RUNNER_LABEL).map((l) => fact("service", l, path, "self-hosted runner LaunchAgent"));
  return [...stores, ...databases, ...agents, ...runners];
}

function rotationFact(path) {
  const m = ROTATION_TOOL.exec(path);
  return m ? [fact("job", m[1].replace(/_/g, "-"), path, "credential rotation tool")] : [];
}

/** Every machine fact of a repository's files (path → text), one per (kind, name), the first source kept, sorted. */
export function machineFactsOf(files) {
  const found = new Map();
  for (const [path, text] of files) {
    if (isSkipped(path, text)) continue;
    const facts = [...(INSTALL_FILE.test(path) ? installFacts(path, text) : []), ...patternFacts(path, text), ...rotationFact(path)];
    for (const f of facts) if (!found.has(`${f.kind}:${f.name}`)) found.set(`${f.kind}:${f.name}`, f);
  }
  return [...found.values()].sort((a, b) => byString(`${a.kind}:${a.name}`, `${b.kind}:${b.name}`));
}

/** The names a model element claims in its `covers` metadata: `name` or `kind:name`, separated by commas or spaces. */
export function coversOf(element) {
  const text = element.metadata?.covers;
  return typeof text === "string" ? text.split(/[\s,]+/).filter(Boolean) : [];
}

export const isCovered = (f, covers) => covers.some((c) => c === f.name || c === `${f.kind}:${f.name}`);
