#!/usr/bin/env node
// The org's architecture as code (ADR-027, krizaka-internal#2809): every system's hand-written LikeC4 model, read with the org
// specification, checked against the facts generated from main (units, versions, latest tags, org dependencies), laid out
// for the cockpit, with one verdict per active repository for the conformance rule `architecture-model`.
//
//   node architecture.mjs --local <folder of reference copies> --out <dir>   from the Mac's reference copies (no network)
//   GH_TOKEN=... node architecture.mjs --out <dir>                          from GitHub: every active repository at its default
//                                                                           branch (the commit, one tarball, the tags)
//   GH_TOKEN=... node architecture.mjs --publish-from <dir>                 publish what --out wrote on the data branch
//   node architecture.mjs --local <folder> --repo <name>                    print one repository's verdict and exit 1 when red
//   … --use <repo>=<dir>                                                     read that repository from another checkout (a
//                                                                           worktree): check a model before its pull request
//
// Writes <dir>/architecture.json (schema docs/standards/architecture.schema.json) and <dir>/summary.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildArchitecture } from "./lib/assemble.mjs";
import { publish } from "./lib/publish.mjs";
import { renderSummary } from "./lib/render.mjs";
import { familySystems, orgVersion, registry, sourcesOf } from "./lib/sources.mjs";

const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);

export async function build({ local = null, use = {}, now = new Date() } = {}) {
  const { rows, active } = registry();
  const { sources, unread } = await sourcesOf(active, { local, use });
  return buildArchitecture({ sources, unread, registry: rows, family: familySystems(), orgVersion: orgVersion(), generatedAt: now.toISOString(), mode: local ? "local" : "github" });
}

export async function main(argv) {
  const from = flag(argv, "--publish-from");
  if (from) {
    const arch = JSON.parse(readFileSync(join(from, "architecture.json"), "utf8"));
    console.log(`Published: ${await publish({ arch, markdown: readFileSync(join(from, "summary.md"), "utf8") })}`);
    return 0;
  }
  const use = Object.fromEntries(argv.filter((_, i) => argv[i - 1] === "--use").map((pair) => pair.split("=")));
  const arch = await build({ local: flag(argv, "--local"), use });
  const one = flag(argv, "--repo");
  if (one) {
    const verdict = arch.verdicts.find((v) => v.repo === one);
    if (!verdict) throw new Error(`${one} is not an active repository of repos.json`);
    console.log(`${one} ${verdict.status}${verdict.commit ? ` at ${verdict.commit.slice(0, 7)}` : ""}`);
    for (const i of verdict.items) console.log(`  ${i.kind.padEnd(12)} ${i.why}`);
    return verdict.status === "pass" ? 0 : 1;
  }
  const out = flag(argv, "--out");
  if (!out) throw new Error("usage: architecture.mjs (--local <dir>) --out <dir> | --publish-from <dir> | --local <dir> --repo <name>");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "architecture.json"), `${JSON.stringify(arch)}\n`);
  writeFileSync(join(out, "summary.md"), renderSummary(arch));
  const s = arch.summary;
  console.log(`${s.inSync}/${s.active} repositories in sync, ${s.drift} drift items, homes ${s.homes.ok} ok / ${s.homes.missing} missing / ${s.homes.invalid} invalid → ${out}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (error) => {
    console.error(error?.stack ?? error);
    process.exit(2);
  });
}
