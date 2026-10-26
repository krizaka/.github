#!/usr/bin/env node
// The registry of the org's repositories (repos.json, krizaka/.github#113): one row per repository with its owner, role,
// team, kind, deploy targets and archived flag. Generated, never edited by hand:
//   node scripts/gen-repos.mjs            rewrite repos.json from the GitHub API, the naming standard and deploy/apps.json
//   node scripts/gen-repos.mjs --check    print the drift between repos.json and what it would be now (read-only, exit 0)
// GITHUB_TOKEN (optional) raises the rate limit and shows the private repositories the token can read.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ORG = "krizaka";
const ROOT = new URL("../", import.meta.url);
export const KINDS = ["maven", "npm", "app", "site", "iac", "python", "rust", "none"];
export const PRODUCTS = ["akinaza", "orazaka", "yomizaka"];
/** Paused (2026-10-25): their repositories stay in the registry, private, under their own owner. */
export const PAUSED_PRODUCTS = ["kachizaka", "orochia", "yasakia", "yororis"];

/** The inventory table of docs/standards/repositories.md: name → { role, status, renameTo, foldInto }. */
export function parseStandard(markdown) {
  const section = markdown.slice(markdown.indexOf("## Current repository names"));
  const rows = new Map();
  for (const m of section.matchAll(/^\| `([^`]+)` \| ([^|]+?) \| ([^|]+?) \|$/gm)) {
    const status = m[3].replace(/\*\*/g, "").trim();
    rows.set(m[1], {
      role: m[2].trim(),
      status: status.replace(/`/g, ""),
      renameTo: /^Rename → `([^`]+)`/.exec(status)?.[1] ?? null,
      foldInto: /^Fold into `([^`]+)`/.exec(status)?.[1] ?? null,
    });
  }
  return rows;
}

/** The product a repository belongs to, or `krizaka` for the shared ones (templates and `.github` included). */
export function ownerOf(name) {
  return [...PRODUCTS, ...PAUSED_PRODUCTS].find((product) => name === product || name.startsWith(`${product}-`)) ?? ORG;
}

/** What the repository builds, from its root files first, then its topics, then its role in the standard. */
export function kindOf({ name, files = [], topics = [], role = "", deploy = [] }) {
  const has = (file) => files.includes(file);
  const node = has("package.json") || has("pnpm-workspace.yaml");
  if (has("pom.xml")) return "maven";
  if (files.some((file) => file.endsWith(".tf"))) return "iac";
  if (!node && (has("pyproject.toml") || has("requirements.txt"))) return "python";
  if (!node && has("Cargo.toml")) return "rust";
  if (node) {
    if (topics.includes("npm-package")) return "npm";
    const app = /^template-.+-app$/.test(name) || deploy.length > 0 || topics.some((t) => t === "nextjs" || t === "expo")
      || files.some((file) => file === "app.json" || /^next\.config\.(js|mjs|ts)$/.test(file));
    if (!app) return "npm";
    return ownerOf(name) === ORG && !name.startsWith("template-") ? "site" : "app";
  }
  if (/infrastructure/i.test(role)) return "iac";
  if (deploy.length > 0 || /^(Main product repository|Mobile app|Web app)$/.test(role)) return "app";
  return "none";
}

/** The default order of a sort, written out. */
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The registry, sorted by name. `repositories`: what the API lists ({ name, archived, private|visibility, topics });
 * `files`: name → root entries; `standard`: parseStandard(); `apps`: deploy/apps.json. A repository of the standard the
 * API does not show is kept, as private, with what the standard knows.
 */
export function buildRegistry({ repositories, files = {}, standard, apps }) {
  const listed = new Map(repositories.map((repository) => [repository.name, repository]));
  const names = [...new Set([...listed.keys(), ...standard.keys()])].sort(byCodePoint);
  return names.map((name) => {
    const api = listed.get(name);
    const std = standard.get(name);
    const owner = ownerOf(name);
    const deploy = apps.apps.filter((app) => app.repo === `${ORG}/${name}`).map((app) => app.app).sort(byCodePoint);
    const role = std?.role ?? (name === ".github" ? "Organization profile, shared CI and tooling" : null);
    return {
      name,
      owner,
      role,
      // GitHub teams are not set up yet: the team is the owner's (TO VALIDATE, Oussama).
      team: owner,
      kind: kindOf({ name, files: files[name] ?? [], topics: api?.topics ?? [], role: role ?? "", deploy }),
      deploy,
      archived: api ? Boolean(api.archived) : null,
      visibility: api ? (api.visibility ?? (api.private ? "private" : "public")) : "private",
      status: std?.status ?? (name === ".github" ? "Reserved" : "Not in the standard"),
      ...(std?.renameTo ? { renameTo: std.renameTo } : {}),
      ...(std?.foldInto ? { foldInto: std.foldInto } : {}),
    };
  });
}

/** Markdown lines describing how `next` differs from `current` (empty: no drift). */
export function drift(current, next) {
  const before = new Map(current.map((row) => [row.name, row]));
  const after = new Map(next.map((row) => [row.name, row]));
  const lines = [];
  for (const [name, row] of after) {
    const old = before.get(name);
    if (!old) { lines.push(`- \`${name}\`: new (${row.kind}, ${row.owner})`); continue; }
    for (const key of new Set([...Object.keys(old), ...Object.keys(row)])) {
      if (JSON.stringify(old[key]) !== JSON.stringify(row[key])) {
        lines.push(`- \`${name}\`: ${key} ${JSON.stringify(old[key])} → ${JSON.stringify(row[key])}`);
      }
    }
  }
  for (const name of before.keys()) if (!after.has(name)) lines.push(`- \`${name}\`: gone`);
  return lines;
}

export function serialize(registry) {
  return `${JSON.stringify({ _: "Generated by scripts/gen-repos.mjs (docs/standards/ci-and-deploy.md): do not edit by hand.", repositories: registry }, null, 2)}\n`;
}

async function api(path, fetchImpl = fetch) {
  const headers = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.authorization = "Bearer " + process.env.GITHUB_TOKEN;
  const response = await fetchImpl(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(20000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API ${path}: ${response.status}`);
  return response.json();
}

async function main(argv) {
  const repositories = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`);
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  const files = {};
  for (const repository of repositories) {
    const root = await api(`/repos/${ORG}/${repository.name}/contents/`);
    files[repository.name] = Array.isArray(root) ? root.map((entry) => entry.name) : [];
  }
  const standard = parseStandard(readFileSync(new URL("docs/standards/repositories.md", ROOT), "utf8"));
  const apps = JSON.parse(readFileSync(new URL("deploy/apps.json", ROOT), "utf8"));
  const next = buildRegistry({ repositories, files, standard, apps });
  const target = new URL("repos.json", ROOT);
  if (!argv.includes("--check")) {
    writeFileSync(target, serialize(next));
    console.log(`repos.json: ${next.length} repositories`);
    return;
  }
  const lines = drift(JSON.parse(readFileSync(target, "utf8")).repositories, next);
  console.log("## Repository registry drift\n");
  console.log(lines.length ? `${lines.join("\n")}\n\nRun \`node scripts/gen-repos.mjs\` and open a PR.` : "No drift: repos.json matches the org.");
  if (lines.length) console.log(`::warning::repos.json drifts from the org (${lines.length} difference(s))`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
