// Rule: no-github-packages-url (krizaka-internal#2701, ADR-021)
import test from "node:test";
import assert from "node:assert/strict";
import { loadRules, runCheck, snapshotOf } from "../scripts/conformance.mjs";

const snap = (name, kind, files) => snapshotOf(name, kind, Object.keys(files), async (p) => files[p]);
const withScan = (hits) => ({ ...snap("x", "app", { a: "" }), scan: async () => hits });

test("no-github-packages-url: the rule is in the registry", () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  assert.ok(rule, "rule exists");
  assert.equal(rule.check.type, "no-mention");
});

test("no-github-packages-url: fails when a non-allowed file contains maven.pkg.github.com", async () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  const red = await runCheck(rule.check, withScan([".github/workflows/java-ci.yml"]));
  assert.equal(red.ok, false);
  assert.match(red.why, /java-ci\.yml/);
});

test("no-github-packages-url: fails when a non-allowed file contains npm.pkg.github.com", async () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  const red = await runCheck(rule.check, withScan(["scripts/publish.mjs"]));
  assert.equal(red.ok, false);
});

test("no-github-packages-url: passes when scan returns no hits", async () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  assert.deepEqual(await runCheck(rule.check, withScan([])), { ok: true, why: "" });
});

test("no-github-packages-url: passes when the only hit is in docs/ (history)", async () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  assert.deepEqual(await runCheck(rule.check, withScan(["docs/standards/ci-and-deploy.md"])), { ok: true, why: "" });
});

test("no-github-packages-url: passes when the only hit is a CHANGELOG file (history)", async () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  assert.deepEqual(await runCheck(rule.check, withScan(["CHANGELOG.md"])), { ok: true, why: "" });
});

test("no-github-packages-url: offline (no scan) is unknown (null)", async () => {
  const rule = loadRules().find((r) => r.id === "no-github-packages-url");
  assert.equal((await runCheck(rule.check, snap("x", "app", { a: "" }))).ok, null);
});
