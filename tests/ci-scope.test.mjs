import test from "node:test";
import assert from "node:assert/strict";
import { SUITES, globToRegExp, scope, verdict } from "../scripts/ci-scope.mjs";

const on = (files) =>
  Object.entries(scope(files))
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();

test("globs: ** crosses folders, * stays in one", () => {
  assert.ok(globToRegExp("actions/**").test("actions/test/action.yml"));
  assert.ok(globToRegExp(".github/workflows/**").test(".github/workflows/node-ci.yml"));
  assert.ok(globToRegExp("tests/*.test.mjs").test("tests/a.test.mjs"));
  assert.ok(!globToRegExp("tests/*.test.mjs").test("tests/x/a.test.mjs"));
  assert.ok(!globToRegExp("scripts/x.mjs").test("scripts/xamjs"));
});

test("a docs-only change needs no suite", () => {
  assert.deepEqual(on(["README.md", "docs/adr/ADR-013-guards-and-local-sonar.md"]), []);
  assert.deepEqual(on(["docs/standards/ci-and-deploy.md"]), ["docs"], "a standard is checked by « docs are current »");
});

test("a workflow change needs the lint suite; a reusable CI workflow also the self-test", () => {
  assert.deepEqual(on([".github/workflows/seo-family.yml"]), ["lint"]);
  assert.deepEqual(on([".github/workflows/node-ci.yml"]), ["docs", "lint", "selftest"]);
});

test("each suite is triggered by its own files", () => {
  assert.ok(scope(["repos.json"]).registry);
  assert.ok(scope(["profile/README.md"]).names);
  assert.ok(scope(["profile/README.md"]).profile);
  assert.ok(scope(["scripts/roadmap-sync.mjs"]).roadmap);
  assert.ok(!scope(["scripts/roadmap-sync.mjs"]).names);
  assert.ok(scope(["tests/fixtures/node-app/package.json"]).selftest);
});

test("fail-open: an empty list, or a change to the gate itself, needs every suite", () => {
  const all = Object.keys(SUITES).sort();
  assert.deepEqual(on([]), all);
  assert.deepEqual(on([".github/workflows/ci-gate.yml"]), all);
  assert.deepEqual(on(["scripts/ci-scope.mjs"]), all);
});

const ids = Object.keys(SUITES);
const skipped = () => Object.fromEntries(ids.map((id) => [id, { result: "skipped" }]));
const needs = (answers, results) => ({ scope: { result: "success", outputs: answers }, ...skipped(), ...results });
const wanted = (...on) => Object.fromEntries(ids.map((id) => [id, String(on.includes(id))]));

test("verdict: green when every wanted suite succeeded and the others were skipped", () => {
  assert.deepEqual(verdict(needs(wanted(), {})), []);
  assert.deepEqual(verdict(needs(wanted("lint"), { lint: { result: "success" } })), []);
});

test("verdict: red on a failed, cancelled or unasked-skipped wanted suite", () => {
  for (const result of ["failure", "cancelled", "skipped"]) {
    assert.equal(verdict(needs(wanted("lint", "roadmap"), { lint: { result: "success" }, roadmap: { result } })).length, 1, result);
  }
});

test("verdict: an unwanted suite that failed is red; a broken scope asks for every suite", () => {
  assert.equal(verdict(needs(wanted(), { names: { result: "failure" } })).length, 1);
  assert.equal(verdict({ scope: { result: "failure", outputs: {} }, ...skipped() }).length, ids.length);
  const ok = Object.fromEntries(ids.map((id) => [id, { result: "success" }]));
  assert.deepEqual(verdict({ scope: { result: "failure", outputs: {} }, ...ok }), []);
});
