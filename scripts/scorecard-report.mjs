#!/usr/bin/env node
// The org's OpenSSF Scorecard table (repo x check), read from api.scorecard.dev — what the public viewer shows.
//   node scripts/scorecard-report.mjs [org=krizaka] > scorecard.md
// A repository without a published result (no Scorecard workflow yet) is listed as "n/a".
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

export function renderTable(results) {
  const checks = [];
  for (const r of results) for (const c of r.checks ?? []) if (!checks.includes(c.name)) checks.push(c.name);
  const cell = (v) => (v === undefined ? "" : v === -1 ? "–" : String(v));
  const lines = [`| repo | score | ${checks.join(" | ")} |`, `|---|---|${checks.map(() => "---").join("|")}|`];
  for (const r of results) {
    const by = Object.fromEntries((r.checks ?? []).map((c) => [c.name, c.score]));
    lines.push(`| ${r.name} | ${r.score ?? "n/a"} | ${checks.map((c) => cell(by[c])).join(" | ")} |`);
  }
  const scored = results.filter((r) => typeof r.score === "number");
  const avg = scored.reduce((s, r) => s + r.score, 0) / (scored.length || 1);
  const low = scored.reduce((m, r) => (m && m.score <= r.score ? m : r), null);
  lines.push("", `Average ${avg.toFixed(2)} over ${scored.length} scored repositories; lowest ${low ? `${low.name} (${low.score})` : "n/a"}.`);
  return lines.join("\n");
}

async function main() {
  const org = process.argv[2] ?? "krizaka";
  // REST, not GraphQL (`gh repo list`): the GraphQL budget is the first one a batch session exhausts.
  const names = execFileSync("gh", ["api", "--paginate", `orgs/${org}/repos?type=public&per_page=100`, "-q", ".[]|select(.archived|not)|.name"], { encoding: "utf8" }).split("\n").filter(Boolean).sort();
  const results = [];
  for (const name of names) {
    const res = await fetch(`https://api.scorecard.dev/projects/github.com/${org}/${name}`);
    results.push(res.ok ? { name, ...(await res.json()) } : { name });
  }
  console.log(renderTable(results));
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
