#!/usr/bin/env node
// code-health (krizaka/.github#384, ADR-015): measures the external audit's « AI code » signals on repositories'
// checkouts, read-only, and writes a JSON measure plus its Markdown summary.
//
//   node code-health.mjs --out <measure.json> [--md <summary.md>] <repo-dir>...
//
// TypeScript: ESLint type-aware with the candidate rules (lib/ts-health.mjs). Java: PMD 7 complexity metrics and
// javaparser counts (java/JavaHealth.java, classpath resolved once from java/pom.xml with Maven). A repository is
// measured on its tracked files (`git ls-files`), main code and tests apart.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { distribution, renderSummary } from "./lib/stats.mjs";
import { measureTs } from "./lib/ts-health.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const JAVA_THRESHOLDS = { CyclomaticComplexity: [10, 15], CognitiveComplexity: [15, 25], NPathComplexity: [200] };

const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", maxBuffer: 64 << 20 }).trim();

let classpath;
function javaClasspath(work) {
  if (classpath) return classpath;
  const out = join(work, "cp.txt");
  execFileSync("mvn", ["-q", "-f", join(HERE, "java/pom.xml"), "dependency:build-classpath", `-Dmdep.outputFile=${out}`], { stdio: "inherit" });
  classpath = readFileSync(out, "utf8").trim();
  return classpath;
}

/** The Java measure of a repository (main code only), or null when it has none. */
export function measureJava(repoDir, tracked, work) {
  // Maven layout decides: a package named `test` (com.krizaka.test) under src/main/java is main code.
  const main = tracked.filter((f) => f.endsWith(".java") && /(^|\/)src\/main\/java\//.test(f));
  if (!main.length) return null;
  const list = join(work, `${basename(repoDir)}-java.txt`);
  writeFileSync(list, main.join("\n"));
  const raw = execFileSync("java", ["-cp", javaClasspath(work), join(HERE, "java/JavaHealth.java"), repoDir, list, join(HERE, "java/metrics-ruleset.xml")], {
    encoding: "utf8",
    maxBuffer: 256 << 20,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const java = JSON.parse(raw);
  java.dist = Object.fromEntries(Object.entries(JAVA_THRESHOLDS).map(([rule, t]) => [rule, distribution(java.metrics[rule]?.values ?? [], t)]));
  java.top = Object.fromEntries(Object.entries(java.metrics).map(([rule, m]) => [rule, m.top]));
  delete java.metrics;
  return java;
}

export async function measureRepo(repoDir, work) {
  const tracked = git(repoDir, "ls-files").split("\n").filter(Boolean);
  const hasTs = tracked.some((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"));
  return {
    repo: basename(repoDir),
    sha: git(repoDir, "rev-parse", "--short", "HEAD"),
    ts: hasTs ? await measureTs(repoDir, tracked) : null,
    java: measureJava(repoDir, tracked, work),
  };
}

async function main(argv) {
  const repos = [];
  let out, md;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--md") md = argv[++i];
    else repos.push(resolve(argv[i]));
  }
  if (!out || !repos.length) {
    console.error("usage: node code-health.mjs --out <measure.json> [--md <summary.md>] <repo-dir>...");
    process.exit(2);
  }
  const work = mkdtempSync(join(tmpdir(), "code-health-"));
  const measure = { date: new Date().toISOString().slice(0, 10), repos: [] };
  for (const dir of repos) {
    const started = Date.now();
    measure.repos.push(await measureRepo(dir, work));
    console.error(`measured ${basename(dir)} in ${Math.round((Date.now() - started) / 1000)} s`);
    writeFileSync(out, JSON.stringify(measure, null, 2) + "\n");
  }
  if (md) writeFileSync(md, renderSummary(measure) + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
