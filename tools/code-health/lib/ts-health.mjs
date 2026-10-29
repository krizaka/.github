// code-health, the TypeScript side: ESLint (programmatic, type-aware) with the audit's candidate rules, over one
// TypeScript program per tracked tsconfig.json of the repository, `strict` forced on. Read-only.
//
// The checkouts carry no node_modules, so imported packages resolve to `any` and the type-aware rules cannot see
// through them: every count here is a LOWER bound of what the same rules report in the repository's own CI.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import { distribution, isTestPath, valueOf } from "./stats.mjs";

/** The candidate rules (.github#384). Complexity rules report every function so that the distribution can be read. */
export const TS_RULES = {
  "@typescript-eslint/no-unnecessary-condition": "error",
  "@typescript-eslint/prefer-optional-chain": "error",
  "@typescript-eslint/prefer-nullish-coalescing": "error",
  complexity: ["error", { max: 0 }],
  "sonarjs/cognitive-complexity": ["error", 0],
  "max-depth": ["error", { max: 4 }],
};

const SOURCE = /\.(ts|tsx|mts|cts)$/;
const OVERRIDES = { strict: true, strictNullChecks: true, noEmit: true, skipLibCheck: true, allowJs: false, incremental: false, composite: false };

/** One program per tsconfig; a tsconfig whose `extends` cannot resolve (no node_modules) still gives its files. */
export function programsFor(repoDir, tsconfigs) {
  const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} };
  const programs = [];
  for (const rel of tsconfigs) {
    const path = join(repoDir, rel);
    const parsed = ts.getParsedCommandLineOfConfigFile(path, OVERRIDES, host);
    const files = (parsed?.fileNames ?? []).filter((f) => SOURCE.test(f) && !f.endsWith(".d.ts") && !f.includes("/node_modules/"));
    if (!files.length) continue;
    const options = { ...(parsed?.options ?? {}), ...OVERRIDES, jsx: parsed?.options.jsx ?? ts.JsxEmit.Preserve, types: [], configFilePath: path };
    programs.push(ts.createProgram({ rootNames: files, options }));
  }
  return programs;
}

/** Lints the repository's TypeScript and returns the counts (main and test apart) and the complexity distributions. */
export async function measureTs(repoDir, trackedFiles) {
  const tsconfigs = trackedFiles.filter((f) => /(^|\/)tsconfig\.json$/.test(f) && !f.includes("node_modules/") && !isTestPath(f));
  const programs = programsFor(repoDir, tsconfigs);
  const tracked = new Set(trackedFiles.map((f) => join(repoDir, f)));
  const files = [...new Set(programs.flatMap((p) => p.getRootFileNames()))].filter((f) => tracked.has(f));
  const eslint = new ESLint({
    cwd: repoDir,
    overrideConfigFile: true,
    errorOnUnmatchedPattern: false,
    overrideConfig: [
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
        languageOptions: { parser: tseslint.parser, parserOptions: { programs, ecmaFeatures: { jsx: true } } },
        linterOptions: { reportUnusedDisableDirectives: "off", noInlineConfig: true },
        plugins: { "@typescript-eslint": tseslint.plugin, sonarjs },
        rules: TS_RULES,
      },
    ],
  });
  const result = { files: 0, testFiles: 0, loc: 0, rules: {}, testRules: {}, examples: {}, cyclomaticValues: [], cognitiveValues: [], top: { cyclomatic: [], cognitive: [] }, fatal: 0 };
  const CHUNK = 200;
  for (let i = 0; i < files.length; i += CHUNK) {
    for (const r of await eslint.lintFiles(files.slice(i, i + CHUNK))) {
      const rel = relative(repoDir, r.filePath);
      const test = isTestPath(rel);
      if (test) result.testFiles++;
      else {
        result.files++;
        result.loc += readFileSync(r.filePath, "utf8").split("\n").filter((l) => l.trim()).length;
      }
      for (const m of r.messages) {
        if (m.fatal || !m.ruleId) { result.fatal++; continue; }
        if (test) { result.testRules[m.ruleId] = (result.testRules[m.ruleId] ?? 0) + 1; continue; }
        const where = `${rel}:${m.line}`;
        if (m.ruleId === "complexity" || m.ruleId === "sonarjs/cognitive-complexity") {
          const v = valueOf(m.message);
          if (v === null) continue;
          const key = m.ruleId === "complexity" ? "cyclomatic" : "cognitive";
          result[`${key}Values`].push(v);
          result.top[key].push([v, where]);
          continue;
        }
        result.rules[m.ruleId] = (result.rules[m.ruleId] ?? 0) + 1;
        (result.examples[m.ruleId] ??= []).length < 5 && result.examples[m.ruleId].push(where);
      }
    }
  }
  for (const key of ["cyclomatic", "cognitive"]) {
    result.top[key] = result.top[key].sort((a, b) => b[0] - a[0]).slice(0, 3).map(([v, w]) => `${w} (${v})`);
  }
  result.cyclomatic = distribution(result.cyclomaticValues, [10, 15]);
  result.cognitive = distribution(result.cognitiveValues, [15, 25]);
  delete result.cyclomaticValues;
  delete result.cognitiveValues;
  result.programs = programs.length;
  return result;
}

