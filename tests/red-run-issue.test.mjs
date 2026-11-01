// A red scheduled guard opens an issue; green closes it (krizaka-internal#883). And the matrix page names its run.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bodyOf, plan, titleOf } from "../scripts/red-run-issue.mjs";
import { BRANCH, pageOf } from "../scripts/conformance-publish.mjs";

test("red opens the guard's issue, or comments when it is already open", () => {
  assert.deepEqual(plan({ state: "red", open: undefined }), { action: "open" });
  assert.deepEqual(plan({ state: "red", open: { number: 12 } }), { action: "comment", number: 12 });
});

test("green closes the open issue, and does nothing otherwise", () => {
  assert.deepEqual(plan({ state: "green", open: { number: 12 } }), { action: "close", number: 12 });
  assert.deepEqual(plan({ state: "green", open: undefined }), { action: "none" });
});

test("the issue follows the title standard and carries the run and the end of the log", () => {
  assert.match(titleOf("audit-guards"), /^\.github · fix\(guards\): /);
  const body = bodyOf({ guard: "audit-guards", runUrl: "https://x/run/1", log: "a\n- krizaka-build: CI gate is not a required check of main\n" });
  assert.match(body, /https:\/\/x\/run\/1/);
  assert.match(body, /CI gate is not a required check/);
});

test("the matrix page says when and by which run; it is published on its data branch", () => {
  assert.equal(BRANCH, "conformance-matrix");
  const page = pageOf({ generatedAt: "2026-11-01T06:00:00Z", runUrl: "https://x/run/2", matrix: "| rule | green | red |\n" });
  assert.match(page, /Generated 2026-11-01T06:00:00Z by https:\/\/x\/run\/2/);
  assert.match(page, /\| rule \| green \| red \|/);
});

test("the scheduled guards are wired: audit-guards opens its issue, the matrix runs daily and publishes", () => {
  const audit = readFileSync(new URL("../.github/workflows/audit-guards.yml", import.meta.url), "utf8");
  assert.match(audit, /red-run-issue\.mjs --guard audit-guards/);
  assert.match(audit, /permission-issues: write/);
  const conf = readFileSync(new URL("../.github/workflows/conformance.yml", import.meta.url), "utf8");
  assert.match(conf, /cron: "0 6 \* \* \*"/);
  assert.match(conf, /conformance-publish\.mjs/);
});
