import test from "node:test";
import assert from "node:assert/strict";
import { isOurs, offenders, total, summary, renderReport, plan, SAFE_PATH } from "../scripts/check-public-issues-ours.mjs";

const issue = (login, number, extra = {}) => ({ number, user: { login }, ...extra });

test("isOurs: the founder, the apps and the Actions bot; not the public, not pull requests", () => {
  for (const l of ["oussamaABID", "Wu-sama", "krizaka-agents[bot]", "orazaka[bot]", "github-actions[bot]"]) assert.equal(isOurs(issue(l, 1)), true, l);
  for (const l of ["someone", "dependabot[bot]", "copilot"]) assert.equal(isOurs(issue(l, 1)), false, l);
  assert.equal(isOurs(issue("orazaka[bot]", 1, { pull_request: {} })), false);
});

test("offenders keeps only repositories with an issue of ours, sorted", () => {
  const found = offenders({ a: [issue("someone", 3), issue("orazaka[bot]", 9), issue("oussamaABID", 2)], b: [issue("someone", 1)], c: [] });
  assert.deepEqual(found, { a: [2, 9] });
  assert.equal(total(found), 2);
});

test("summary prints counts only, never a number of an issue", () => {
  assert.equal(summary(36, { a: [2, 9], b: [4] }), "public repos: 36, open issues of ours in public repos: 3 (a=2 b=1)");
  assert.equal(summary(36, {}), "public repos: 36, open issues of ours in public repos: 0");
});

test("renderReport lists links when red and says clean when green", () => {
  assert.match(renderReport({ a: [2] }), /\*\*1 issue\(s\) in 1 repo\(s\):\*\*[\s\S]*github\.com\/krizaka\/a\/issues\/2/);
  assert.match(renderReport({}), /every public repository is clean/);
});

test("plan: open when red without tracking, update when tracked, close when green", () => {
  assert.equal(plan({ a: [1] }, undefined), "open");
  assert.equal(plan({ a: [1] }, { number: 5 }), "update");
  assert.equal(plan({}, { number: 5 }), "close");
  assert.equal(plan({}, undefined), "none");
});

test("SAFE_PATH refuses anything but the org's REST paths", () => {
  assert.ok(SAFE_PATH.test("repos/krizaka/krizaka-internal/issues?state=open&labels=conformance-public-issues&per_page=1"));
  assert.ok(!SAFE_PATH.test("repos/other/x/issues"));
  assert.ok(!SAFE_PATH.test("repos/krizaka/x/contents/a"));
});
