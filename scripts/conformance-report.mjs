// WHY  The matrix is read by people (a markdown table) and by tools (the cockpit, session-start, the checkpoint read the JSON): one place builds both from the same cells.
// WHAT `ruleLink`, `reportOf` (the machine-readable matrix) and `render` (markdown).
// HOW  Imported by scripts/conformance.mjs (which re-exports it); run `node scripts/conformance.mjs` for the matrix, `--json out.json` for the report. Tests: tests/conformance.test.mjs.
// OWNER krizaka/.github (lane platform), ADR-026 phase D. Entry point: scripts/conformance.mjs.

import { byCodePoint, STATUSES } from "./conformance-basics.mjs";
import { isSecurity } from "./conformance-registry.mjs";

/** Where a rule's text lives: rules.json at the registry's commit (or main), scrolled to its id. */
export function ruleLink(id, commit = "main") {
  const anchor = encodeURIComponent(`"id": "${id}"`);
  return `https://github.com/krizaka/.github/blob/${commit}/docs/standards/rules.json#:~:text=${anchor}`;
}

/**
 * The machine-readable matrix (what the cockpit, session-start and the checkpoint read): pure, so the same cells give the same text.
 * `results` is one line per cell: rule x repo x commit x check x status x evidence x run date x link to the rule.
 */
export function reportOf({ rules, cells, summary, versions = {}, paused = [], generatedAt, runUrl = null, rulesCommit = null }) {
  const repos = Object.keys(cells).sort(byCodePoint);
  const link = (id) => ruleLink(id, rulesCommit ?? "main");
  const results = repos.flatMap((repo) =>
    rules
      .filter((rule) => cells[repo][rule.id])
      .map((rule) => {
        const c = cells[repo][rule.id];
        return { rule: rule.id, repo, commit: c.commit, check: c.check, status: c.status, why: c.why, evidence: c.evidence, runDate: generatedAt, link: link(rule.id) };
      }),
  );
  return {
    schema: 2,
    generatedAt,
    runUrl,
    rulesCommit,
    statuses: STATUSES,
    rules: rules.map((r) => ({ id: r.id, title: r.title, issue: r.issue, security: r.security === true, check: r.check.type, link: link(r.id) })),
    repos: Object.fromEntries(repos.map((repo) => [repo, { commit: Object.values(cells[repo])[0]?.commit ?? null }])),
    summary,
    cells: Object.fromEntries(repos.map((repo) => [repo, cells[repo]])),
    results,
    versions,
    outOfScope: paused.map((r) => r.name),
  };
}

/** The matrix as markdown: counts per rule, then the red cells per repository, then the repositories out of scope. */
export function render(rules, cells, summary, paused = []) {
  const lines = ["| rule | pass | fail | unknown | manual |", "|---|---:|---:|---:|---:|"];
  for (const s of summary) lines.push(`| ${s.id} | ${s.pass} | ${s.fail} | ${s.unknown} | ${s.manual} |`);
  const total = summary.reduce((acc, s) => ({ p: acc.p + s.pass, f: acc.f + s.fail, u: acc.u + s.unknown, m: acc.m + s.manual }), { p: 0, f: 0, u: 0, m: 0 });
  lines.push(`| **all** | **${total.p}** | **${total.f}** | **${total.u}** | **${total.m}** |`, "", "| repo | commit | failing rules | unknown |", "|---|---|---|---|");
  for (const repo of Object.keys(cells).sort(byCodePoint)) {
    const row = cells[repo];
    const of = (st) => Object.entries(row).filter(([, c]) => c.status === st).map(([id]) => id);
    const commit = Object.values(row)[0]?.commit?.slice(0, 7) ?? "?";
    lines.push(`| ${repo} | ${commit} | ${of("fail").join(", ") || "none"} | ${of("unknown").join(", ") || "none"} |`);
  }
  if (paused.length) lines.push("", `Out of scope (paused or archived): ${paused.map((r) => r.name).join(", ")}.`);
  const security = rules.filter(isSecurity).map((r) => r.id);
  lines.push("", `Same-day rollout (security rules): ${security.join(", ") || "none"}. The other rules are reported here, never fanned out.`);
  return lines.join("\n");
}

