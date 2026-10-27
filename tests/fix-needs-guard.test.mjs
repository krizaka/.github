import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { check, lowersCap } from "../scripts/fix-needs-guard.mjs";

const fix = { title: "fix(billing): twice", head: "fix/x", labels: [], body: "", files: ["src/a.ts"] };

test("pass: a fix that changes a test", () => {
  assert.ok(check({ ...fix, files: ["src/a.ts", "src/a.test.ts"] }).ok);
});
test("pass: each guard family counts", () => {
  for (const f of ["rules/no-x.yml", "eslint.config.mjs", "sg-ratchet.json", "web/e2e/a.ts", "app/page-audit.mjs", "x/src/test/java/A.java", ".dependency-cruiser.cjs", "pkg/test_a.py"])
    assert.ok(check({ ...fix, files: [f] }).ok, f);
});
test("pass: ratchet, baseline and budget files count as guards", () => {
  for (const f of ["lint-ratchet.json", "web/lint-ratchet.json", "sg-ratchet.json", "perf-budgets.json", "apps/x/perf-budgets.json", "e2e-a11y-baseline.json", "pmd-baseline.properties", "svc/pmd-baseline.properties"])
    assert.ok(check({ ...fix, files: [f] }).ok, f);
});
test("pass: a package.json that lowers --max-warnings", () => {
  const patches = { "package.json": '-    "lint": "eslint . --max-warnings 40",\n+    "lint": "eslint . --max-warnings 32",' };
  assert.ok(check({ ...fix, files: ["package.json"], patches }).ok);
  assert.ok(lowersCap(patches["package.json"]));
});
test("fail: a package.json that raises or leaves --max-warnings", () => {
  assert.equal(check({ ...fix, files: ["package.json"], patches: { "package.json": '-  "lint": "eslint . --max-warnings 32",\n+  "lint": "eslint . --max-warnings 40",' } }).ok, false);
  assert.equal(check({ ...fix, files: ["package.json"], patches: { "package.json": '-  "v": "1",\n+  "v": "2",' } }).ok, false);
  assert.equal(check({ ...fix, files: ["package.json"] }).ok, false);
});
test("fail: a fix without a guard", () => {
  const r = check(fix);
  assert.equal(r.ok, false);
  assert.match(r.why, /guard-exempt/);
});
test("fail: the label without a reason", () => {
  assert.equal(check({ ...fix, labels: ["guard-exempt"], body: "typo" }).ok, false);
  assert.equal(check({ ...fix, labels: ["guard-exempt"], body: "Guard exemption:" }).ok, false);
});
test("fail: a reason without the label", () => {
  assert.equal(check({ ...fix, body: "Guard exemption: a typo in a message" }).ok, false);
});
test("exempted: label and reason", () => {
  assert.ok(check({ ...fix, labels: ["guard-exempt"], body: "x\nGuard exemption: wording of a message" }).ok);
});
test("skip: not a fix, releases", () => {
  assert.ok(check({ ...fix, title: "feat: x" }).ok);
  assert.ok(check({ ...fix, title: "fixture: x" }).ok);
  assert.ok(check({ ...fix, head: "release-please--branches--main" }).ok);
  assert.ok(check({ ...fix, head: "changeset-release/main" }).ok);
});
test("cli exit codes", () => {
  const run = (pr) => spawnSync(process.execPath, ["scripts/fix-needs-guard.mjs"], { env: { PATH: process.env.PATH, GUARD_TEST_PR: JSON.stringify(pr) }, encoding: "utf8" }).status;
  assert.equal(run(fix), 1);
  assert.equal(run({ ...fix, files: ["a.test.ts"] }), 0);
});
