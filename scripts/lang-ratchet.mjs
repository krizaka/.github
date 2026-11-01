#!/usr/bin/env node
// The ratchet of the Rust and Python guards (krizaka-internal#2115): same idea as lint-ratchet.json and sg-ratchet.json.
// Existing debt is counted per rule in `lang-ratchet.json` and may only go down; a rule not recorded must be at zero.
//
//   lang-ratchet.mjs ruff   <ruff-json>   [--file lang-ratchet.json] [--update]   (ruff check --output-format json)
//   lang-ratchet.mjs clippy <cargo-json>  [--file lang-ratchet.json] [--update]   (cargo clippy --message-format json)
//   lang-ratchet.mjs pyright <pyright-json> [...]                                  (pyright --outputjson)
//
// `--update` lowers counts and records a new rule at its current count; it never raises one.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export function countRuff(text) {
  const counts = {};
  for (const item of JSON.parse(text || "[]")) counts[`ruff:${item.code ?? "syntax"}`] = (counts[`ruff:${item.code ?? "syntax"}`] ?? 0) + 1;
  return counts;
}

export function countClippy(text) {
  const counts = {};
  for (const line of text.split("\n")) {
    if (!line.startsWith("{")) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.reason !== "compiler-message") continue;
    const code = msg.message?.code?.code;
    const level = msg.message?.level;
    if (!code || (level !== "warning" && level !== "error")) continue;
    counts[`clippy:${code}`] = (counts[`clippy:${code}`] ?? 0) + 1;
  }
  return counts;
}

export function countPyright(text) {
  const counts = {};
  for (const d of JSON.parse(text || "{}").generalDiagnostics ?? []) {
    if (d.severity !== "error") continue;
    const key = `pyright:${d.rule ?? "error"}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// Returns { failures, next }: failures are the rules over their baseline; next is the baseline after `--update`.
export function compare(baseline, current) {
  const failures = [];
  const next = {};
  for (const [rule, count] of Object.entries(current)) {
    const allowed = baseline[rule] ?? 0;
    if (count > allowed) failures.push(`${rule}: ${count} > ${allowed}`);
    next[rule] = Math.min(count, baseline[rule] ?? count);
  }
  return { failures, next };
}

const PARSERS = { ruff: countRuff, clippy: countClippy, pyright: countPyright };

function main(argv) {
  const [tool, input, ...rest] = argv;
  if (!PARSERS[tool] || !input) {
    console.error("usage: lang-ratchet.mjs <ruff|clippy|pyright> <report> [--file lang-ratchet.json] [--update]");
    return 2;
  }
  const file = rest.includes("--file") ? rest[rest.indexOf("--file") + 1] : "lang-ratchet.json";
  const current = PARSERS[tool](readFileSync(input, "utf8"));
  const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const mine = Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith(`${tool}:`)));
  const { failures, next } = compare(mine, current);
  if (rest.includes("--update")) {
    const others = Object.fromEntries(Object.entries(all).filter(([k]) => !k.startsWith(`${tool}:`)));
    const merged = Object.fromEntries(Object.entries({ ...others, ...next }).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
    console.log(`${file}: ${Object.keys(merged).length} rules, ${Object.values(merged).reduce((a, b) => a + b, 0)} findings`);
    return 0;
  }
  const lowered = Object.keys(mine).filter((r) => (current[r] ?? 0) < mine[r]);
  if (lowered.length) console.log(`::notice::debt went down for ${lowered.join(", ")}: run with --update and commit ${file}`);
  for (const f of failures) console.log(`::error::${f}`);
  return failures.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
