#!/usr/bin/env node
// Regenerates the code-quality table of profile/README.md (between `<!-- quality:start -->` / `<!-- quality:end -->`) from
// profile/quality.json: one row per repository, one SonarCloud badge per metric (quality gate, bugs, vulnerabilities,
// code smells, duplicated lines, coverage).
//
//   node scripts/profile-quality.mjs             # rewrite the table
//   node scripts/profile-quality.mjs --check     # exit 1 when the README is out of date
//   node scripts/profile-quality.mjs --verify    # also: every listed repository exists, is not archived and has a Sonar project
//                                                # (reads the tokens GH_TOKEN and the Sonar one from the environment)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const START = "<!-- quality:start -->";
export const END = "<!-- quality:end -->";

export const projectKey = (config, repo) => `${config.organization}_${repo}`;

export function badge(config, repo, [label, metric]) {
  const id = projectKey(config, repo);
  return `[![${label}](https://sonarcloud.io/api/project_badges/measure?project=${id}&metric=${metric})](https://sonarcloud.io/summary/new_code?id=${id})`;
}

export function renderQuality(config) {
  const rows = ["| | Repository | Analysis |", "| :--- | :--- | :--- |"];
  for (const group of config.groups) {
    group.repos.forEach((repo, i) => {
      const cells = config.metrics.map((m) => badge(config, repo, m)).join(" ");
      rows.push(`| ${i === 0 ? group.label : ""} | [${repo}](https://github.com/${config.organization}/${repo}) | ${cells} |`);
    });
  }
  return rows.join("\n");
}

export function replaceBlock(readme, body) {
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a < 0 || b < a) throw new Error("quality markers not found in profile/README.md");
  return `${readme.slice(0, a + START.length)}\n${body}\n${readme.slice(b)}`;
}

/** Problems of the listed repositories: missing, archived, no Sonar project. `fetchJson(url)` returns the parsed body or null on 404. */
export async function verifyRepos(config, fetchJson) {
  const problems = [];
  const sonar = await fetchJson(`https://sonarcloud.io/api/projects/search?organization=${config.sonarOrganization}&ps=500`);
  const keys = new Set((sonar?.components ?? []).map((c) => c.key));
  for (const repo of config.groups.flatMap((g) => g.repos)) {
    const gh = await fetchJson(`https://api.github.com/repos/${config.organization}/${repo}`);
    if (!gh) problems.push(`${repo}: no such repository`);
    else if (gh.archived) problems.push(`${repo}: repository is archived`);
    if (!keys.has(projectKey(config, repo))) problems.push(`${repo}: no Sonar project ${projectKey(config, repo)}`);
  }
  return problems;
}

async function main() {
  const root = new URL("../profile/", import.meta.url);
  const config = JSON.parse(readFileSync(new URL("quality.json", root), "utf8"));
  const file = fileURLToPath(new URL("README.md", root));
  const current = readFileSync(file, "utf8");
  const next = replaceBlock(current, renderQuality(config));
  const args = process.argv.slice(2);
  if (args.includes("--verify")) {
    const sonarCredentials = Buffer.from(`${process.env.SONAR_TOKEN}:`).toString("base64");
    const sonarAuth = `Basic ${sonarCredentials}`;
    const fetchJson = async (url) => {
      const headers = url.includes("sonarcloud") ? { Authorization: sonarAuth } : { Authorization: `Bearer ${process.env.GH_TOKEN}`, "User-Agent": "krizaka" };
      const r = await fetch(url, { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return r.json();
    };
    const problems = await verifyRepos(config, fetchJson);
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
  }
  if (args.includes("--check") || args.includes("--verify")) {
    if (next !== current) {
      console.error("profile/README.md quality table is out of date: run node scripts/profile-quality.mjs");
      process.exit(1);
    }
    return;
  }
  writeFileSync(file, next);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
