// Pure helpers of code-health: distributions, the values in rule messages, and the Markdown summary.

/** count · mean · p50 · p95 · max · how many values exceed each threshold. */
export function distribution(values, thresholds = []) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const at = (q) => (n ? sorted[Math.min(n - 1, Math.ceil(q * n) - 1)] : 0);
  const over = Object.fromEntries(thresholds.map((t) => [t, sorted.filter((v) => v > t).length]));
  const mean = n ? Math.round((sorted.reduce((s, v) => s + v, 0) / n) * 100) / 100 : 0;
  return { count: n, mean, p50: at(0.5), p95: at(0.95), max: n ? sorted[n - 1] : 0, over };
}

/** The measured value in an ESLint message: `complexity of 12`, `Cognitive Complexity from 16 to`, `nested too deeply (5)`. */
export function valueOf(message) {
  const m = /complexity of (\d+)|Complexity from (\d+)|deeply \((\d+)\)/i.exec(message);
  return m ? Number(m[1] ?? m[2] ?? m[3]) : null;
}

/** Test, story, fixture and e2e files are counted apart from main code. */
export const isTestPath = (path) =>
  /(^|\/)(test|tests|__tests__|e2e|fixtures|rule-tests|stories)\//.test(path) || /\.(test|spec|stories|e2e)\.[cm]?[jt]sx?$/.test(path);

/** Hits per thousand non-blank lines, one decimal. */
export const perKloc = (hits, loc) => (loc ? Math.round((hits / loc) * 10000) / 10 : 0);

const fmt = (d, t) => `${d.count} · ${d.mean} · ${d.p95} · ${d.max} · ${d.over[t] ?? 0}`;

/** The Markdown summary of a measure (the JSON written by code-health.mjs). */
export function renderSummary(measure) {
  const out = [`# Code health — measured ${measure.date}`, "", `Checkouts: ${measure.repos.map((r) => `${r.repo}@${r.sha}`).join(", ")}.`, ""];
  const ts = measure.repos.filter((r) => r.ts);
  if (ts.length) {
    out.push(
      "## TypeScript (main code; type-aware, strict, without the repositories' node_modules: a lower bound)",
      "",
      "| Repo | files | kLOC | no-unnecessary-condition | prefer-optional-chain | prefer-nullish-coalescing | max-depth > 4 | cyclomatic n · mean · p95 · max · >10 | cognitive n · mean · p95 · max · >15 |",
      "|---|---:|---:|---:|---:|---:|---:|---|---|",
    );
    for (const r of ts) {
      const t = r.ts;
      const h = (k) => `${t.rules[k] ?? 0} (${perKloc(t.rules[k] ?? 0, t.loc)}/k)`;
      out.push(
        `| ${r.repo} | ${t.files} | ${Math.round(t.loc / 100) / 10} | ${h("@typescript-eslint/no-unnecessary-condition")} | ${h("@typescript-eslint/prefer-optional-chain")} | ${h("@typescript-eslint/prefer-nullish-coalescing")} | ${t.rules["max-depth"] ?? 0} | ${fmt(t.cyclomatic, 10)} | ${fmt(t.cognitive, 15)} |`,
      );
    }
    const fatal = ts.reduce((s, r) => s + (r.ts.fatal ?? 0), 0);
    out.push("", `Files ESLint could not parse without the repositories' dependencies: ${fatal}. Thresholds read: cyclomatic > 10, cognitive > 15 (Sonar S3776).`, "");
  }
  const java = measure.repos.filter((r) => r.java);
  if (java.length) {
    const keys = [
      ["nullChecks", "null checks"],
      ["requireNonNull", "`requireNonNull`"],
      ["nullChecksOnInjected", "on injected deps"],
      ["methodsWith3PlusNullChecks", "methods ≥ 3 null checks"],
      ["discriminatorLadders", "string/constant `if` ladders ≥ 3"],
      ["stringSwitchStatements", "string `switch` statements"],
      ["stringSwitchExpressions", "string `switch` expressions"],
      ["utilsHelperClasses", "`*Utils/*Helper`"],
      ["managerClasses", "`*Manager`"],
      ["controllersTouchingPersistence", "controllers → persistence"],
      ["requestBodiesWithoutValid", "`@RequestBody` DTO without `@Valid`"],
      ["nonFinalServiceFields", "non-final service fields"],
      ["fieldInjection", "`@Autowired` fields"],
    ];
    out.push("## Java (main code; PMD 7 metrics + javaparser counts)", "", `| Repo | files | kLOC | ${keys.map(([, l]) => l).join(" | ")} |`, `|---|---:|---:|${keys.map(() => "---:").join("|")}|`);
    for (const r of java) {
      const c = r.java.counts;
      out.push(`| ${r.repo} | ${c.files ?? 0} | ${Math.round((c.loc ?? 0) / 100) / 10} | ${keys.map(([k]) => c[k] ?? 0).join(" | ")} |`);
    }
    out.push("", "| Repo | cyclomatic n · mean · p95 · max · >10 | cognitive n · mean · p95 · max · >15 | NPath n · mean · p95 · max · >200 | records | sealed | switch expr. | pattern switches | `instanceof` patterns |", "|---|---|---|---|---:|---:|---:|---:|---:|");
    for (const r of java) {
      const c = r.java.counts;
      const m = r.java.dist;
      out.push(
        `| ${r.repo} | ${fmt(m.CyclomaticComplexity, 10)} | ${fmt(m.CognitiveComplexity, 15)} | ${fmt(m.NPathComplexity, 200)} | ${c.records ?? 0} | ${(c.sealedInterfaces ?? 0) + (c.sealedClasses ?? 0)} | ${c.switchExpressions ?? 0} | ${c.patternSwitches ?? 0} | ${c.instanceofPatterns ?? 0} |`,
      );
    }
    out.push("");
  }
  return out.join("\n");
}
