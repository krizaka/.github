// The reviewed scope of the org secrets (krizaka-restricted#372, slice 2): the scope is built from the usage, the diff against the
// live state says what the apply changes, and the check fails when the checked-in file differs from the usage. Pure functions, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { buildScope, checkScope, renderScope, scopeDiff } from "../scripts/org-secrets-scope.mjs";

const usage = (names, unknown = []) => ({ used: new Map(names.map((n) => [n, "f:1"])), inherits: [], unknown });
const SECRETS = [{ name: "NPM_TOKEN" }, { name: "OLD_KEY" }, { name: "SONAR_TOKEN" }];
const REPOS = [
  { name: "krizaka-ui", usage: usage(["NPM_TOKEN", "SONAR_TOKEN"]) },
  { name: ".github", usage: usage(["SONAR_TOKEN"]) },
  { name: "odd", usage: usage([], ["a computed lookup"]) },
];

test("buildScope: each secret is selected, with the sorted repositories that use it; a repo not judged counts as a user", () => {
  assert.deepEqual(buildScope(SECRETS, REPOS), {
    NPM_TOKEN: { visibility: "selected", repositories: ["krizaka-ui", "odd"] },
    OLD_KEY: { visibility: "selected", repositories: ["odd"] },
    SONAR_TOKEN: { visibility: "selected", repositories: [".github", "krizaka-ui", "odd"] },
  });
});

test("buildScope: a secret nobody uses has zero repositories (not deleted)", () => {
  assert.deepEqual(buildScope([{ name: "DEAD" }], [{ name: "a", usage: usage(["X"]) }]), { DEAD: { visibility: "selected", repositories: [] } });
});

test("renderScope: sorted by secret name, stable, ends with a newline, names only", () => {
  const text = renderScope({ B: { visibility: "selected", repositories: ["x"] }, A: { visibility: "selected", repositories: [] } });
  assert.deepEqual(Object.keys(JSON.parse(text).secrets), ["A", "B"]);
  assert.ok(text.endsWith("}\n"));
  assert.equal(renderScope(JSON.parse(text).secrets), text);
});

test("scopeDiff: visibility before/after and repositories added/removed, per secret", () => {
  const current = [
    { name: "NPM_TOKEN", visibility: "all", repos: null },
    { name: "SONAR_TOKEN", visibility: "selected", repos: ["krizaka-ui", "stale"] },
    { name: "DONE", visibility: "selected", repos: ["a"] },
  ];
  const desired = {
    NPM_TOKEN: { visibility: "selected", repositories: ["krizaka-ui"] },
    SONAR_TOKEN: { visibility: "selected", repositories: [".github", "krizaka-ui"] },
    DONE: { visibility: "selected", repositories: ["a"] },
  };
  assert.deepEqual(scopeDiff(current, desired), [
    { name: "NPM_TOKEN", before: "all", after: "selected", add: ["krizaka-ui"], remove: [], changed: true },
    { name: "SONAR_TOKEN", before: "selected", after: "selected", add: [".github"], remove: ["stale"], changed: true },
    { name: "DONE", before: "selected", after: "selected", add: [], remove: [], changed: false },
  ]);
});

test("scopeDiff: a secret the scope does not name, or one that does not exist, is a problem rather than a silent skip", () => {
  const diff = scopeDiff([{ name: "NEW", visibility: "all", repos: null }], { GONE: { visibility: "selected", repositories: [] } });
  assert.deepEqual(diff.map((d) => [d.name, d.problem]), [["NEW", "not in the scope file"], ["GONE", "in the scope file, not in the organization"]]);
});

test("checkScope: empty when the file is the usage, one line per difference otherwise", () => {
  const want = { A: { visibility: "selected", repositories: ["x", "y"] }, B: { visibility: "selected", repositories: [] } };
  assert.deepEqual(checkScope(want, want), []);
  const file = { A: { visibility: "selected", repositories: ["x", "z"] }, C: { visibility: "selected", repositories: [] } };
  assert.deepEqual(checkScope(file, want), [
    "A: the file lists z, the usage does not",
    "A: the usage needs y, the file does not list it",
    "B: the usage has it, the file does not",
    "C: the file has it, the usage does not",
  ]);
});

import { applyOne, applyPlan, gesture, renderDiff } from "../scripts/org-secrets-apply.mjs";

test("applyPlan: a selected secret is written by the API, any other visibility is a manual gesture (no endpoint changes it without the value)", () => {
  const diff = [
    { name: "A", before: "all", after: "selected", add: ["x"], remove: [], changed: true },
    { name: "B", before: "selected", after: "selected", add: ["x"], remove: [], changed: true },
    { name: "C", before: "selected", after: "selected", add: [], remove: [], changed: false },
  ];
  const plan = applyPlan(diff);
  assert.deepEqual(plan.api.map((d) => d.name), ["B"]);
  assert.deepEqual(plan.manual.map((d) => d.name), ["A"]);
  assert.equal(gesture(diff[0], { A: { repositories: [] } }), "A: Repository access → Selected repositories → none (zero repositories)");
  assert.match(renderDiff(diff, { A: { repositories: ["x"] }, B: { repositories: ["x"] }, C: { repositories: [] } })[0], /visibility all → selected; add \[x\]/);
});

test("applyOne: writes the ids, re-reads, and stops at a mismatch", async () => {
  const d = { name: "B" };
  const desired = { B: { repositories: ["b", "a"] } };
  const calls = [];
  const ok = async (m, p, body) => (calls.push([m, body]), m === "GET" ? { repositories: [{ name: "b" }, { name: "a" }] } : null);
  await applyOne(d, desired, ok, async (n) => n.charCodeAt(0));
  assert.deepEqual(calls[0], ["PUT", { selected_repository_ids: [97, 98] }]);
  const bad = async (m) => (m === "GET" ? { repositories: [{ name: "a" }] } : null);
  await assert.rejects(applyOne(d, desired, bad, async () => 1), /after the write the list is \[a\], expected \[a, b\]/);
});
