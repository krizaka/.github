#!/usr/bin/env node
// Regenerates the generated block of profile/README.md (between `<!-- generated:start -->` and `<!-- generated:end -->`):
// the products, with their status, their COMPONENTS (each repository or app of the product, with its language and the Krizaka
// modules it uses by ecosystem: npm @krizaka/*, Maven com.krizaka:*, Rust krizaka-* crates, Python krizaka packages, version used
// against the latest), the dev and prod environments (a health check each), and the open stack's latest versions.
// Dependency-free, like check-seo-family.mjs.
//
// Everything is read when it runs, nothing is typed: the components' repositories (package.json, pom.xml, Cargo.toml, requirements,
// the Java BOM property) and their languages through the GitHub API, the latest versions from npm, GitHub Packages, the git tags of
// the Rust kit and PyPI, the component list and hosts from profile/products.json, the health of each
// host from its /api/healthz. A prod host that does not answer is « not open yet » (no link) until it does; then the link
// appears by itself. Nothing else of the README is touched.
//
//   node scripts/profile-readme.mjs            # rewrite the block
//   node scripts/profile-readme.mjs --check    # exit 1 when the block is out of date (reads the same sources)
//   node scripts/profile-readme.mjs --print    # print the block, write nothing
//
// GH_TOKEN (the GitHub App token in CI; it needs Packages: read for the Java versions) is read from the environment.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const START = "<!-- generated:start — scripts/profile-readme.mjs reads this from the registries and the health checks; do not edit -->";
export const END = "<!-- generated:end -->";
export const MARKS_CDN = "https://krizaka-assets.b-cdn.net/brand";
const BLUE = "3e76a8";

// ---------------------------------------------------------------------------------------------------------------- versions

const VERSION = /(\d{1,9})\.(\d{1,9})\.(\d{1,9})([\w.+-]*)/;

/** The first version of a range (`^0.12.0` → `0.12.0`); a non-semver spec (`workspace:*`, `catalog:`) gives null. */
export function versionOf(spec) {
  const m = /^[^\d]{0,4}(\d{1,9}\.\d{1,9}\.\d{1,9}[\w.+-]*)$/.exec(String(spec ?? "").split("||")[0].trim().split(/\s+/)[0] ?? "");
  return m ? m[1] : null;
}

export function compareVersions(a, b) {
  const pa = VERSION.exec(a);
  const pb = VERSION.exec(b);
  for (let i = 1; i <= 3; i++) if (Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) - Number(pb[i]);
  return comparePreRelease(pa[4], pb[4]);
}

/** A release outranks any pre-release tag; two tags compare as text. */
function comparePreRelease(a, b) {
  if (a === b) return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  return a < b ? -1 : 1;
}

/** The highest stable version of a list (no `-SNAPSHOT`, no pre-release tag), or null. */
export function latestStable(versions) {
  const stable = versions.filter((v) => /^\d+\.\d+\.\d+$/.test(v));
  return stable.length ? stable.reduce((a, b) => (compareVersions(a, b) >= 0 ? a : b)) : null;
}

/** The @krizaka/* packages of some package.json files with the version each one uses (the highest when files disagree);
 *  the packages the files themselves define are the repository's own, not dependencies. */
export function collectKrizakaDeps(manifests) {
  const own = new Set(manifests.map((m) => m.name).filter(Boolean));
  const used = new Map();
  for (const m of manifests) {
    for (const block of [m.dependencies, m.devDependencies, m.optionalDependencies]) {
      for (const [name, spec] of Object.entries(block ?? {})) {
        const v = versionOf(spec);
        if (!name.startsWith("@krizaka/") || own.has(name) || !v) continue;
        if (!used.has(name) || compareVersions(v, used.get(name)) > 0) used.set(name, v);
      }
    }
  }
  return [...used].sort(([a], [b]) => a.localeCompare(b)).map(([name, version]) => ({ name, used: version }));
}

/** The text of a `<property>x.y.z</property>` of a pom, or null. */
export function pomProperty(xml, property) {
  const name = property.replaceAll(".", String.raw`\.`);
  const m = new RegExp(String.raw`<${name}>\s*([^<\s]+)\s*</${name}>`).exec(xml);
  return m ? m[1] : null;
}


/** The highest version per name of several `{ name, used }` lists, sorted by name. */
export function mergeHighest(lists) {
  const used = new Map();
  for (const { name, used: v } of lists.flat()) if (!used.has(name) || compareVersions(v, used.get(name)) > 0) used.set(name, v);
  return [...used].sort(([a], [b]) => a.localeCompare(b)).map(([name, version]) => ({ name, used: version }));
}

/** The `com.krizaka:*` modules a pom depends on; a module without a `<version>` is managed by the BOM, so it uses `bomVersion`. */
export function parseMavenDeps(xml, bomVersion) {
  const found = [];
  for (const m of xml.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
    const group = /<groupId>\s*([^<\s]+)\s*<\/groupId>/.exec(m[1])?.[1];
    const name = /<artifactId>\s*([^<\s]+)\s*<\/artifactId>/.exec(m[1])?.[1];
    if (group !== "com.krizaka" || !name) continue;
    const raw = /<version>\s*([^<\s]+)\s*<\/version>/.exec(m[1])?.[1];
    const prop = /^\$\{([^}]+)\}$/.exec(raw ?? "")?.[1];
    const used = prop ? pomProperty(xml, prop) : (raw ?? bomVersion);
    if (used && VERSION.test(used) && !used.endsWith("SNAPSHOT")) found.push({ name, used });
  }
  return mergeHighest([found]);
}

const KRIZAKA_RUST = /^(krizaka-[\w-]+|[\w-]*-krizaka(-[\w-]+)?)$/;

/** The `krizaka-*` crates of a Cargo.toml with the version used (the git tag when there is one, else the version) and the
 *  repository their git source points at (where the latest tag is read). A path-only crate is the workspace's own. */
export function parseCargoDeps(text) {
  const found = [];
  for (const line of text.split("\n")) {
    const m = /^\s*([\w-]+)\s*=\s*(\S.*)$/.exec(line);
    if (!m || !KRIZAKA_RUST.test(m[1])) continue;
    const value = m[2];
    const raw = /\btag\s*=\s*"v?([^"]+)"/.exec(value)?.[1] ?? /\bversion\s*=\s*"([^"]+)"/.exec(value)?.[1] ?? /^"([^"]+)"/.exec(value.trim())?.[1];
    const used = versionOf(raw);
    const repo = /\bgit\s*=\s*"https:\/\/github\.com\/([^"/]+\/[^"/.]+)/.exec(value)?.[1] ?? null;
    if (used) found.push({ name: m[1], used, repo });
  }
  return found;
}

/** The krizaka packages pinned in a requirements file or a pyproject (`krizaka-x==1.2.3`, `>=`, `~=`). */
export function parsePythonDeps(text) {
  const found = [];
  for (const m of text.matchAll(/(?:^|["'\s])((?:krizaka|sovkora)[\w.-]*)\s*(?:==|>=|~=|\^)\s*(\d+\.\d+\.\d+[\w.+-]*)/gim)) found.push({ name: m[1].toLowerCase().replaceAll("_", "-"), used: m[2] });
  return mergeHighest([found]);
}

// ---------------------------------------------------------------------------------------------------------------- languages

/** What is not a programming language of a component (markup, styles, config, shell glue). */
const NOT_A_LANGUAGE = new Set(["CSS", "SCSS", "HTML", "Dockerfile", "Shell", "Makefile", "HCL", "PLpgSQL", "MDX", "Batchfile", "Nix"]);
const LANGUAGE_BY_EXTENSION = { ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", rs: "Rust", java: "Java", kt: "Kotlin", py: "Python", swift: "Swift" };
// The usual colours of the languages (GitHub linguist); an unknown language is grey.
const LANGUAGE_COLORS = { TypeScript: "3178c6", JavaScript: "f1e05a", Rust: "dea584", Java: "b07219", Python: "3572a5", Kotlin: "a97bff", Swift: "f05138" };
const SECOND_LANGUAGE_SHARE = 0.1;

/** Bytes per language of the files under `prefix` in a git tree (a monorepo's app has no languages API of its own). */
export function treeLanguageBytes(tree, prefix = "") {
  const bytes = {};
  const base = prefix ? `${prefix.replace(/\/$/, "")}/` : "";
  for (const t of tree) {
    if (t.type !== "blob" || !t.path.startsWith(base) || /(^|\/)(node_modules|\.venv|target|dist)\//.test(t.path)) continue;
    const language = LANGUAGE_BY_EXTENSION[t.path.split(".").pop()];
    if (language) bytes[language] = (bytes[language] ?? 0) + (t.size ?? 0);
  }
  return bytes;
}

/** The main language of a component, and the second when it is a real part of it (at least a tenth of the first). */
export function mainLanguages(bytes) {
  const ranked = Object.entries(bytes).filter(([name, n]) => !NOT_A_LANGUAGE.has(name) && n > 0).sort(([, a], [, b]) => b - a);
  if (!ranked.length) return [];
  const [[first, top], second] = ranked;
  return second && second[1] >= top * SECOND_LANGUAGE_SHARE ? [first, second[0]] : [first];
}

export const languageBadge = (name) => `![${name}](https://img.shields.io/badge/${encodeURIComponent(name).replaceAll("-", "--")}-${LANGUAGE_COLORS[name] ?? "lightgrey"})`;

/** The manifests of a git tree under a path, by ecosystem. */
export function manifestPaths(tree, prefix = "") {
  const base = prefix ? `${prefix.replace(/\/$/, "")}/` : "";
  const kinds = { npm: /(^|\/)package\.json$/, maven: /(^|\/)pom\.xml$/, rust: /(^|\/)Cargo\.toml$/, python: /(^|\/)(requirements[\w.-]*\.(txt|in)|pyproject\.toml)$/ };
  const out = { npm: [], maven: [], rust: [], python: [] };
  for (const t of tree) {
    if (t.type !== "blob" || !t.path.startsWith(base) || /(^|\/)(node_modules|\.venv|target|dist)\//.test(t.path)) continue;
    for (const [kind, re] of Object.entries(kinds)) if (re.test(t.path)) out[kind].push(t.path);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- health

/** An environment is up only when its health endpoint answers 200 with `{ "status": "ok" }` (a parked or wildcard host does not). */
export function readHealth(status, body) {
  if (status !== 200) return { up: false };
  try {
    const j = JSON.parse(body);
    return j?.status === "ok" ? { up: true, version: typeof j.version === "string" ? j.version : "" } : { up: false };
  } catch {
    return { up: false };
  }
}

// ---------------------------------------------------------------------------------------------------------------- render

/** A shields.io static badge (`-` and `_` doubled, spaces as `_`, the rest percent-encoded). */
export function badgeUrl(label, message, color) {
  const esc = (s) => encodeURIComponent(String(s).replaceAll("-", "--").replaceAll("_", "__").replaceAll(" ", "_"));
  return `https://img.shields.io/badge/${esc(label)}-${esc(message)}-${color}`;
}
const img = (alt, label, message, color) => `![${alt}](${badgeUrl(label, message, color)})`;
const link = (inner, url) => (url ? `[${inner}](${url})` : inner);

export function statusLabel(data, product) {
  const label = data.statuses[product.status];
  if (!label) throw new Error(`${product.name}: status « ${product.status} » is not in profile/products.json statuses (an opened product is a decision, not a default)`);
  return label;
}

const npmUrl = (name) => `https://www.npmjs.com/package/${name}`;

/** One module: the version used, green when it is the latest, orange when behind, grey when the latest is unknown. */
export function depBadge({ name, used, latest }, { label, url } = {}) {
  const shown = label ?? name.replace("@krizaka/", "");
  const alt = `${name} ${used}${latestNote(used, latest)}`;
  return link(img(alt, shown, used, freshnessColor(used, latest)), url ?? npmUrl(name));
}

/** green: the latest; orange: behind; grey: the latest is unknown. */
function freshnessColor(used, latest) {
  if (!latest) return "lightgrey";
  return used === latest ? "brightgreen" : "orange";
}

function latestNote(used, latest) {
  if (!latest) return "";
  return latest === used ? " (latest)" : ` (latest ${latest})`;
}

export function envBadge(kind, env) {
  const name = kind === "dev" ? "Dev" : "Prod";
  if (!env.up) {
    // A prod host that does not answer is not an outage: the product is not open yet (ADR-022), so no link to a dead host.
    if (kind === "prod") return img("Prod: not open yet", "prod", "not open yet", "lightgrey");
    const down = img(`${name}: down`, kind, "down", "red");
    return link(down, `https://${env.host}`);
  }
  const label = env.version ? `up · ${env.version}` : "up";
  return link(img(`${name}: up ${env.version}`, kind, label, "brightgreen"), `https://${env.host}`);
}

const markUrl = (id, theme, v) => {
  const query = v ? `?v=${v}` : "";
  return `${MARKS_CDN}/${id}/mark-${theme}.svg${query}`;
};

const ECOSYSTEMS = [
  { id: "npm", label: "npm", url: (org, m) => npmUrl(m.name), shown: (m) => m.name.replace("@krizaka/", "") },
  { id: "maven", label: "Maven", url: (org, m) => `https://github.com/orgs/${org}/packages/maven/package/com.krizaka.${m.name}`, shown: (m) => m.name },
  { id: "rust", label: "Rust", url: (org, m) => (m.repo ? `https://github.com/${m.repo}` : undefined), shown: (m) => m.name },
  { id: "python", label: "Python", url: (org, m) => `https://pypi.org/project/${m.name}/`, shown: (m) => m.name },
];

function moduleLines(org, modules) {
  const lines = [];
  for (const eco of ECOSYSTEMS) {
    const list = modules?.[eco.id] ?? [];
    if (list.length) lines.push(`<sub>${eco.label} (${list.length})</sub> ${list.map((m) => depBadge(m, { label: eco.shown(m), url: eco.url(org, m) })).join(" ")}`);
  }
  return lines.length ? lines.join("<br>") : "—";
}

const cell = (text) => text.replaceAll("|", String.raw`\|`);

/** One tier: its components, one line each: name · language · repository · its Krizaka modules. */
function renderTier(data, tier, components) {
  const rows = ["| Component | Language | Repository | Krizaka modules (used) |", "| :--- | :--- | :--- | :--- |"];
  for (const c of components) {
    const langs = c.languages.length ? c.languages.map(languageBadge).join(" ") : "—";
    const tree = c.path ? `/tree/HEAD/${c.path}` : "";
    const repo = `[${c.repo}](https://github.com/${data.organization}/${c.repo}${tree})`;
    rows.push(`| ${cell(c.label)} | ${langs} | ${repo} | ${cell(moduleLines(data.organization, c.modules))} |`);
  }
  return `**${tier.label}**\n\n${rows.join("\n")}`;
}

/** The components of a product grouped by tier, in the order of `data.tiers`; a tier no component has is left out. */
export function renderComponents(data, components) {
  const known = new Set(data.tiers.map((t) => t.id));
  for (const c of components) if (!known.has(c.tier)) throw new Error(`${c.label}: tier « ${c.tier} » is not in profile/products.json tiers`);
  const groups = data.tiers.map((t) => [t, components.filter((c) => c.tier === t.id)]).filter(([, list]) => list.length);
  const summary = `Components (${components.length}): clients, backend-for-frontend, services, workers · green is the latest, orange has a newer one`;
  return `<details><summary>${summary}</summary>\n\n${groups.map(([t, list]) => renderTier(data, t, list)).join("\n\n")}\n\n</details>`;
}

export function renderProduct(data, p, { marks = {} } = {}) {
  const mark = `<picture><source media="(prefers-color-scheme: dark)" srcset="${markUrl(p.id, "dark", marks.dark)}"><img src="${markUrl(p.id, "light", marks.light)}" alt="${p.name}" width="48"></picture>`;
  const links = [`[Repository](https://github.com/${data.organization}/${p.repo})`, envBadge("dev", p.dev), envBadge("prod", p.prod)];
  const lines = [`**${p.name}** · ${p.knowhow} &nbsp;<sup>${statusLabel(data, p)}</sup> · <sup>sign-up closed</sup><br>${p.proof}<br>${links.join(" · ")}`];
  if (p.components?.length) lines.push(renderComponents(data, p.components));
  return `<tr><td valign="top" width="64">${mark}</td><td valign="top">\n\n${lines.join("\n\n")}\n\n</td></tr>`;
}

export function renderStack(data, stack) {
  const rows = ["| Package | Latest |", "| :--- | :--- |"];
  for (const row of stack) {
    const badges = row.packages.map((pkg) => {
      const label = pkg.label ?? pkg.name;
      const url = pkg.registry === "npm" ? npmUrl(pkg.name) : `https://github.com/orgs/${data.organization}/packages/maven/package/${pkg.name}`;
      return link(img(`${label} ${pkg.latest ?? "unknown"}`, label, pkg.latest ? `v${pkg.latest}` : "unknown", pkg.latest ? BLUE : "lightgrey"), url);
    });
    rows.push(`| **[${row.name}](${row.url})**: ${row.about} | ${badges.join(" ")} |`);
  }
  return rows.join("\n");
}

export function renderBlock(data, model) {
  const products = model.products.map((p) => renderProduct(data, p, { marks: model.marks[p.id] }));
  return [
    START,
    `<table>\n${products.join("\n")}\n</table>`,
    "",
    "## The open stack",
    "",
    "What the products are built on, published for anyone to use. The versions are the latest published, read when this page was last generated.",
    "",
    renderStack(data, model.stack),
    END,
  ].join("\n");
}

export function replaceBlock(readme, block) {
  const a = readme.indexOf("<!-- generated:start");
  const b = readme.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error("profile/README.md has no generated:start / generated:end markers");
  return readme.slice(0, a) + block + readme.slice(b + END.length);
}

// ---------------------------------------------------------------------------------------------------------------- reading

/** The readers, with `fetchImpl` and the token injected so the tests never touch the network. */
export function makeReader(fetchImpl = fetch, token = "") {
  const get = async (url, headers = {}) => {
    try {
      const r = await fetchImpl(url, { headers: { "User-Agent": "krizaka-profile", ...headers }, signal: AbortSignal.timeout(15000), redirect: "follow" });
      return { status: r.status, text: await r.text() };
    } catch {
      return { status: 0, text: "" };
    }
  };
  const trees = new Map();
  const gh = (url, extra = {}) => get(url, { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra });
  const ghJson = async (url) => {
    const r = await gh(url);
    try {
      return r.status === 200 ? JSON.parse(r.text) : null;
    } catch {
      return null;
    }
  };
  return {
    async repoFile(org, repo, path) {
      const r = await gh(`https://api.github.com/repos/${org}/${repo}/contents/${path}`, { Accept: "application/vnd.github.raw+json" });
      return r.status === 200 ? r.text : null;
    },
    async repoPackageJsons(org, repo) {
      const tree = await ghJson(`https://api.github.com/repos/${org}/${repo}/git/trees/HEAD?recursive=1`);
      const paths = (tree?.tree ?? []).map((t) => t.path).filter((p) => /(^|\/)package\.json$/.test(p) && !p.includes("node_modules"));
      const out = [];
      for (const p of paths) {
        try {
          const text = await this.repoFile(org, repo, p);
          if (text) out.push(JSON.parse(text));
        } catch {
          /* a file that does not parse is not a dependency source */
        }
      }
      return out;
    },
    /** `{ version }`, `{ missing: true }` (404: not published) or `{}` (could not be read). */
    async npmLatest(name) {
      const r = await get(`https://registry.npmjs.org/${name.replaceAll("/", "%2f")}/latest`);
      if (r.status === 404) return { missing: true };
      try {
        return r.status === 200 ? { version: JSON.parse(r.text).version } : {};
      } catch {
        return {};
      }
    },
    /** The git tree of a repository (cached): `[{ path, type, size }]`. */
    async repoTree(org, repo) {
      const key = `${org}/${repo}`;
      if (!trees.has(key)) trees.set(key, ((await ghJson(`https://api.github.com/repos/${org}/${repo}/git/trees/HEAD?recursive=1`))?.tree ?? []));
      return trees.get(key);
    },
    async repoLanguages(org, repo) {
      return (await ghJson(`https://api.github.com/repos/${org}/${repo}/languages`)) ?? {};
    },
    /** The highest stable tag of a repository (`v0.3.0` → `0.3.0`), or null. */
    async gitTagLatest(slug) {
      const tags = await ghJson(`https://api.github.com/repos/${slug}/tags?per_page=100`);
      return Array.isArray(tags) ? latestStable(tags.map((t) => t.name.replace(/^v/, ""))) : null;
    },
    /** `{ version }`, `{ missing: true }` or `{}` like npmLatest. */
    async pypiLatest(name) {
      const r = await get(`https://pypi.org/pypi/${name}/json`);
      if (r.status === 404) return { missing: true };
      try {
        return r.status === 200 ? { version: JSON.parse(r.text).info.version } : {};
      } catch {
        return {};
      }
    },
    async githubMavenLatest(org, pkg) {
      const versions = await ghJson(`https://api.github.com/orgs/${org}/packages/maven/${pkg}/versions?per_page=100`);
      return Array.isArray(versions) ? latestStable(versions.map((v) => v.name)) : null;
    },
    async health(host, path) {
      const r = await get(`https://${host}${path}`);
      return readHealth(r.status, r.text);
    },
    async markHash(id, theme) {
      try {
        const r = await fetchImpl(markUrl(id, theme), { signal: AbortSignal.timeout(15000) });
        return r.ok ? createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex").slice(0, 10) : "";
      } catch {
        return "";
      }
    },
  };
}

/** The Krizaka modules of one component by ecosystem, each with its latest published version; a module that is not published
 *  (the repository's own workspace package, a path crate) is left out. */
async function readModules(files, ctx) {
  const { bomVersion } = ctx;
  const json = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  const npm = collectKrizakaDeps(files.npm.map(json).filter(Boolean));
  const maven = mergeHighest(files.maven.map((x) => parseMavenDeps(x, bomVersion)));
  const rustAll = files.rust.flatMap(parseCargoDeps);
  const rust = [...new Map(rustAll.map((d) => [d.name, d])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const python = mergeHighest(files.python.map(parsePythonDeps));
  const out = { npm: [], maven: [], rust: [], python: [] };
  for (const d of npm) {
    const latest = await ctx.latestOf(d.name);
    if (!latest.missing) out.npm.push({ ...d, latest: latest.version ?? null });
  }
  for (const d of maven) out.maven.push({ ...d, latest: await ctx.mavenLatestOf(`com.krizaka.${d.name}`) });
  for (const d of rust) out.rust.push({ ...d, latest: d.repo ? await ctx.tagLatestOf(d.repo) : null });
  for (const d of python) {
    const latest = await ctx.pypiLatestOf(d.name);
    if (!latest.missing) out.python.push({ ...d, latest: latest.version ?? null });
  }
  return out;
}

/** One component of a product: its tier, its languages (languages API for a whole repository, the git tree under a path),
 *  and its Krizaka modules, all read from its repository. */
export async function readComponent(def, ctx) {
  const { org, reader } = ctx;
  const tree = await reader.repoTree(org, def.repo);
  const bytes = def.path ? treeLanguageBytes(tree, def.path) : await reader.repoLanguages(org, def.repo);
  const paths = manifestPaths(tree, def.path ?? "");
  const files = { npm: [], maven: [], rust: [], python: [] };
  for (const kind of Object.keys(files)) {
    for (const path of paths[kind].slice(0, MAX_MANIFESTS)) {
      const text = await reader.repoFile(org, def.repo, path);
      if (text) files[kind].push(text);
    }
  }
  return { ...def, languages: mainLanguages(bytes), modules: await readModules(files, ctx) };
}

const MAX_MANIFESTS = 40;

async function readBom(def, org, reader) {
  if (!def.bom) return null;
  const pom = await reader.repoFile(org, def.bom.repo, def.bom.file);
  const used = pom ? pomProperty(pom, def.bom.property) : null;
  return { used };
}

async function readStackRow(row, org, reader, latestOf) {
  const packages = [];
  for (const pkg of row.packages) {
    const latest = pkg.registry === "npm" ? (await latestOf(pkg.name)).version ?? null : await reader.githubMavenLatest(org, pkg.name);
    packages.push({ ...pkg, latest });
  }
  return { ...row, packages };
}

/** Reads everything the block shows. */
export async function readModel(data, reader) {
  const org = data.organization;
  const latestCache = new Map();
  const latestOf = async (name) => {
    if (!latestCache.has(name)) latestCache.set(name, await reader.npmLatest(name));
    return latestCache.get(name);
  };
  const cached = (fn) => {
    const m = new Map();
    return async (k) => (m.has(k) ? m.get(k) : m.set(k, await fn(k)).get(k));
  };
  const mavenLatestOf = cached((pkg) => reader.githubMavenLatest(org, pkg));
  const tagLatestOf = cached((slug) => reader.gitTagLatest(slug));
  const pypiLatestOf = cached((name) => reader.pypiLatest(name));
  const health = async (e) => ({ host: e.host, ...(await reader.health(e.host, data.healthPath)) });
  const products = [];
  const marks = {};
  for (const id of data.order) {
    const def = data.products[id];
    const bom = await readBom(def, org, reader);
    const ctx = { org, reader, latestOf, bomVersion: bom?.used ?? null, mavenLatestOf, tagLatestOf, pypiLatestOf };
    const components = [];
    for (const c of def.components ?? []) components.push(await readComponent(c, ctx));
    const dev = await health(def.dev);
    const prod = await health(def.prod);
    products.push({ id, ...def, components, bom, dev, prod });
    marks[id] = { dark: await reader.markHash(id, "dark"), light: await reader.markHash(id, "light") };
  }
  const stack = [];
  for (const row of data.stack) stack.push(await readStackRow(row, org, reader, latestOf));
  return { products, stack, marks };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const data = JSON.parse(readFileSync(resolve(root, "profile/products.json"), "utf8"));
  const model = await readModel(data, makeReader(fetch, process.env.GH_TOKEN ?? ""));
  const block = renderBlock(data, model);
  if (process.argv.includes("--print")) return console.log(block);
  const file = resolve(root, "profile/README.md");
  const current = readFileSync(file, "utf8");
  const next = replaceBlock(current, block);
  if (process.argv.includes("--check")) {
    if (next !== current) {
      console.error("profile/README.md is out of date: run `node scripts/profile-readme.mjs`");
      process.exit(1);
    }
    return;
  }
  if (next !== current) writeFileSync(file, next);
  console.log(next === current ? "profile/README.md already up to date" : `profile/README.md updated (${model.products.length} products)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
