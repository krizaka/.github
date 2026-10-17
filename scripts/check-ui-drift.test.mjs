import { test } from "node:test";
import assert from "node:assert/strict";
import { lowerBound, minorOf, status } from "./check-ui-drift.mjs";

test("lowerBound reads the floor of a range", () => {
  assert.equal(lowerBound("^3.18.2"), "3.18.2");
  assert.equal(lowerBound("3.11.0"), "3.11.0");
  assert.equal(lowerBound(">=0.2.1"), "0.2.1");
  assert.equal(lowerBound("workspace:*"), null);
  assert.equal(lowerBound("*"), null);
});

test("minorOf keeps major.minor", () => assert.equal(minorOf("3.21.4"), "3.21"));

test("status compares minors, ignores workspace ranges", () => {
  assert.equal(status("^3.21.0", "3.21.2"), "ok");
  assert.equal(status("^3.20.0", "3.21.0"), "behind");
  assert.equal(status("workspace:*", "3.21.0"), "n/a");
});
