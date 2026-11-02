#!/usr/bin/env node
// Regenerates the generated block of profile/README.md (between `<!-- generated:start -->` and `<!-- generated:end -->`):
// the products, with their status, the @krizaka/* dependencies each one uses (version used against the latest), the dev and
// prod environments (a health check each), and the open stack's latest versions. Dependency-free, like check-seo-family.mjs.
//
// Everything is read when it runs, nothing is typed: the products' repositories (package.json, the Java BOM property) through
// the GitHub API, the latest versions from npm and GitHub Packages, the hosts from profile/products.json, the health of each
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

function depsDetails(deps) {
  const summary = `@krizaka/* it uses (${deps.length}): green is the latest, orange has a newer one`;
  return `<details><summary>${summary}</summary>\n\n${deps.join(" ")}\n\n</details>`;
}

/** One dependency: the version used, green when it is the latest, orange when behind, grey when the latest is unknown. */
export function depBadge({ name, used, latest }) {
  const alt = `${name} ${used}${latestNote(used, latest)}`;
  return link(img(alt, name.replace("@krizaka/", ""), used, freshnessColor(used, latest)), npmUrl(name));
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

export function renderProduct(data, p, { marks = {} } = {}) {
  const mark = `<picture><source media="(prefers-color-scheme: dark)" srcset="${markUrl(p.id, "dark", marks.dark)}"><img src="${markUrl(p.id, "light", marks.light)}" alt="${p.name}" width="48"></picture>`;
  const links = [`[Repository](https://github.com/${data.organization}/${p.repo})`, envBadge("dev", p.dev), envBadge("prod", p.prod)];
  const lines = [`**${p.name}** · ${p.knowhow} &nbsp;<sup>${statusLabel(data, p)}</sup> · <sup>sign-up closed</sup><br>${p.proof}<br>${links.join(" · ")}`];
  const deps = p.deps.map(depBadge);
  if (p.java) {
    const j = p.java;
    const note = j.latest && j.latest !== j.used ? ` (latest ${j.latest})` : "";
    const alt = `${j.label} ${j.used ?? "unknown"}${note}`;
    deps.push(link(img(alt, j.label, j.used ?? "unknown", j.used ? freshnessColor(j.used, j.latest) : "lightgrey"), `https://github.com/orgs/${data.organization}/packages/maven/package/${j.package}`));
  }
  if (deps.length) lines.push(depsDetails(deps));
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

/** The `@krizaka/*` dependencies a product uses, each with its latest published version (workspace-only ones are left out). */
async function readDeps(def, org, reader, latestOf) {
  const manifests = [];
  for (const repo of def.npm?.repos ?? [def.repo]) manifests.push(...(await reader.repoPackageJsons(org, repo)));
  const deps = [];
  for (const d of collectKrizakaDeps(manifests)) {
    const latest = await latestOf(d.name);
    if (latest.missing) continue; // not published to npm: the repository's own workspace package
    deps.push({ ...d, latest: latest.version ?? null });
  }
  return deps;
}

async function readJava(def, org, reader) {
  if (!def.java) return null;
  const pom = await reader.repoFile(org, def.java.repo, def.java.file);
  const used = pom ? pomProperty(pom, def.java.property) : null;
  return { label: def.java.label, package: def.java.package, used, latest: await reader.githubMavenLatest(org, def.java.package) };
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
  const health = async (e) => ({ host: e.host, ...(await reader.health(e.host, data.healthPath)) });
  const products = [];
  const marks = {};
  for (const id of data.order) {
    const def = data.products[id];
    const deps = await readDeps(def, org, reader, latestOf);
    const java = await readJava(def, org, reader);
    const dev = await health(def.dev);
    const prod = await health(def.prod);
    products.push({ id, ...def, deps, java, dev, prod });
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
