import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { preflight, summarise, journeyProblem, testsOf } from "../scripts/journeys.mjs";

const spec = (title, status, expectedStatus = "passed") => ({ title, tests: [{ status, expectedStatus, projectName: "critical" }] });
const report = (...specs) => ({ suites: [{ title: "visitor.spec.ts", specs: [], suites: [{ title: "books", specs }] }] });
// Test-mode and live-looking payment values are built here, never spelled: a literal of this shape trips every scanner.
const LIVE = ["sk", "live", "abc123def456"].join("_");
const TESTMODE = ["sk", "test", "abc123def456"].join("_");
const PD = { JOURNEYS_MODE: "post-deploy", PERSONAS: "eric@demo", JOURNEY_PERSONA_PASSWORD: "x" };

test("preflight: a missing persona credential FAILS a post-deploy run (the dev-persona-smoke bug)", () => {
  const p = preflight({ ...PD, JOURNEY_PERSONA_PASSWORD: "" });
  assert.match(p.join(), /persona-password/);
  assert.deepEqual(preflight(PD), []);
});

test("preflight: only demo personas, names never values", () => {
  assert.match(preflight({ ...PD, PERSONAS: "oussama@gmail.com" }).join(), /not of the demo cast/);
  assert.deepEqual(preflight({ ...PD, PERSONAS: "lea.beaulieu@demo,camille@example.com" }), []);
  assert.match(preflight({ ...PD, PERSONAS: "" }).join(), /no persona declared/);
  assert.ok(!preflight({ ...PD, PERSONAS: "x@gmail.com", JOURNEY_PERSONA_PASSWORD: "value-123" }).join().includes("value-123"));
});

test("preflight: payments are test-mode only, and a declared payment journey needs its key", () => {
  const pay = { ...PD, NEEDS_PAYMENTS: "true" };
  assert.match(preflight(pay).join(), /payments-test-key/);
  assert.match(preflight({ ...pay, JOURNEY_PAYMENTS_KEY: LIVE }).join(), /not a test-mode key/);
  assert.match(preflight({ ...pay, JOURNEY_PAYMENTS_KEY: "whatever" }).join(), /not a test-mode key/);
  assert.deepEqual(preflight({ ...pay, JOURNEY_PAYMENTS_KEY: TESTMODE }), []);
  assert.match(preflight({ ...PD, JOURNEY_PAYMENTS_KEY: LIVE }).join(), /live payments key/);
});

test("preflight: ci mode needs no password (the seed is local), a bad mode fails", () => {
  assert.deepEqual(preflight({ JOURNEYS_MODE: "ci", PERSONAS: "eric@demo" }), []);
  assert.match(preflight({ PERSONAS: "eric@demo" }).join(), /JOURNEYS_MODE/);
  assert.deepEqual(preflight({ JOURNEYS_MODE: "ci", NEEDS_PERSONA: "false" }), []);
});

test("report: nothing ran is red (never « nothing checked » green)", () => {
  assert.equal(summarise({ suites: [] }).ok, false);
  assert.match(summarise({ suites: [] }).reasons[0], /nothing was checked/);
});

test("report: green, expected failure listed, unexpected pass of an expected failure red", () => {
  assert.equal(summarise(report(spec("a", "expected"))).ok, true);
  const known = summarise(report(spec("a", "expected"), spec("visitor books", "expected", "failed")));
  assert.equal(known.ok, true);
  assert.equal(known.expectedFail.length, 1);
  const fixed = summarise(report(spec("visitor books", "unexpected", "failed")));
  assert.equal(fixed.ok, false);
  assert.match(fixed.reasons[0], /remove the test\.fail\(\) marker/);
});

test("report: failed, skipped and flaky are red", () => {
  assert.match(summarise(report(spec("a", "unexpected"))).reasons[0], /failed/);
  assert.match(summarise(report(spec("a", "skipped"))).reasons[0], /never skipped/);
  assert.match(summarise(report(spec("a", "flaky"))).reasons[0], /flaky/);
  assert.equal(testsOf(report(spec("a", "expected")))[0].title, "visitor.spec.ts › books › a");
});

test("pr-line: a feat/fix PR names its journey or says why none", () => {
  const base = { title: "feat(booking): visitor books", author: "krizaka-agents[bot]", branch: "feat/x" };
  assert.match(journeyProblem({ ...base, body: "## What" }), /no `Journey:` line/);
  assert.match(journeyProblem({ ...base, body: "Journey: " }), /empty/);
  assert.match(journeyProblem({ ...base, body: "Journey: <name>" }), /empty/);
  assert.match(journeyProblem({ ...base, body: "Journey: n/a" }), /reason/);
  assert.match(journeyProblem({ ...base, body: "Journey: n/a — short" }), /reason/);
  assert.equal(journeyProblem({ ...base, body: "Journey: visitor books a time" }), null);
  assert.equal(journeyProblem({ ...base, body: "Journey: n/a — a docs-only change to the CI" }), null);
  assert.match(journeyProblem({ ...base, body: "<!-- Journey: x -->" }), /no `Journey:` line/);
});

test("pr-line: other types and bot branches are exempt", () => {
  assert.equal(journeyProblem({ title: "chore(deps): pins", body: "", author: "x", branch: "y" }), null);
  assert.equal(journeyProblem({ title: "fix(a): b", body: "", author: "dependabot[bot]", branch: "y" }), null);
  assert.equal(journeyProblem({ title: "feat: b", body: "", author: "x", branch: "deps/pins" }), null);
});

test("the workflows keep their contract: literal gate, preflight before the run, failure opens an issue", () => {
  const j = readFileSync(".github/workflows/journeys.yml", "utf8");
  assert.match(j, /^ {2}gate:\n {4}name: gate$/m);
  assert.match(j, /if: \$\{\{ always\(\) \}\}/);
  assert.ok(j.indexOf("journeys.mjs preflight") < j.indexOf("Run the critical journeys"));
  const p = readFileSync(".github/workflows/post-deploy-journeys.yml", "utf8");
  assert.ok(p.indexOf("journeys.mjs preflight") < p.indexOf("Run the critical journeys"));
  assert.match(p, /if: \$\{\{ failure\(\) \}\}/);
  for (const f of readdirSync(".github/workflows").filter((n) => /journey/.test(n))) {
    assert.doesNotMatch(readFileSync(`.github/workflows/${f}`, "utf8"), /secrets: inherit/);
  }
});

test("the PR template carries the Journey line", () => {
  assert.match(readFileSync(".github/pull_request_template.md", "utf8"), /^Journey:/m);
});
