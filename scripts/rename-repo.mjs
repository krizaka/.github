#!/usr/bin/env node
// Lists every file of the org that still names a repository, before it is renamed (krizaka/.github#113,
// docs/standards/repositories.md « Decided renames »):
//   GITHUB_TOKEN=… node scripts/rename-repo.mjs <from> <to> --dry-run
// Read-only: the GitHub code search API (it needs a token) and the registry (repos.json, deploy/apps.json) for what code
// search cannot see. It changes nothing.
// TODO(krizaka/.github#113): the real mode (one PR per repository, then the rename itself) is not written yet; until then
// the orchestrator follows the dry-run list by hand.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { isValidRepositoryName } from "./repository-names.mjs";

const ORG = "krizaka";
const PAGE = 100;
const MAX_PAGES = 10; // the code search API stops at 1,000 results

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A whole-name match: `orazaka-edge` is not found inside `orazaka-edge-service` nor `my-orazaka-edge`. */
export function nameMatcher(name) {
  return new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`);
}

/** Checks the arguments against the registry and the naming standard; returns the registry row of `<from>`. */
export function validate({ from, to, registry }) {
  const row = registry.find((repository) => repository.name === from);
  if (!row) throw new Error(`${from} is not in repos.json`);
  if (registry.some((repository) => repository.name === to)) throw new Error(`${to} already exists in repos.json`);
  if (!isValidRepositoryName(to)) throw new Error(`${to} is outside the naming standard (scripts/repository-names.mjs)`);
  return row;
}

/** Every file of the org whose path or content names `from` (code search, then an exact-name filter on the matches). */
export async function search({ from, token, fetchImpl = fetch }) {
  if (!token) throw new Error("the code search API needs a token: set GITHUB_TOKEN");
  const match = nameMatcher(from);
  const files = new Map();
  let totalCount = null;
  let resultCount = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const query = encodeURIComponent(`"${from}" org:${ORG}`);
    const response = await fetchImpl(`https://api.github.com/search/code?q=${query}&per_page=${PAGE}&page=${page}`, {
      headers: {
        accept: "application/vnd.github.text-match+json",
        authorization: "Bearer " + token,
        "x-github-api-version": "2022-11-28",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`GitHub code search: ${response.status}`);
    const body = await response.json();
    if (body.incomplete_results) throw new Error("GitHub code search returned incomplete code search results");
    if (!Number.isInteger(body.total_count) || body.total_count < 0) {
      throw new Error("GitHub code search response has no valid total_count");
    }
    if (body.total_count > PAGE * MAX_PAGES) {
      throw new Error(`GitHub code search exceeds the ${(PAGE * MAX_PAGES).toLocaleString("en-US")}-result limit`);
    }
    if (totalCount !== null && body.total_count !== totalCount) {
      throw new Error("GitHub code search result count changed during pagination");
    }
    totalCount = body.total_count;
    const items = body.items ?? [];
    resultCount += items.length;
    for (const item of items) {
      const lines = (item.text_matches ?? [])
        .flatMap((text) => String(text.fragment ?? "").split("\n"))
        .filter((line) => match.test(line))
        .map((line) => line.trim());
      if (!lines.length && !match.test(item.path)) continue;
      const key = `${item.repository.full_name}/${item.path}`;
      const file = files.get(key) ?? { repository: item.repository.full_name, path: item.path, lines: [] };
      file.lines.push(...lines.filter((line) => !file.lines.includes(line)));
      files.set(key, file);
    }
    if (items.length < PAGE) {
      if (resultCount < totalCount) throw new Error("GitHub code search returned an incomplete inventory");
      break;
    }
  }
  if (resultCount < totalCount) throw new Error("GitHub code search returned an incomplete inventory");
  return [...files.values()].sort((a, b) => a.repository.localeCompare(b.repository) || a.path.localeCompare(b.path));
}

/** What code search does not index but the rename must update, from the registry. */
export function outsideSearch(row) {
  const items = row.deploy.map((app) => `DigitalOcean app \`${app}\`: its live spec's \`source_repository\` / \`github.repo\` (deploy/apps.json)`);
  items.push(`Branch protection, rulesets, Dependabot, CodeQL and Scorecard settings of \`${ORG}/${row.name}\` (checked after the rename)`);
  items.push(`krizaka-infra stacks and Bunny prefixes that carry the name`);
  return items;
}

export function report({ from, to, row, files }) {
  const out = [`## Rename \`${from}\` → \`${to}\` (dry run: nothing changed)`, ""];
  if (row.renameTo && row.renameTo !== to) out.push(`> Warning: the standard decided \`${from}\` → \`${row.renameTo}\`, not \`${to}\`.`, "");
  const repositories = [...new Set(files.map((file) => file.repository))];
  out.push(`${files.length} file(s) in ${repositories.length} repositories name \`${from}\`:`, "");
  for (const repository of repositories) {
    out.push(`### ${repository}`);
    for (const file of files.filter((f) => f.repository === repository)) {
      out.push(`- \`${file.path}\``);
      for (const line of file.lines.slice(0, 5)) out.push(`  - \`${line.replace(/`/g, "'")}\``);
    }
    out.push("");
  }
  out.push("### Outside code search", ...outsideSearch(row).map((item) => `- ${item}`));
  return `${out.join("\n")}\n`;
}

export async function run(argv, { fetchImpl = fetch, token = process.env.GITHUB_TOKEN, registry } = {}) {
  const [from, to] = argv.filter((arg) => !arg.startsWith("--"));
  if (!from || !to) throw new Error("usage: node scripts/rename-repo.mjs <from> <to> --dry-run");
  if (!argv.includes("--dry-run")) {
    // TODO(krizaka/.github#113): the real mode. Until it exists, only the list is produced.
    throw new Error("only --dry-run exists: the real mode is not written yet (TODO, krizaka/.github#113)");
  }
  const rows = registry ?? JSON.parse(readFileSync(new URL("../repos.json", import.meta.url), "utf8")).repositories;
  const row = validate({ from, to, registry: rows });
  const files = await search({ from, token, fetchImpl });
  return report({ from, to, row, files });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).then((text) => process.stdout.write(text), (error) => {
    console.error(error.message);
    process.exit(1);
  });
}
