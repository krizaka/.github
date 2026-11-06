#!/usr/bin/env node
// The org's automation catalogue (ADR-026, krizaka-internal#2755): every automation of every active repository (scripts, workflows,
// actions, custom npm scripts, hooks, agent hooks, Dockerfile entrypoints, plus the Mac's crons and hooks from krizaka-agents
// `tools/install.json`) with its kind, size, header, tests, regexes, callers and flags. Generated daily by the Conformance workflow
// from the files of each repository at its default branch (two requests per repository: the commit, one tarball), published on the
// `conformance-matrix` data branch under automation/. Run by the daily workflow; by hand to look at one repository.
//
//   GH_TOKEN=... node catalogue.mjs --out out [--previous]     all active repositories of repos.json, from GitHub (--previous: keep
//                                                              the days the units changed and the history of the published ones)
//   GH_TOKEN=... node catalogue.mjs --publish-from out         publish what --out wrote, with a token that may write the data branch
//   node catalogue.mjs --local <folder of reference copies> --out out     the same from local copies (no network)
//   node catalogue.mjs --repo <path of one copy>              print that repository's rows (callers from that repository only)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scopeOf } from "../../scripts/conformance.mjs";
import { buildCatalogue } from "./lib/assemble.mjs";
import { appendHistory, entryOf } from "./lib/history.mjs";
import { publish, readPublished, FILES } from "./lib/publish.mjs";
import { renderCatalogue } from "./lib/render.mjs";
import { directorySource, githubSource, lastRunsOf } from "./lib/sources.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);

function activeRepositories() {
  const { repositories } = JSON.parse(readFileSync(join(here, "..", "..", "repos.json"), "utf8"));
  return scopeOf(repositories).active;
}

/** The sources of every active repository, one at a time (dozens of parallel lookups exhaust the resolver). */
async function sourcesOf(argv, active) {
  const local = flag(argv, "--local");
  const sources = [];
  for (const repo of active) {
    try {
      const source = local ? directorySource(join(local, repo.name), repo.name) : await githubSource(repo.name);
      sources.push(local ? source : { ...source, runs: await lastRunsOf(repo.name) });
    } catch (error) {
      console.error(`${repo.name}: not read (${error.message})`);
    }
  }
  return sources;
}

function printRepo(catalogue) {
  for (const u of catalogue.units) console.log([u.kind.padEnd(10), u.type.padEnd(11), String(u.lines).padStart(5), u.path, u.calledBy.length ? "" : "[nothing calls it]", u.flags.filter((f) => f !== "nothingCalls").join(",")].filter(Boolean).join("  "));
  console.log(`${catalogue.summary.units} units`);
}

export async function main(argv) {
  const one = flag(argv, "--repo");
  if (one) {
    printRepo(buildCatalogue([directorySource(one)], new Map()));
    return 0;
  }
  const from = flag(argv, "--publish-from");
  if (from) {
    const read = (name) => readFileSync(join(from, name), "utf8");
    console.log(`Published: ${await publish({ catalogue: JSON.parse(read("catalogue.json")), markdown: read("catalogue.md"), history: JSON.parse(read("history.json")) })}`);
    return 0;
  }
  const active = activeRepositories();
  const sources = await sourcesOf(argv, active);
  if (sources.length === 0) {
    console.error("no repository could be read");
    return 1;
  }
  const previous = argv.includes("--previous") ? await readPublished(FILES.json) : null;
  const owners = new Map(active.map((r) => [r.name, r.team ?? null]));
  const catalogue = buildCatalogue(sources, owners, { runUrl: process.env.RUN_URL || null, previous });
  const history = appendHistory(previous ? await readPublished(FILES.history) : [], entryOf(catalogue));
  const markdown = renderCatalogue(catalogue, history);
  const out = flag(argv, "--out");
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "catalogue.json"), `${JSON.stringify(catalogue)}\n`);
    writeFileSync(join(out, "catalogue.md"), markdown);
    writeFileSync(join(out, "history.json"), `${JSON.stringify(history, null, 1)}\n`);
  }
  console.log(markdown.split("\n").slice(0, 3).join("\n"));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
