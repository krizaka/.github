// Reads and checks docs-map.json, the committed list of « which documents a change of each kind must update »
// (ADR-026, krizaka-internal#2734). It checks the shape (the same rules as docs/standards/docs-map.schema.json, dependency-free,
// like scripts/incident-register.mjs) and that every listed document exists in its repository.
//   node scripts/docs-map.mjs            the shape only (offline)
//   node scripts/docs-map.mjs --exist    the shape, then every document in the default branch of its repository (needs `gh`)
// The `docs-map` check of a pull request (krizaka-internal#2758) imports `loadMap` from here.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const MAP_FILE = join(here, "..", "docs-map.json");
const ORG = "krizaka";
// `gh` is looked up in these system directories only, never in a search path inherited from the caller (Sonar S4036).
const TOOL_DIRS = "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin";
const CATEGORY_KEYS = ["id", "title", "when", "docs"];
const WHEN_KEYS = ["repo", "globs"];
const DOC_KEYS = ["repo", "path", "bump", "local"];
// A glob is a path with `*` and `**`; these characters would make it a regex, which a map never holds.
const REGEX_CHARS = "()[]{}|^$+?\\";

export function loadMap(file = MAP_FILE) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const isText = (v) => typeof v === "string" && v.trim() !== "";
const isIdentifier = (v) => isText(v) && [...v].every((c) => (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "-");
const unknownKeys = (obj, allowed, where) => Object.keys(obj).filter((k) => !allowed.includes(k)).map((k) => `${where}: unknown key « ${k} »`);

function globProblems(glob, where) {
  if (!isText(glob)) return [`${where}: a glob is a non-empty text`];
  const bad = [...glob].filter((c) => REGEX_CHARS.includes(c));
  return bad.length ? [`${where}: « ${glob} » holds ${bad.join(" ")}: a glob, never a regex`] : [];
}

function whenProblems(when, where) {
  if (!Array.isArray(when) || when.length === 0) return [`${where}: « when » is a non-empty list`];
  return when.flatMap((w, i) => {
    const at = `${where}.when[${i}]`;
    const globs = Array.isArray(w.globs) && w.globs.length > 0 ? w.globs.flatMap((g) => globProblems(g, at)) : [`${at}: « globs » is a non-empty list`];
    return [...unknownKeys(w, WHEN_KEYS, at), ...(isText(w.repo) ? [] : [`${at}: « repo » is required`]), ...globs];
  });
}

function docProblems(doc, where) {
  const own = unknownKeys(doc, DOC_KEYS, where);
  if (!isText(doc.path)) own.push(`${where}: « path » is required`);
  else if (doc.path.includes("*") && !doc.local) own.push(`${where}: a document is a path, not a glob`);
  if (doc.local !== undefined && doc.local !== true) own.push(`${where}: « local » is true or absent`);
  if (doc.bump !== undefined && doc.bump !== true) own.push(`${where}: « bump » is true or absent`);
  if (doc.local && (doc.repo !== undefined || doc.bump)) own.push(`${where}: a local page has no repo and no bump`);
  if (!doc.local && !isText(doc.repo)) own.push(`${where}: « repo » is required unless the page is local`);
  return own;
}

function docsProblems(docs, where) {
  if (!Array.isArray(docs) || docs.length === 0) return [`${where}: « docs » is a non-empty list`];
  const required = docs.filter((d) => !d.local);
  const tail = required.length === 0 ? [`${where}: at least one document is required, not only local pages`] : [];
  return [...docs.flatMap((d, i) => docProblems(d, `${where}.docs[${i}]`)), ...tail];
}

function categoryProblems(category, seen) {
  const where = `category « ${category.id} »`;
  const own = unknownKeys(category, CATEGORY_KEYS, where);
  if (!isIdentifier(category.id)) own.push(`${where}: « id » is lowercase letters, digits and dashes`);
  if (seen.has(category.id)) own.push(`${where}: the id is used twice`);
  seen.add(category.id);
  if (!isText(category.title)) own.push(`${where}: « title » is required`);
  return [...own, ...whenProblems(category.when, where), ...docsProblems(category.docs, where)];
}

/** Every problem of the map's shape, as readable lines; an empty list is a valid map. */
export function mapProblems(map) {
  if (!Array.isArray(map?.categories) || map.categories.length === 0) return ["« categories » is a non-empty list"];
  const seen = new Set();
  return map.categories.flatMap((c) => categoryProblems(c, seen));
}

/** The documents that are not in their repository: `treeOf(repo)` returns the set of its file paths. */
export function missingDocuments(map, treeOf) {
  const trees = new Map();
  const missing = [];
  for (const category of map.categories) {
    for (const doc of category.docs.filter((d) => !d.local)) {
      if (!trees.has(doc.repo)) trees.set(doc.repo, treeOf(doc.repo));
      if (!trees.get(doc.repo).has(doc.path)) missing.push(`${category.id}: ${doc.repo}/${doc.path}`);
    }
  }
  return missing;
}

/** The file paths of a repository's default branch, read through the API. */
export function liveTree(repo) {
  const out = execFileSync("gh", ["api", `repos/${ORG}/${repo}/git/trees/HEAD?recursive=1`, "--jq", ".tree[].path"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PATH: TOOL_DIRS } });
  return new Set(out.split("\n").filter(Boolean));
}

function main(argv) {
  const map = loadMap();
  const problems = mapProblems(map);
  if (problems.length === 0 && argv.includes("--exist")) problems.push(...missingDocuments(map, liveTree).map((m) => `missing document, ${m}`));
  for (const p of problems) console.error(p);
  console.log(problems.length === 0 ? `docs-map: ${map.categories.length} categories, all valid` : `docs-map: ${problems.length} problem(s)`);
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
