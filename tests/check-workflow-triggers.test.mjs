import { test } from "node:test";
import assert from "node:assert/strict";
import { check, violations } from "../scripts/check-workflow-triggers.mjs";

const checkout = (ref) => `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@abc\n        with:\n          ref: ${ref}\n`;

test("workflow_run + checkout of its head_sha is refused, even with a zizmor ignore comment", () => {
  const src = `on:\n  workflow_run: # zizmor: ignore[dangerous-triggers] fine\n    workflows: [CI]\n${checkout("${{ github.event.workflow_run.head_sha }}")}`;
  assert.equal(violations("x.yml", src).length, 1);
});
test("pull_request_target + checkout of the pull request head is refused", () => {
  const src = `on:\n  pull_request_target:\n    types: [opened]\n${checkout("${{ github.event.pull_request.head.sha }}")}`;
  assert.equal(violations("x.yml", src).length, 1);
});
test("pull_request_target without a checkout of the head (dependabot-automerge) is fine", () => {
  assert.deepEqual(violations("x.yml", "on:\n  pull_request_target:\njobs:\n  a:\n    steps:\n      - run: echo hi\n"), []);
});
test("a schedule workflow checking out main is fine, and a comment mentioning workflow_run does not count", () => {
  const src = `# no workflow_run here\non:\n  schedule:\n    - cron: "1 1 * * *"\n${checkout("main")}`;
  assert.deepEqual(violations("x.yml", src), []);
});
test("this repository's own workflows pass", () => {
  assert.deepEqual(check(new URL("../.github/workflows", import.meta.url).pathname), []);
});
