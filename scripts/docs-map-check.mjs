// The docs-map check of a pull request (ADR-026, krizaka-internal#2758): when the files a PR changes match a category of docs-map.json,
// it must also change one of that category's documents in the same repository, or its description must carry a line
//   Docs: <link to the pull request or issue that updates them>     (the documents are in another repository)
//   Docs: not needed, <why>
// One job: judge the change against the map. Globs are matched without a regex (`*` inside a folder, `**` across folders).
//   node scripts/docs-map-check.mjs   reads REPO, PR, PR_BODY, GITHUB_TOKEN and MODE (warn | required, default warn) from the process
// In `warn` mode a problem is a workflow warning and the exit code is 0; in `required` mode it is an error and the exit code is 1.
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { loadMap } from "./docs-map.mjs";

const API = "https://api.github.com";
const PAGE = 100;
const NOT_NEEDED = "not needed,";

function segmentMatches(pattern, text) {
  const parts = pattern.split("*");
  if (parts.length === 1) return pattern === text;
  if (!text.startsWith(parts[0]) || !text.endsWith(parts.at(-1))) return false;
  let at = parts[0].length;
  const end = text.length - parts.at(-1).length;
  for (const part of parts.slice(1, -1)) {
    const found = text.indexOf(part, at);
    if (found < 0 || found + part.length > end) return false;
    at = found + part.length;
  }
  return at <= end;
}

function segmentsMatch(globs, names) {
  if (globs.length === 0) return names.length === 0;
  if (globs.length === 1 && globs[0] === "**") return names.length > 0; // a trailing ** is the content of a folder, not the folder
  if (globs[0] === "**") return segmentsMatch(globs.slice(1), names) || (names.length > 0 && segmentsMatch(globs, names.slice(1)));
  return names.length > 0 && segmentMatches(globs[0], names[0]) && segmentsMatch(globs.slice(1), names.slice(1));
}

/** Whether a repository-relative path matches a glob (`*` inside a folder, `**` across folders). */
export function globMatches(glob, path) {
  return segmentsMatch(glob.split("/"), path.split("/"));
}

/** The « Docs: » line of a description: { kind: "link" | "not-needed", text }, or null when there is none or it is not valid. */
export function docsLine(body) {
  for (const raw of String(body ?? "").split("\n")) {
    const line = raw.trim();
    if (line.slice(0, 5).toLowerCase() !== "docs:") continue;
    const text = line.slice(5).trim();
    if (text.toLowerCase().startsWith(NOT_NEEDED) && text.slice(NOT_NEEDED.length).trim() !== "") return { kind: "not-needed", text };
    const oneToken = text !== "" && ![...text].some((c) => c === " " || c === "\t");
    if (oneToken && (text.startsWith("https://") || text.includes("#"))) return { kind: "link", text };
  }
  return null;
}

/** The categories whose `when` matches at least one file of this repository's change, with the files that matched. */
export function categoriesHit(map, repo, files) {
  const hits = [];
  for (const category of map.categories) {
    const globs = category.when.filter((w) => w.repo === repo).flatMap((w) => w.globs);
    const matched = files.filter((f) => globs.some((g) => globMatches(g, f)));
    if (matched.length > 0) hits.push({ category, matched });
  }
  return hits;
}

function problemOf({ category, matched }, repo) {
  const own = category.docs.filter((d) => !d.local && d.repo === repo).map((d) => d.path);
  const elsewhere = category.docs.filter((d) => !d.local && d.repo !== repo).map((d) => `${d.repo}/${d.path}`);
  const shown = matched.slice(0, 3).join(", ") + (matched.length > 3 ? `, and ${matched.length - 3} more` : "");
  const update = [own.length ? `update one of these documents of ${repo}: ${own.join(", ")}` : "", elsewhere.length ? `the documents of other repositories: ${elsewhere.join(", ")}` : ""];
  return `Category « ${category.id} » (${category.title}): ${shown} changed. ${update.filter(Boolean).join("; ")}. Or add a line « Docs: <link to the pull request or issue that updates them> » or « Docs: not needed, <why> » to the description.`;
}

/** { matched: ids of the categories hit, problems: one readable line per category left without its documents or a Docs line }. */
export function judge(map, repo, files, body) {
  const hits = categoriesHit(map, repo, files);
  const said = docsLine(body) !== null;
  const problems = hits
    .filter(({ category }) => !said && !category.docs.some((d) => !d.local && d.repo === repo && files.includes(d.path)))
    .map((hit) => problemOf(hit, repo));
  return { matched: hits.map((h) => h.category.id), problems };
}

/** Every file name of the change (a rename counts both names); `fetchPage(page)` returns one page of the API's list of files. */
export async function changedFiles(fetchPage) {
  const names = [];
  for (let page = 1; ; page += 1) {
    const rows = await fetchPage(page);
    if (rows.length === 0) return names;
    for (const row of rows) names.push(row.filename, ...(row.previous_filename ? [row.previous_filename] : []));
  }
}

function pageFetcher(repo, pr, token) {
  return async (page) => {
    const url = `${API}/repos/krizaka/${repo}/pulls/${pr}/files?per_page=${PAGE}&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  };
}

function report(result, mode) {
  const level = mode === "required" ? "error" : "warning";
  for (const p of result.problems) console.log(`::${level}::${p}`);
  const lines = result.problems.length ? result.problems.map((p) => `- ${p}`) : ["- the documents follow the change"];
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `### Docs map (${mode})\n\nCategories matched: ${result.matched.join(", ") || "none"}\n\n${lines.join("\n")}\n`);
}

async function main() {
  const { REPO, PR, PR_BODY, GITHUB_TOKEN, MODE } = process.env;
  const mode = MODE === "required" ? "required" : "warn";
  const repo = String(REPO).split("/").at(-1);
  const result = judge(loadMap(), repo, await changedFiles(pageFetcher(repo, PR, GITHUB_TOKEN)), PR_BODY);
  report(result, mode);
  console.log(result.problems.length ? `docs-map: ${result.problems.length} category(ies) without their documents (${mode})` : "docs-map: ok");
  return result.problems.length > 0 && mode === "required" ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main());
