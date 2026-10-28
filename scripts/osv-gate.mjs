#!/usr/bin/env node
// Scorecard "Vulnerabilities" guard (krizaka/.github#372): runs osv-scanner on the lockfiles of a repository and fails on a
// high or critical finding (CVSS >= 7). Lower ones are listed, not blocking. A finding with no fix is accepted ONLY in the
// repository's osv-scanner.toml, with a reason and an `ignoreUntil` date (osv-scanner honours it: when the date passes, the
// finding is back and this gate fails again). Keep the dates short; never extend one without checking for a fix.
//
//   node scripts/osv-gate.mjs [dir]            # runs `osv-scanner scan source -r --format json <dir>`
//   node scripts/osv-gate.mjs --json file.json # reads a saved report (tests)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const BLOCKING = 7;

export function findings(report) {
  return (report.results ?? []).flatMap((r) =>
    (r.packages ?? []).flatMap((p) =>
      (p.groups ?? []).map((g) => ({
        source: r.source?.path ?? "",
        name: p.package.name,
        version: p.package.version,
        id: g.ids?.[0] ?? "?",
        severity: Number.parseFloat(g.max_severity),
      })),
    ),
  );
}

export function blocking(list) {
  // An unscored finding (NaN) is not blocking: it is listed, and scored findings decide.
  return list.filter((f) => f.severity >= BLOCKING);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  let report;
  if (args[0] === "--json") report = JSON.parse(readFileSync(args[1], "utf8"));
  else {
    const run = spawnSync("osv-scanner", ["scan", "source", "-r", "--format", "json", args[0] ?? "."], { encoding: "utf8", maxBuffer: 1 << 26 });
    if (run.error) throw run.error;
    if (run.status > 1) { console.error(run.stderr); process.exit(run.status); }
    report = JSON.parse(run.stdout || "{}");
  }
  const all = findings(report);
  const bad = blocking(all);
  for (const f of all) console.log(`${bad.includes(f) ? "BLOCKING" : "listed  "} ${f.severity || "n/a"}  ${f.name}@${f.version}  ${f.id}  (${f.source})`);
  for (const f of bad) console.error(`::error::${f.name}@${f.version} ${f.id} (CVSS ${f.severity}): update it, or add a dated entry with a reason to osv-scanner.toml (krizaka/.github#372)`);
  process.exit(bad.length ? 1 : 0);
}
