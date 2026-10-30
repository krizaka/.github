// The measure of code-health on small fixtures whose findings are known (krizaka/.github#384).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { distribution, isTestPath, perKloc, renderSummary, valueOf } from "../lib/stats.mjs";
import { collect, finish, measureTs } from "../lib/ts-health.mjs";
import { measureJava, toolPath } from "../code-health.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("distribution: mean, p95, max and the counts over each threshold", () => {
  const d = distribution([1, 2, 3, 4, 20], [3, 10]);
  assert.deepEqual(d, { count: 5, mean: 6, p50: 3, p95: 20, max: 20, over: { 3: 2, 10: 1 } });
  assert.deepEqual(distribution([], [1]), { count: 0, mean: 0, p50: 0, p95: 0, max: 0, over: { 1: 0 } });
});

test("valueOf reads ESLint's and sonarjs' messages", () => {
  assert.equal(valueOf("Function 'a' has a complexity of 12. Maximum allowed is 0."), 12);
  assert.equal(valueOf("Refactor this function to reduce its Cognitive Complexity from 16 to the 0 allowed."), 16);
  assert.equal(valueOf("Blocks are nested too deeply (5). Maximum allowed is 4."), 5);
  assert.equal(valueOf("Unnecessary conditional"), null);
});

test("tests, stories and fixtures are not main code", () => {
  for (const p of ["src/a.test.ts", "e2e/x.ts", "packages/ui/src/b.stories.tsx", "tests/c.ts", "src/__tests__/d.ts"]) assert.ok(isTestPath(p), p);
  for (const p of ["src/a.ts", "apps/web/lib/testing-mode.ts"]) assert.ok(!isTestPath(p), p);
  assert.equal(perKloc(3, 1500), 2);
});

test("collect keeps tests apart, reads metrics, counts parse failures; finish ranks the worst", () => {
  const acc = { files: 0, testFiles: 0, loc: 0, fatal: 0, rules: {}, testRules: {}, examples: {}, values: { cyclomatic: [], cognitive: [] }, top: { cyclomatic: [], cognitive: [] } };
  collect(acc, "src/a.ts", [
    { ruleId: "complexity", line: 3, message: "Function 'a' has a complexity of 12. Maximum allowed is 0." },
    { ruleId: "@typescript-eslint/prefer-optional-chain", line: 4, message: "x" },
    { ruleId: null, fatal: true, line: 1, message: "Parsing error" },
  ], 10);
  collect(acc, "src/a.test.ts", [{ ruleId: "@typescript-eslint/prefer-optional-chain", line: 1, message: "x" }], 0);
  const r = finish(acc, 1);
  assert.equal(r.files, 1);
  assert.equal(r.testFiles, 1);
  assert.equal(r.loc, 10);
  assert.equal(r.fatal, 1);
  assert.deepEqual(r.rules, { "@typescript-eslint/prefer-optional-chain": 1 });
  assert.deepEqual(r.testRules, { "@typescript-eslint/prefer-optional-chain": 1 });
  assert.deepEqual(r.top.cyclomatic, ["src/a.ts:3 (12)"]);
  assert.equal(r.cyclomatic.over[10], 1);
  assert.equal(r.values, undefined);
});

test("TypeScript: the candidate rules find the fixture's optional chain, nullish fallback and dead condition", async () => {
  const dir = join(FIXTURES, "ts");
  const r = await measureTs(dir, ["tsconfig.json", "src/sign-in.ts"]);
  assert.equal(r.files, 1);
  assert.equal(r.rules["@typescript-eslint/prefer-optional-chain"], 1);
  assert.equal(r.rules["@typescript-eslint/prefer-nullish-coalescing"], 1);
  assert.ok(r.rules["@typescript-eslint/no-unnecessary-condition"] >= 1);
  assert.equal(r.cyclomatic.count, 2);
  assert.ok(r.cyclomatic.max >= 4);
  assert.equal(r.fatal, 0);
});

test("Java: PMD metrics and the audit's counts on the fixture", () => {
  const dir = join(FIXTURES, "java");
  const files = ["src/main/java/demo/LoginController.java", "src/main/java/demo/SignInService.java"];
  const j = measureJava(dir, files, mkdtempSync(join(tmpdir(), "code-health-test-")));
  const c = j.counts;
  assert.equal(c.files, 2);
  assert.equal(c.discriminatorLadders, 1);
  assert.equal(c.stringSwitchExpressions, 1);
  assert.equal(c.controllersTouchingPersistence, 1);
  assert.equal(c.requestBodies, 2);
  assert.equal(c.requestBodiesRaw, 1);
  assert.equal(c.requestBodiesWithoutValid, 1);
  assert.equal(c.nonFinalServiceFields, 1);
  assert.equal(c.nullChecks, 5);
  assert.equal(c.nullChecksOnInjected, 2);
  assert.equal(c.methodsWith3PlusNullChecks, 1);
  assert.equal(c.utilsHelperClasses, 1);
  assert.equal(c.managerClasses, 1);
  assert.equal(c.sealedInterfaces, 1);
  assert.equal(c.records, 1);
  assert.equal(j.dist.CyclomaticComplexity.count, 4);
  assert.equal(j.dist.CyclomaticComplexity.max, 7);
  assert.ok(j.dist.CognitiveComplexity.count >= 2);
});

test("Java: a package named test under src/main/java is main code, src/test/java is not", () => {
  const files = ["src/main/java/com/krizaka/test/Rules.java", "src/test/java/demo/RulesTest.java"];
  const dir = mkdtempSync(join(tmpdir(), "code-health-layout-"));
  mkdirSync(join(dir, "src/main/java/com/krizaka/test"), { recursive: true });
  mkdirSync(join(dir, "src/test/java/demo"), { recursive: true });
  writeFileSync(join(dir, files[0]), "package com.krizaka.test;\nfinal class Rules {}\n");
  writeFileSync(join(dir, files[1]), "package demo;\nfinal class RulesTest {}\n");
  assert.equal(measureJava(dir, files, dir).counts.files, 1);
});

test("the summary renders both ecosystems", () => {
  const d = distribution([1], [10, 15, 25, 200]);
  const md = renderSummary({
    date: "2026-10-28",
    repos: [
      { repo: "a", sha: "1", ts: { files: 1, loc: 100, rules: {}, cyclomatic: d, cognitive: d }, java: null },
      { repo: "b", sha: "2", ts: null, java: { counts: { files: 1, loc: 10 }, dist: { CyclomaticComplexity: d, CognitiveComplexity: d, NPathComplexity: d } } },
    ],
  });
  assert.match(md, /## TypeScript/);
  assert.match(md, /## Java/);
  assert.match(md, /\| a \| 1 \|/);
  assert.match(md, /\| b \| 1 \|/);
});

test("tools are run by absolute path: <home>/bin, else /usr/bin", () => {
  assert.equal(toolPath("java", "/opt/jdk"), "/opt/jdk/bin/java");
  assert.equal(toolPath("git"), "/usr/bin/git");
  assert.equal(toolPath("mvn", ""), "/usr/bin/mvn");
});

test("the CLI refuses to run without --out", () => {
  assert.throws(() => execFileSync(process.execPath, [join(FIXTURES, "../../code-health.mjs")], { stdio: "pipe" }), (e) => e.status === 2);
});
