import { test } from "node:test";
import assert from "node:assert/strict";
import { decideStatus, plan } from "../scripts/roadmap-sync.mjs";

const pr = (state, isDraft = false) => ({ state, isDraft });

test("a closed issue is Done, and nothing changes when it already is", () => {
  assert.equal(decideStatus({ state: "CLOSED", current: "In review" }), "Done");
  assert.equal(decideStatus({ state: "CLOSED", current: null }), "Done");
  assert.equal(decideStatus({ state: "CLOSED", current: "Done" }), null);
});

test("an open issue with an open pull request is In review; a draft pull request is In progress", () => {
  assert.equal(decideStatus({ state: "OPEN", prs: [pr("OPEN")], current: "Next" }), "In review");
  assert.equal(decideStatus({ state: "OPEN", prs: [pr("OPEN", true)], current: "Backlog" }), "In progress");
  assert.equal(decideStatus({ state: "OPEN", prs: [pr("OPEN", true), pr("OPEN")], current: "In progress" }), "In review");
  assert.equal(decideStatus({ state: "OPEN", prs: [pr("OPEN")], current: "In review" }), null);
});

test("merged or closed pull requests do not count as open work", () => {
  assert.equal(decideStatus({ state: "OPEN", prs: [pr("MERGED"), pr("CLOSED")], current: "Next" }), null);
});

test("a reopened issue or an abandoned review goes back to Next; planning columns are never touched", () => {
  assert.equal(decideStatus({ state: "OPEN", prs: [], current: "Done" }), "Next");
  assert.equal(decideStatus({ state: "OPEN", prs: [pr("CLOSED")], current: "In review" }), "Next");
  for (const s of ["Backlog", "Next", "In progress", null]) assert.equal(decideStatus({ state: "OPEN", prs: [], current: s }), null);
});

test("plan lists only the items whose Status should change", () => {
  const items = [
    { key: "a#1", itemId: "i1", state: "CLOSED", status: "Next", prs: [] },
    { key: "a#2", itemId: "i2", state: "OPEN", status: "Next", prs: [] },
    { key: "a#3", itemId: "i3", state: "OPEN", status: "Next", prs: [pr("OPEN")] },
  ];
  assert.deepEqual(plan(items), [
    { key: "a#1", itemId: "i1", from: "Next", to: "Done" },
    { key: "a#3", itemId: "i3", from: "Next", to: "In review" },
  ]);
});
