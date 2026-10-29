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
  const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined };
  const programs = [];
  for (const rel of tsconfigs) {
    const path = join(repoDir, rel);
    const parsed = ts.getParsedCommandLineOfConfigFile(path, OVERRIDES, host);
    const files = (parsed?.fileNames ?? []).filter((f) => SOURCE.test(f) && !f.endsWith(".d.ts") && !f.includes("/node_modules/"));
    if (!files.length) continue;
    const options = { ...parsed?.options, ...OVERRIDES, jsx: parsed?.options.jsx ?? ts.JsxEmit.Preserve, types: [], configFilePath: path };
    programs.push(ts.createProgram({ rootNames: files, options }));
  }
  return programs;
}

/** The rule that measures a complexity, by ESLint rule id. */
const METRIC = { complexity: "cyclomatic", "sonarjs/cognitive-complexity": "cognitive" };

const bump = (counts, key) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

/** Accumulates the messages of one linted file into the measure. */
export function collect(acc, rel, messages, loc) {
  const test = isTestPath(rel);
  if (test) acc.testFiles++;
  else {
    acc.files++;
    acc.loc += loc;
  }
  for (const m of messages) {
    if (m.fatal || !m.ruleId) bump(acc, "fatal");
    else if (test) bump(acc.testRules, m.ruleId);
    else if (METRIC[m.ruleId]) addMetric(acc, METRIC[m.ruleId], valueOf(m.message), `${rel}:${m.line}`);
    else addHit(acc, m.ruleId, `${rel}:${m.line}`);
  }
}

function addMetric(acc, key, value, where) {
  if (value === null) return;
  acc.values[key].push(value);
  acc.top[key].push([value, where]);
}

function addHit(acc, ruleId, where) {
  bump(acc.rules, ruleId);
  const examples = acc.examples[ruleId] ?? [];
  acc.examples[ruleId] = examples;
  if (examples.length < 5) examples.push(where);
}

/** The accumulated measure, with its distributions and the three worst functions per metric. */
export function finish(acc, programs) {
  const top = (key) => acc.top[key].sort((a, b) => b[0] - a[0]).slice(0, 3).map(([v, w]) => w + " (" + v + ")");
  const { values, ...rest } = acc;
  return {
    ...rest,
    top: { cyclomatic: top("cyclomatic"), cognitive: top("cognitive") },
    cyclomatic: distribution(values.cyclomatic, [10, 15]),
    cognitive: distribution(values.cognitive, [15, 25]),
    programs,
  };
}

function linter(repoDir, programs) {
  return new ESLint({
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
}

const nonBlankLines = (path) => readFileSync(path, "utf8").split("\n").filter((l) => l.trim()).length;

/** Lints the repository's TypeScript and returns the counts (main and test apart) and the complexity distributions. */
export async function measureTs(repoDir, trackedFiles) {
  const tsconfigs = trackedFiles.filter((f) => /(^|\/)tsconfig\.json$/.test(f) && !f.includes("node_modules/") && !isTestPath(f));
  const programs = programsFor(repoDir, tsconfigs);
  const tracked = new Set(trackedFiles.map((f) => join(repoDir, f)));
  const files = [...new Set(programs.flatMap((p) => p.getRootFileNames()))].filter((f) => tracked.has(f));
  const eslint = linter(repoDir, programs);
  const acc = { files: 0, testFiles: 0, loc: 0, fatal: 0, rules: {}, testRules: {}, examples: {}, values: { cyclomatic: [], cognitive: [] }, top: { cyclomatic: [], cognitive: [] } };
  const CHUNK = 200;
  for (let i = 0; i < files.length; i += CHUNK) {
    for (const r of await eslint.lintFiles(files.slice(i, i + CHUNK))) {
      const rel = relative(repoDir, r.filePath);
      collect(acc, rel, r.messages, isTestPath(rel) ? 0 : nonBlankLines(r.filePath));
    }
  }
  return finish(acc, programs.length);
}
