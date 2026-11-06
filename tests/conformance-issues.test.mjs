// The weekly red-cell issue per repository (krizaka/.github#393): pure parts.
import test from "node:test";
import assert from "node:assert/strict";
import { INTERNAL, MARKER, bodyOf, labelsOf, planIssues, redByRepo, repoOfTitle, titleOf } from "../scripts/conformance-issues.mjs";
import { loadRules } from "../scripts/conformance.mjs";
import { readFileSync } from "node:fs";

const rules = loadRules();
const cells = {
  a: { "security-scan": { status: "fail", why: "no security.yml" }, scorecard: { status: "pass", why: "" }, "shared-ci": { status: "n/a", why: "" } },
  b: { "security-scan": { status: "pass", why: "" } },
};

test("only repositories with a red cell are listed, with the reason", () => {
  assert.deepEqual(redByRepo(cells), { a: [{ id: "security-scan", why: "no security.yml" }] });
});

test("the body starts with the marker, names every red rule and its reason", () => {
  const body = bodyOf("a", redByRepo(cells).a, rules);
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /- \[ \] `security-scan`: .*no security\.yml/);
  assert.equal(titleOf(redByRepo(cells).a, "a"), "a · chore(conformance): Org rules: 1 red in the conformance matrix");
});

test("a red repository without an issue opens one", () => {
  const steps = planIssues(redByRepo(cells), {}, rules);
  assert.deepEqual(steps.map((s) => [s.repo, s.action]), [["a", "open"]]);
});

test("the same text is left alone; a changed one is refreshed", () => {
  const reds = redByRepo(cells);
  const same = { a: { number: 4, title: titleOf(reds.a, "a"), body: bodyOf("a", reds.a, rules) } };
  assert.deepEqual(planIssues(reds, same, rules), []);
  const stale = { a: { number: 4, title: "old", body: MARKER } };
  assert.deepEqual(planIssues(reds, stale, rules).map((s) => [s.action, s.number]), [["update", 4]]);
});

test("a green repository closes its open issue", () => {
  const steps = planIssues({}, { b: { number: 9, title: "t", body: MARKER } }, rules);
  assert.deepEqual(steps, [{ repo: "b", action: "close", number: 9 }]);
});

test("the issue lives in the private krizaka-internal with the required labels, never in the red repository", () => {
  assert.equal(INTERNAL, "krizaka-internal");
  assert.equal(repoOfTitle(titleOf([{ id: "x" }], "sovkora-cli")), "sovkora-cli");
  for (const prefix of ["repo:", "product:", "lane:", "type:"]) assert.ok(labelsOf("a").some((l) => l.startsWith(prefix)));
});

test("the workflow's token reaches krizaka-internal, where the issues live (a 404 there turned the daily run red)", () => {
  const yml = readFileSync(new URL("../.github/workflows/conformance.yml", import.meta.url), "utf8");
  const scope = yml.match(/repositories: \$\{\{ steps\.repos\.outputs\.list \}\}(.*)/);
  assert.ok(scope, "the app token is scoped to the repo list");
  assert.ok(scope[1].split(",").includes(INTERNAL), `the token's repositories include ${INTERNAL}`);
});

test("rules review 2026-11-05: the issue per red repository lists only the security rules; a repository red on other rules only has none", () => {
  const mixed = { a: { "security-scan": { status: "fail", why: "x" }, "shared-ci": { status: "fail", why: "y" } }, c: { "shared-ci": { status: "fail", why: "y" } } };
  assert.deepEqual(redByRepo(mixed, rules), { a: [{ id: "security-scan", why: "x" }] });
});
