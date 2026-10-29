// The weekly red-cell issue per repository (krizaka/.github#393): pure parts.
import test from "node:test";
import assert from "node:assert/strict";
import { MARKER, bodyOf, planIssues, redByRepo, titleOf } from "../scripts/conformance-issues.mjs";
import { loadRules } from "../scripts/conformance.mjs";

const rules = loadRules();
const cells = {
  a: { "security-scan": { status: "red", why: "no security.yml" }, scorecard: { status: "green", why: "" }, "shared-ci": { status: "n/a", why: "" } },
  b: { "security-scan": { status: "green", why: "" } },
};

test("only repositories with a red cell are listed, with the reason", () => {
  assert.deepEqual(redByRepo(cells), { a: [{ id: "security-scan", why: "no security.yml" }] });
});

test("the body starts with the marker, names every red rule and its reason", () => {
  const body = bodyOf("a", redByRepo(cells).a, rules);
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /- \[ \] `security-scan`: .*no security\.yml/);
  assert.equal(titleOf(redByRepo(cells).a), "Org rules: 1 red in the conformance matrix");
});

test("a red repository without an issue opens one", () => {
  const steps = planIssues(redByRepo(cells), {}, rules);
  assert.deepEqual(steps.map((s) => [s.repo, s.action]), [["a", "open"]]);
});

test("the same text is left alone; a changed one is refreshed", () => {
  const reds = redByRepo(cells);
  const same = { a: { number: 4, title: titleOf(reds.a), body: bodyOf("a", reds.a, rules) } };
  assert.deepEqual(planIssues(reds, same, rules), []);
  const stale = { a: { number: 4, title: "old", body: MARKER } };
  assert.deepEqual(planIssues(reds, stale, rules).map((s) => [s.action, s.number]), [["update", 4]]);
});

test("a green repository closes its open issue", () => {
  const steps = planIssues({}, { b: { number: 9, title: "t", body: MARKER } }, rules);
  assert.deepEqual(steps, [{ repo: "b", action: "close", number: 9 }]);
});
