import { test } from "node:test";
import assert from "node:assert/strict";
import { jobsWithoutTimeout, configWithoutTestTimeout, nodeTestWithoutTimeout, check } from "../scripts/check-timeouts.mjs";
import { runCheck } from "../scripts/conformance.mjs";

const wf = (body) => `name: x\non: push\njobs:\n${body}`;

test("a job without timeout-minutes is reported, with its line", () => {
  const bad = jobsWithoutTimeout(wf("  a:\n    runs-on: ubuntu-latest\n    steps: []\n"));
  assert.deepEqual(bad, [{ job: "a", line: 4 }]);
});

test("a job with timeout-minutes, and a job that only calls a reusable workflow, pass", () => {
  const text = wf("  a:\n    runs-on: x\n    timeout-minutes: 10\n  b:\n    uses: krizaka/.github/.github/workflows/node-ci.yml@main\n");
  assert.deepEqual(jobsWithoutTimeout(text), []);
});

test("only the second of two jobs is reported", () => {
  const text = wf("  a:\n    timeout-minutes: 5\n  b:\n    runs-on: x\n");
  assert.deepEqual(jobsWithoutTimeout(text).map((j) => j.job), ["b"]);
});

test("test configs need a per-test timeout", () => {
  assert.ok(configWithoutTestTimeout("playwright.config.ts", "export default {}"));
  assert.equal(configWithoutTestTimeout("playwright.config.ts", "export default { timeout: 120_000 }"), null);
  assert.ok(configWithoutTestTimeout("vitest.config.ts", "export default {}"));
  assert.equal(configWithoutTestTimeout("vitest.config.ts", "test: { testTimeout: 120000 }"), null);
  assert.ok(configWithoutTestTimeout("src/test/resources/junit-platform.properties", "a=b"));
  assert.equal(configWithoutTestTimeout("junit-platform.properties", "junit.jupiter.execution.timeout.default = 2 m"), null);
});

test("node --test scripts carry --test-timeout", () => {
  assert.ok(nodeTestWithoutTimeout('{"test":"node --test tests/*.test.mjs"}'));
  assert.equal(nodeTestWithoutTimeout('{"test":"node --test --test-timeout=120000 tests/*.test.mjs"}'), false);
});

test("this repository passes its own rule", () => {
  assert.deepEqual(check(new URL("..", import.meta.url).pathname.replace(/\/$/, "")), []);
});

test("the time-limits conformance check fails a repo with an unbounded job and passes a bounded one", async () => {
  const snap = (text) => ({ paths: [".github/workflows/ci.yml"], read: async () => text });
  const bad = await runCheck({ type: "time-limits" }, snap(wf("  a:\n    runs-on: x\n")));
  assert.equal(bad.ok, false);
  assert.match(bad.why, /no timeout-minutes/);
  const good = await runCheck({ type: "time-limits" }, snap(wf("  a:\n    runs-on: x\n    timeout-minutes: 9\n")));
  assert.equal(good.ok, true);
});
