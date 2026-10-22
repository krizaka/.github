#!/usr/bin/env node
// Duplicate code, counted and ratcheted (krizaka/.github#169; org rule 2026-10-22: no copy-pasted code).
//
//   node dup-ratchet.mjs [--paths ". apps"] [--baseline dup-ratchet.json] [--update] [--top 5]
//
// jscpd (MIT, pinned) finds the clones with the org's shared thresholds (jscpd.config.json next to this file). The count of
// duplicated lines is compared with the repository's `dup-ratchet.json`: it may only go down. A new repository starts with
// `--update` (writes the baseline); `--update` never raises a count. The top clones are always printed, so a lane can factor them.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// @fixed: the version of the detector whose counts the baselines hold; a new version is a deliberate re-baseline.
export const JSCPD_VERSION = "5.4.2";

/** The verdict: ok when the count did not rise above the baseline; `lower` when it fell (the baseline can be tightened). */
export function evaluate(count, baseline) {
  if (baseline === null || baseline === undefined) return { ok: false, lower: false, reason: "no baseline: run with --update once and commit dup-ratchet.json" };
  if (count > baseline) return { ok: false, lower: false, reason: `${count} duplicated lines, baseline ${baseline}: duplication may only go down (factor the new copies)` };
  return { ok: true, lower: count < baseline, reason: count < baseline ? `${count} < ${baseline}: tighten with --update` : `${count} = baseline` };
}

/** The `n` biggest clones of a jscpd report, as one readable line each (file:lines <-> file:lines). */
export function topClones(report, n = 5) {
  return [...(report.duplicates ?? [])]
    .sort((a, b) => (b.lines ?? 0) - (a.lines ?? 0))
    .slice(0, n)
    .map((d) => ({
      lines: d.lines,
      a: `${d.firstFile?.name}:${d.firstFile?.startLoc?.line}-${d.firstFile?.endLoc?.line}`,
      b: `${d.secondFile?.name}:${d.secondFile?.startLoc?.line}-${d.secondFile?.endLoc?.line}`,
    }));
}

/** The next baseline: never higher than the current one. */
export function nextBaseline(count, baseline) {
  return baseline === null || baseline === undefined ? count : Math.min(count, baseline);
}

function arg(argv, name, fallback) {
  return argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
}

export function run(argv = process.argv.slice(2), { cwd = process.cwd(), exec = execFileSync, log = console.log } = {}) {
  const paths = arg(argv, "--paths", ".").split(/\s+/).filter(Boolean);
  const baselineFile = join(cwd, arg(argv, "--baseline", "dup-ratchet.json"));
  const top = Number(arg(argv, "--top", "5"));
  const config = new URL("./jscpd.config.json", import.meta.url).pathname;
  const out = mkdtempSync(join(tmpdir(), "jscpd-"));
  exec("npx", ["--yes", `jscpd@${JSCPD_VERSION}`, ...paths, "--config", config, "--output", out, "--silent"], { cwd, stdio: ["ignore", "ignore", "inherit"] });
  const report = JSON.parse(readFileSync(join(out, "jscpd-report.json"), "utf8"));
  const total = report.statistics.total;
  const count = total.duplicatedLines;
  const baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, "utf8")).duplicatedLines : null;
  log(`duplication: ${count} duplicated lines (${total.percentage.toFixed(2)} % of ${total.lines}), ${total.clones} clones; baseline ${baseline ?? "none"}`);
  for (const c of topClones(report, top)) log(`  ${String(c.lines).padStart(4)} lines  ${c.a}  <->  ${c.b}`);
  if (argv.includes("--update")) {
    const next = nextBaseline(count, baseline);
    writeFileSync(baselineFile, `${JSON.stringify({ duplicatedLines: next, tool: `jscpd@${JSCPD_VERSION}` }, null, 2)}\n`);
    log(`dup-ratchet.json: ${next}`);
    return 0;
  }
  const verdict = evaluate(count, baseline);
  log(verdict.ok ? `ok: ${verdict.reason}` : `FAIL: ${verdict.reason}`);
  return verdict.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(run());
