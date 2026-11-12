// The facts of the org, read from main (ADR-027 § 5). The current state of each repository is @krizaka/architecture's (the one
// generator: its units with their org dependencies and versions, its C4 levels); this module only JOINS across repositories:
// the publisher of each dependency, the latest tags, behind or not. Pure: the sources (files and tag names at one commit) come
// in, a sorted object goes out.
import { buildC4FromFiles, unitsOf } from "@krizaka/architecture";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const CALVER = /^(\d{4})\.(\d{2})\.(\d{2})(?:\.(\d+))?$/;
const BOM = "com.krizaka:krizaka-bom";
const PARENT = "com.krizaka:krizaka-parent";
const byString = (a, b) => Number(a > b) - Number(a < b);

/** The numeric parts of a plain version (`1.2.3`, `v1.2.3`, `2026.11.06.4`), or null. */
export function versionParts(version) {
  const plain = String(version ?? "").replace(/^v/, "");
  const m = SEMVER.exec(plain) ?? CALVER.exec(plain);
  return m ? m.slice(1).map((part) => Number(part ?? 0)) : null;
}

/** Numeric order of two plain versions (null last). */
export function compareParts(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
}

/** A tag split into its package (`@krizaka/ui` for `@krizaka/ui@3.90.1`, null for `v1.2.3`) and its version. */
export function tagOf(tag) {
  const at = tag.lastIndexOf("@");
  const pkg = at > 0 ? tag.slice(0, at) : null;
  const version = at > 0 ? tag.slice(at + 1) : tag;
  const parts = versionParts(version);
  return parts ? { tag, package: pkg, version: version.replace(/^v/, ""), parts } : null;
}

const tagUrl = (repo, tag) => `https://github.com/krizaka/${repo}/releases/tag/${encodeURIComponent(tag)}`;

function highest(tags) {
  return tags.reduce((best, t) => (best === null || compareParts(t.parts, best.parts) > 0 ? t : best), null);
}

/** The latest tag of the repository (a plain or calendar version) and of each package tagged `<package>@<version>`. */
export function latestTags(repo, names) {
  const tags = names.map(tagOf).filter(Boolean);
  const plain = highest(tags.filter((t) => t.package === null));
  const byPackage = new Map();
  for (const t of tags.filter((x) => x.package !== null)) {
    const best = byPackage.get(t.package);
    if (!best || compareParts(t.parts, best.parts) > 0) byPackage.set(t.package, t);
  }
  const shape = (t) => (t ? { name: t.tag, version: t.version, url: tagUrl(repo, t.tag) } : null);
  const packages = Object.fromEntries([...byPackage].sort(([a], [b]) => byString(a, b)).map(([p, t]) => [p, shape(t)]));
  const newest = plain ?? highest([...byPackage.values()].filter((t) => CALVER.test(t.version)));
  return { repo: shape(newest), packages };
}

const key = (ecosystem, name) => `${ecosystem}:${name}`;

/** Every published org package of every repository: `ecosystem:name` → { repo, path, version }. */
export function publishedIndex(repos) {
  const index = new Map();
  for (const repo of repos) {
    for (const unit of repo.units) {
      if (unit.published && !index.has(key(unit.ecosystem, unit.name))) index.set(key(unit.ecosystem, unit.name), { repo: repo.name, path: unit.path, version: unit.version });
    }
  }
  return index;
}

/** The krizaka-bom (or else krizaka-parent) version a Maven unit inherits through its parents, across repositories. */
function inheritedFamilyVersion(unit, unitsById, depth = 0) {
  if (!unit || depth > 8) return null;
  const pin = unit.dependsOn.find((d) => d.name === BOM && d.have) ?? unit.dependsOn.find((d) => d.name === PARENT && d.have);
  if (pin) return pin.have;
  const parent = unit.dependsOn.find((d) => d.parent);
  return parent ? inheritedFamilyVersion(unitsById.get(parent.name), unitsById, depth + 1) : null;
}

/** The latest tag of a published package: its own `<package>@x` tag, else its repository's plain tag. */
function latestOfPackage(publisher, tags) {
  if (!publisher) return null;
  const own = tags.get(publisher.repo);
  return own?.packages[publisher.name] ?? own?.repo ?? null;
}

function resolveDep(dep, unit, ctx) {
  const publisher = ctx.index.get(key(dep.ecosystem, dep.name));
  const named = publisher ? { ...publisher, name: dep.name } : null;
  let have = dep.have;
  if (!have && dep.ecosystem === "maven" && publisher?.repo === "krizaka-java") have = inheritedFamilyVersion(unit, ctx.unitsById);
  const latest = latestOfPackage(named, ctx.tags);
  const behind = Boolean(have && latest && versionParts(have) && versionParts(latest.version) && compareParts(versionParts(have), versionParts(latest.version)) < 0);
  return { ...dep, have: have ?? null, repo: publisher?.repo ?? null, path: publisher?.path ?? null, latest: latest?.version ?? null, latestTag: latest?.name ?? null, latestUrl: latest?.url ?? null, behind };
}

/** A level of @krizaka/architecture without its file lists (the counts stay): what the cockpit draws as the generated view. */
const slim = (level) => ({
  nodes: level.nodes.map(({ files, ...node }) => node),
  edges: level.edges.map(({ files, ...edge }) => edge),
});

/** The repository's C4 levels as @krizaka/architecture generates them from its files (context, containers, components). */
function generatedC4(source) {
  const c4 = buildC4FromFiles(source.files, { name: source.name });
  return { schema: c4.schema, context: slim(c4.levels.context), containers: slim(c4.levels.containers), components: slim(c4.levels.components) };
}

/**
 * The facts of the org from its sources: [{ name, commit, committedAt, files: Map, tags: [names] }] and the registry rows
 * (repos.json). Returns { repos, packages } sorted by name, every dependency resolved to its publisher.
 */
export function factsOf(sources, registry) {
  const rowOf = new Map(registry.map((r) => [r.name, r]));
  const read = sources
    .map((s) => ({ name: s.name, commit: s.commit, committedAt: s.committedAt, units: unitsOf(s.files), c4: generatedC4(s), tagNames: s.tags ?? [], paths: [...s.files.keys()] }))
    .sort((a, b) => byString(a.name, b.name));
  const tags = new Map(read.map((r) => [r.name, latestTags(r.name, r.tagNames)]));
  const index = publishedIndex(read);
  const unitsById = new Map(read.flatMap((r) => r.units.filter((u) => u.ecosystem === "maven").map((u) => [u.name, u])));
  const ctx = { index, tags, unitsById };
  const repos = read.map((r) => {
    const row = rowOf.get(r.name) ?? {};
    return {
      name: r.name,
      url: `https://github.com/krizaka/${r.name}`,
      commit: r.commit,
      committedAt: r.committedAt,
      owner: row.owner ?? null,
      kind: row.kind ?? null,
      visibility: row.visibility ?? null,
      role: row.role ?? null,
      latestTag: tags.get(r.name).repo,
      languages: [...new Set(r.units.map((u) => u.language))].sort(byString),
      units: r.units.map((u) => ({ ...u, dependsOn: u.dependsOn.map((d) => resolveDep(d, u, ctx)) })),
      c4: r.c4,
    };
  });
  const packages = Object.fromEntries(
    [...index].sort(([a], [b]) => byString(a, b)).map(([k, p]) => [k, { ...p, latest: latestOfPackage({ ...p, name: k.slice(k.indexOf(":") + 1) }, tags) }]),
  );
  return { repos, packages, paths: new Map(read.map((r) => [r.name, r.paths])) };
}
