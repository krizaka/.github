#!/usr/bin/env node
// fix-needs-guard (.github#323): a pull request titled `fix...` adds or changes a guard file (a test, a rule, an audit), or carries the
// exemption label AND a `Guard exemption: <reason>` line in its body. Patterns: docs/standards/guard-paths.json (one source for the org).
//   node scripts/fix-needs-guard.mjs   (env: GH_TOKEN, REPO, PR; or GUARD_TEST_PR='{"title":..,"head":..,"labels":[..],"body":..,"files":[..]}')
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { globToRegExp } from "./ci-scope.mjs";

export const CONFIG = JSON.parse(readFileSync(new URL("../docs/standards/guard-paths.json", import.meta.url), "utf8"));

/** @returns {{ok: boolean, why: string}} */
/** A package.json patch that lowers a `--max-warnings N` cap is a guard (a tightened ratchet). */
export function lowersCap(patch = "", config = CONFIG) {
  const re = new RegExp(config.lintCaps.pattern, "g");
  const caps = (sign) => patch.split("\n").filter((l) => l.startsWith(sign) && !l.startsWith(sign.repeat(3))).flatMap((l) => [...l.matchAll(re)].map((m) => Number(m[1])));
  const before = caps("-");
  const after = caps("+");
  return before.length > 0 && after.length > 0 && Math.min(...after) < Math.max(...before);
}

export function check({ title, head = "", labels = [], body = "", files = [], patches = {} }, config = CONFIG) {
  if (config.skipBranches.some((g) => globToRegExp(g).test(head))) return { ok: true, why: "release branch: skipped" };
  if (!new RegExp(config.titlePattern).test(title)) return { ok: true, why: "not a fix: nothing to check" };
  const globs = Object.values(config.guards).flat().map(globToRegExp);
  const guard = files.find((f) => globs.some((re) => re.test(f)));
  if (guard) return { ok: true, why: `guard: ${guard}` };
  const capGlobs = config.lintCaps.files.map(globToRegExp);
  const lowered = files.find((f) => capGlobs.some((re) => re.test(f)) && lowersCap(patches[f], config));
  if (lowered) return { ok: true, why: `guard: lowered lint cap in ${lowered}` };
  const labelled = labels.includes(config.exemptLabel);
  const reasoned = body.split(/\r?\n/).some((l) => new RegExp(config.exemptionLine, "i").test(l));
  if (labelled && reasoned) return { ok: true, why: "exempted: label and reason" };
  if (labelled) return { ok: false, why: `label ${config.exemptLabel} without a "Guard exemption: <reason>" line in the PR body` };
  return { ok: false, why: `a fix adds a guard (test, rule, audit, or a lowered ratchet). Renaming the PR to dodge this check is not allowed. Add a guard, or label ${config.exemptLabel} and write "Guard exemption: <reason>" in the body` };
}

async function load() {
  if (process.env.GUARD_TEST_PR) return JSON.parse(process.env.GUARD_TEST_PR);
  const { REPO, PR, GH_TOKEN } = process.env;
  const get = async (path) => {
    const res = await fetch(`https://api.github.com${path}`, { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${GH_TOKEN}` }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  };
  const pr = await get(`/repos/${REPO}/pulls/${PR}`);
  const files = [];
  const patches = {};
  for (let page = 1; page <= 30; page++) {
    const batch = await get(`/repos/${REPO}/pulls/${PR}/files?per_page=100&page=${page}`);
    for (const f of batch) if (f.patch) patches[f.filename] = f.patch;
    for (const f of batch) files.push(f.filename, ...(f.previous_filename ? [f.previous_filename] : []));
    if (batch.length < 100) break;
  }
  return { title: pr.title, head: pr.head.ref, labels: pr.labels.map((l) => l.name), body: pr.body ?? "", files, patches };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const r = check(await load());
    console.log(r.ok ? `fix-needs-guard: ${r.why}` : `::error::fix-needs-guard: ${r.why}`);
    process.exit(r.ok ? 0 : 1);
  } catch (error) {
    // fail-open like changes.yml: a broken API call is never a reason to block a merge
    console.log(`::warning::fix-needs-guard could not read the pull request (${error.message}): passing`);
  }
}
