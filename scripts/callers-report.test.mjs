import test from "node:test";
import assert from "node:assert/strict";
import { callsIn, compareTags, isStale } from "./callers-report.mjs";

const sha = "a".repeat(40);

test("callsIn reads the workflow, the pinned SHA and the tag comment", () => {
  const text = `jobs:\n  ci:\n    uses: krizaka/.github/.github/workflows/node-ci.yml@${sha} # v1.4.0\n  x:\n    uses: actions/checkout@${sha} # v7\n`;
  assert.deepEqual(callsIn(text), [{ workflow: "node-ci.yml", sha, tag: "v1.4.0" }]);
  assert.deepEqual(callsIn(`uses: krizaka/.github/.github/workflows/maven.yml@${sha}`), [{ workflow: "maven.yml", sha, tag: null }]);
});

test("compareTags orders releases numerically", () => {
  assert.ok(compareTags("v1.10.0", "v1.9.9") > 0);
  assert.ok(compareTags("v1.3.1", "v1.3.1") === 0);
  assert.ok(compareTags("v1.3", "v1.3.1") < 0);
});

test("a call is stale when it is not pinned to the latest release commit", () => {
  assert.equal(isStale({ sha, tag: "v1.3.0" }, { sha }), false);
  assert.equal(isStale({ sha, tag: "v1.3.0" }, { sha: "b".repeat(40) }), true);
  assert.equal(isStale({ sha, tag: "main" }, { sha: "b".repeat(40) }), false, "a branch pin is Dependabot's");
});
