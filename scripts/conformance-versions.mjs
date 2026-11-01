// Are the family versions current? (krizaka-internal#879) The conformance matrix reads, per repository, the @krizaka/*
// ranges of its package.json files and the krizaka-parent / krizaka-bom versions of its root pom.xml, and compares them
// with what is published: npm for @krizaka/*, the latest release of krizaka-build for the Java family. A repository is
// behind when the first version after its pin has been out longer than the grace (default 7 days): the bump never happened.
const SIMPLE = /^(?:\^|~|>=)?(\d+\.\d+\.\d+)$/;
const DAY = 86_400_000;
const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/** Code-unit order (Sonar S2871). */
const byName = (a, b) => Number(a.name > b.name) - Number(a.name < b.name);

/** "0.19.0" from "^0.19.0", "~0.19.0", ">=0.19.0" or "0.19.0"; null for workspace:, tags, git or complex ranges. */
export const baseVersion = (range) => SIMPLE.exec(String(range).trim())?.[1] ?? null;

/** Numeric order of two plain versions. */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** The @krizaka/* pins of one package.json text: { ecosystem, name, have } sorted by name. */
export function npmPins(text) {
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    return [];
  }
  const out = new Map();
  for (const field of DEP_FIELDS) {
    for (const [name, range] of Object.entries(pkg?.[field] ?? {})) {
      const have = name.startsWith("@krizaka/") ? baseVersion(range) : null;
      if (have && (!out.has(name) || compareVersions(have, out.get(name)) < 0)) out.set(name, have);
    }
  }
  return [...out].map(([name, have]) => ({ ecosystem: "npm", name, have })).sort(byName);
}

/** The Java family pins of a pom.xml: krizaka-parent, krizaka-bom (literal or through a property), `krizaka.version`. */
export function mavenPins(pom) {
  const props = Object.fromEntries([...pom.matchAll(/<([\w.-]+\.version)>([^<]+)<\/\1>/g)].map((m) => [m[1], m[2].trim()]));
  const resolve = (v) => {
    const ref = /^\$\{([\w.-]+)\}$/.exec(v.trim());
    const value = ref ? props[ref[1]] : v.trim();
    return value && SIMPLE.test(value) ? value : null;
  };
  const out = new Map();
  for (const m of pom.matchAll(/<artifactId>(krizaka-parent|krizaka-bom)<\/artifactId>\s*<version>([^<]+)<\/version>/g)) {
    const have = resolve(m[2]);
    if (have) out.set(m[1], have);
  }
  if (!out.has("krizaka-bom") && props["krizaka.version"] && SIMPLE.test(props["krizaka.version"])) out.set("krizaka-bom", props["krizaka.version"]);
  return [...out].map(([name, have]) => ({ ecosystem: "maven", name, have })).sort(byName);
}

/** When the pin became late: the publication of the first version after it (`times`), else of the latest. */
function overdueSince(have, { version, publishedAt, times = {} }) {
  const newer = Object.entries(times)
    .filter(([v]) => SIMPLE.test(v) && compareVersions(v, have) > 0 && compareVersions(v, version) <= 0)
    .map(([, at]) => at)
    .sort((a, b) => Number(a > b) - Number(a < b));
  return newer[0] ?? publishedAt;
}

/** The pins older than a version published more than `graceDays` ago. `latest` is keyed `<ecosystem>:<name>`:
 * { version, publishedAt, times? } where `times` maps every published version to its date. */
export function behind(pins, latest, { now, graceDays = 7 }) {
  const out = [];
  for (const pin of pins) {
    const l = latest[`${pin.ecosystem}:${pin.name}`];
    if (!l?.version || compareVersions(pin.have, l.version) >= 0) continue;
    const days = Math.floor((now - Date.parse(overdueSince(pin.have, l))) / DAY);
    if (days >= graceDays) out.push({ ...pin, latest: l.version, days });
  }
  return out;
}

/** Green when nothing is behind; the reason names each late pin. */
export function versionsVerdict(late) {
  if (late.length === 0) return { ok: true, why: "" };
  const list = late.map((p) => `${p.name} ${p.have} < ${p.latest} (published ${p.days} days ago)`).join(", ");
  return { ok: false, why: `the bump never landed: ${list}` };
}

/** The versions section of the matrix: per repository, what it pins and what is behind. */
export function renderVersions(byRepo) {
  const lines = ["| repo | family versions | behind |", "|---|---|---|"];
  for (const [repo, { pins, behind: late }] of Object.entries(byRepo)) {
    if (pins.length === 0) continue;
    const have = pins.map((p) => `${p.name} ${p.have}`).join(", ");
    const lateText = late.length ? late.map((p) => `${p.name} ${p.have} → ${p.latest}`).join(", ") : "current";
    lines.push(`| ${repo} | ${have} | ${lateText} |`);
  }
  return lines.join("\n");
}

/** The latest published version of each family artefact, fetched once per run. */
const cache = new Map();
export async function latestOf({ ecosystem, name }, api) {
  const key = `${ecosystem}:${name}`;
  if (!cache.has(key)) cache.set(key, fetchLatest(ecosystem, name, api));
  return cache.get(key);
}

async function fetchLatest(ecosystem, name, api) {
  if (ecosystem === "maven") {
    // krizaka-parent and krizaka-bom are released together by krizaka-build (one version, ADR-021).
    const releases = ((await api("/repos/krizaka/krizaka-build/releases?per_page=50")) ?? []).filter((r) => !r.draft && !r.prerelease);
    const times = Object.fromEntries(releases.map((r) => [String(r.tag_name).replace(/^\D+/, ""), r.published_at]).filter(([v]) => SIMPLE.test(v)));
    const version = Object.keys(times).sort(compareVersions).at(-1);
    return version ? { version, publishedAt: times[version], times } : null;
  }
  const res = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2F")}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;
  const doc = await res.json();
  const version = doc["dist-tags"]?.latest;
  return version ? { version, publishedAt: doc.time?.[version], times: doc.time ?? {} } : null;
}

/** All the pins of a snapshot: every package.json (no node_modules) and the root pom.xml. */
export async function pinsOf(snap, ecosystems = ["npm", "maven"]) {
  const pins = new Map();
  if (ecosystems.includes("npm")) {
    for (const path of snap.paths.filter((p) => /(^|\/)package\.json$/.test(p) && !p.includes("node_modules")).slice(0, 60)) {
      for (const pin of npmPins((await snap.read(path)) ?? "")) {
        const prev = pins.get(`npm:${pin.name}`);
        if (!prev || compareVersions(pin.have, prev.have) < 0) pins.set(`npm:${pin.name}`, pin);
      }
    }
  }
  if (ecosystems.includes("maven") && snap.paths.includes("pom.xml")) {
    for (const pin of mavenPins((await snap.read("pom.xml")) ?? "")) pins.set(`maven:${pin.name}`, pin);
  }
  return [...pins.values()];
}
