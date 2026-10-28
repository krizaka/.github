import { test } from "node:test";
import assert from "node:assert/strict";
import { blocking, findings } from "../scripts/osv-gate.mjs";

const report = (sev) => ({ results: [{ source: { path: "/r/pnpm-lock.yaml" }, packages: [{ package: { name: "undici", version: "8.12.1" }, groups: [{ ids: ["GHSA-x"], max_severity: sev }] }] }] });

test("a high or critical finding blocks", () => {
  assert.equal(blocking(findings(report("7.4"))).length, 1);
  assert.equal(blocking(findings(report("9.8"))).length, 1);
});
test("a medium, low or unscored finding is listed, not blocking", () => {
  assert.equal(blocking(findings(report("6.9"))).length, 0);
  assert.equal(blocking(findings(report(""))).length, 0);
});
test("a clean report has no finding", () => {
  assert.deepEqual(findings({ results: [] }), []);
  assert.deepEqual(findings({}), []);
});
