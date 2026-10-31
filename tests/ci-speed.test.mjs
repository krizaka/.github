// The speed budgets (ADR-018): how feedback time is measured, which budget applies, and that every active repository has a
// profile. Also the first win the inventory measured: node-ci's build leg never re-runs the tests of the test leg.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { budgetsFor, feedbackTimes, measure, percentile, profilesOf, render } from "../scripts/ci-speed.mjs";

const cfg = JSON.parse(readFileSync(new URL("../docs/standards/ci-profiles.json", import.meta.url), "utf8"));
const registry = JSON.parse(readFileSync(new URL("../repos.json", import.meta.url), "utf8")).repositories;

const run = (sha, event, start, minutes, extra = {}) => ({
  head_sha: sha,
  event,
  name: extra.name ?? "CI",
  status: "completed",
  conclusion: extra.conclusion ?? "success",
  run_started_at: new Date(Date.parse("2026-10-30T10:00:00Z") + start * 60000).toISOString(),
  updated_at: new Date(Date.parse("2026-10-30T10:00:00Z") + (start + minutes) * 60000).toISOString(),
});

test("percentile: nearest rank, null when empty", () => {
  assert.equal(percentile([], 0.9), null);
  assert.equal(percentile([5], 0.9), 5);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
  assert.equal(percentile([10, 1, 5], 0.5), 5);
});

test("feedback: first start to last end of one commit's runs, per event; cancelled and skipped runs are not feedback", () => {
  const runs = [
    run("a", "pull_request", 0, 4, { name: "CI" }),
    run("a", "pull_request", 1, 12, { name: "Mobile CI" }),
    run("a", "pull_request", 0, 30, { conclusion: "cancelled" }),
    run("a", "merge_group", 20, 5),
    run("b", "pull_request", 0, 2, { conclusion: "skipped" }),
  ];
  const pr = feedbackTimes(runs, "pull_request");
  assert.deepEqual(pr, [{ sha: "a", seconds: 13 * 60, slowest: "Mobile CI" }]);
  assert.equal(feedbackTimes(runs, "merge_group")[0].seconds, 5 * 60);
});

test("a re-run and a run started long after the push are not the push's feedback", () => {
  const runs = [run("a", "pull_request", 0, 5), { ...run("a", "pull_request", 2, 40), run_attempt: 2 }, run("a", "pull_request", 3 * 24 * 60, 4, { name: "Update baselines" })];
  assert.equal(feedbackTimes(runs, "pull_request")[0].seconds, 300);
});

test("a run that waited for an approval, or whose end moved past what a job can last, is not feedback", () => {
  const runs = [run("a", "pull_request", 0, 5), run("a", "pull_request", 1, 2000), run("a", "pull_request", 1, 60, { conclusion: "action_required" })];
  assert.equal(feedbackTimes(runs, "pull_request")[0].seconds, 300);
});

test("a red run is still feedback (the author waited for it)", () => {
  assert.equal(feedbackTimes([run("a", "pull_request", 0, 7, { conclusion: "failure" })], "pull_request")[0].seconds, 420);
});

test("budgets: the organisation's, a repository may tighten or loosen one event", () => {
  assert.deepEqual(budgetsFor("akinaza", cfg), { pull_request: 10, merge_group: 15 });
  const own = { ...cfg, repos: { x: { profiles: ["library"], budgets: { merge_group: 20 } } } };
  assert.deepEqual(budgetsFor("x", own), { pull_request: 10, merge_group: 20 });
  assert.deepEqual(profilesOf("x", own), ["library"]);
});

test("measure: over budget at the 90th percentile, with the workflow that is usually the slowest", () => {
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(run(`s${i}`, "pull_request", 0, i < 8 ? 6 : 26, { name: i < 8 ? "CI" : "Mobile CI" }));
  const [row] = measure("akinaza", runs, cfg);
  assert.equal(row.n, 10);
  assert.equal(row.p50, 6);
  assert.equal(row.p90, 26);
  assert.equal(row.over, true);
  assert.equal(row.slowest, "CI");
  assert.match(render([row], { days: 7 }), /\*\*1 over budget\*\*: akinaza \(pull_request\)/);
});

test("every active repository of the registry has a profile, and every profile exists", () => {
  const active = registry.filter((r) => !/^Archive/.test(r.status) && !r.archived).map((r) => r.name);
  for (const name of active) assert.ok(profilesOf(name, cfg).length, `${name} has no CI profile in docs/standards/ci-profiles.json`);
  for (const [name, entry] of Object.entries(cfg.repos)) {
    for (const p of Array.isArray(entry) ? entry : entry.profiles) assert.ok(cfg.profiles[p], `${name}: unknown profile ${p}`);
  }
});

test("node-ci: in parallel mode the build leg does not run the tests again (9 minutes of akinaza's critical path, ADR-018)", () => {
  const src = readFileSync(new URL("../.github/workflows/node-ci.yml", import.meta.url), "utf8");
  const verify = src.slice(src.indexOf("\n  verify:\n"), src.indexOf("\n  e2e:\n"));
  const testScript = verify.match(/^ {10}test-script: (.*)$/m)[1];
  assert.doesNotMatch(testScript, /'build'/, "the build leg must not run the test script");
  assert.match(testScript, /matrix\.task == 'test'/);
});
