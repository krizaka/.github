#!/usr/bin/env node
// The conformance matrix of the org (krizaka/.github#393): every rule of docs/standards/rules.json against every active repository.
//
//   node scripts/conformance.mjs                      the matrix (markdown) on stdout
//   node scripts/conformance.mjs --json out.json      also the cells as JSON
//   node scripts/conformance.mjs --repos a,b --rules x,y   a slice
//   node scripts/conformance.mjs --validate           only the registry (every rule has its check); no network
//   node scripts/conformance.mjs --repo-list           the active repositories, comma separated (scopes the workflow's token)
//   node scripts/conformance.mjs --fail               exit 1 while a cell of a security rule fails (rules review of 2026-11-05:
//                                                     the same-day rollout holds only for the rules marked `"security": true`)
//
// Deterministic (founder 2026-11-06, « la matrice doit le prouver d'une façon déterministe »): each repository is read at one pinned
// commit (the default branch's SHA, recorded in the output), every file a check reads is recorded with the SHA-256 of what it judged,
// a live setting (rulesets, npm) with its URL and the SHA-256 of the answer. A cell is `pass`, `fail`, `unknown` (a fetch error or
// nothing readable: never pass, never fail), `manual` (no deterministic check exists: never shown as pass) or `n/a`.
//
// Active = repos.json minus archived, `Archive` and `Paused` repositories, which are listed out of scope (never « exceptions »).
// Split by job (ADR-026 phase D): conformance-basics (shared constants), -registry (rules, scope, snapshot), -checks (one handler per check
// type), -live (reading GitHub), -report (markdown and JSON); this file evaluates the matrix and runs it. Owner: krizaka/.github (lane platform).
// Reads GitHub with GH_TOKEN / GITHUB_TOKEN (the app token for the private ones).
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { byCodePoint } from "./conformance-basics.mjs";
import { runCheck, patternOf, lateOf, versionsReport } from "./conformance-checks.mjs";
import { liveSnapshot } from "./conformance-live.mjs";
import { renderVersions } from "./conformance-versions.mjs";
import { render, reportOf } from "./conformance-report.mjs";
import { appliesTo, failing, loadRules, readJson, scopeOf, validateRules } from "./conformance-registry.mjs";

export * from "./conformance-basics.mjs";
export * from "./conformance-checks.mjs";
export * from "./conformance-live.mjs";
export * from "./conformance-registry.mjs";
export * from "./conformance-report.mjs";

/** A check's answer as a cell state: true pass, false fail, null unknown (manual when the check is `manual`). */
export function statusOf({ ok, manual }) {
  if (manual) return "manual";
  if (ok === true) return "pass";
  if (ok === false) return "fail";
  return "unknown";
}

/** Evidence, sorted and without duplicates, so the same content gives the same text. */
function evidenceOf(result, reads) {
  const seen = new Map();
  // A check that names what proved it keeps only that (with its hash); otherwise every read is the evidence.
  const named = result.evidence?.length ? new Set(result.evidence.map((e) => e.path ?? e.url)) : null;
  for (const e of [...(result.evidence ?? []), ...reads.filter((r) => !named || named.has(r.path ?? r.url))]) {
    const key = e.path ?? e.url;
    seen.set(key, { ...seen.get(key), ...e });
  }
  return [...seen.values()].sort((a, b) => byCodePoint(String(a.path ?? a.url), String(b.path ?? b.url)));
}

/**
 * The matrix: `cells[repo][rule]` = { status: "pass" | "fail" | "unknown" | "manual" | "n/a", why, commit, check, evidence }.
 * A check that throws (a fetch error) is `unknown` with the reason, never pass nor fail.
 */
export async function evaluate(rules, snapshots, lists = {}) {
  const cells = {};
  const ruleIds = rules.map((r) => r.id);
  for (const snap of snapshots) {
    cells[snap.name] = {};
    snap.ruleIds = ruleIds;
    for (const rule of rules) {
      cells[snap.name][rule.id] = await cellOf(rule, snap, lists);
    }
  }
  return cells;
}

async function cellOf(rule, snap, lists) {
  const base = { commit: snap.commit ?? null, check: rule.check.type, evidence: [] };
  if (snap.error) return { status: "unknown", why: snap.error, ...base };
  if (!(await appliesTo(rule, snap, lists))) return { status: "n/a", why: "", ...base };
  const reason = rule.exempt?.[snap.name];
  if (reason) return { status: "n/a", why: `exempt: ${reason}`, ...base };
  const reads = snap.evidence ?? [];
  reads.length = 0;
  let result;
  try {
    result = await runCheck(rule.check, snap);
  } catch (error) {
    result = { ok: null, why: `could not read: ${String(error?.message ?? error).replace(/\s+/g, " ")}` };
  }
  return { status: statusOf(result), why: result.why ?? "", ...base, evidence: evidenceOf(result, reads) };
}

/** Counts per rule: pass, fail, unknown, manual. */
export function summarise(rules, cells) {
  return rules.map((rule) => {
    const states = Object.values(cells).map((row) => row[rule.id]?.status);
    const count = (st) => states.filter((s) => s === st).length;
    return { id: rule.id, pass: count("pass"), fail: count("fail"), unknown: count("unknown"), manual: count("manual") };
  });
}

const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

/** The repositories that learn of a release (krizaka/.github#388); none while that list is not merged. */
function consumersList() {
  try {
    return Object.keys(readJson("orchestration/release-consumers.json").repos);
  } catch {
    return [];
  }
}

export async function main(argv) {
  const rules = loadRules();
  const problems = validateRules(rules);
  if (problems.length) {
    console.error(problems.join("\n"));
    return 1;
  }
  if (argv.includes("--validate")) {
    console.log(`${rules.length} rules, each with its check and its fix`);
    return 0;
  }
  const { active, paused } = scopeOf(readJson("repos.json").repositories);
  if (argv.includes("--repo-list")) {
    console.log(active.map((r) => r.name).join(","));
    return 0;
  }
  const only = flag(argv, "--repos")?.split(",");
  const onlyRules = flag(argv, "--rules")?.split(",");
  const picked = onlyRules ? rules.filter((r) => onlyRules.includes(r.id)) : rules;
  const targets = active.filter((r) => !only || only.includes(r.name));
  const snapshots = [];
  for (const r of targets) snapshots.push(await liveSnapshot(r)); // one at a time: dozens of parallel lookups exhaust the resolver
  const lists = { "orchestration/release-consumers.json": consumersList() };
  const cells = await evaluate(picked, snapshots, lists);
  const summary = summarise(picked, cells);
  const versions = await versionsReport(snapshots);
  console.log(`${render(picked, cells, summary, paused)}\n\n### Family versions\n\n${renderVersions(versions)}`);
  const jsonOut = flag(argv, "--json");
  if (jsonOut) {
    const report = reportOf({ rules: picked, cells, summary, versions, paused, generatedAt: new Date().toISOString(), runUrl: process.env.RUN_URL || null, rulesCommit: process.env.GITHUB_SHA || null });
    writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  }
  return argv.includes("--fail") && failing(picked, summary).length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
