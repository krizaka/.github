import test from "node:test";
import assert from "node:assert/strict";

test("the fixture's environment comes from .krizaka/ci.json", () => {
  assert.equal(process.env.FIXTURE_FLAG, "on");
});
