import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalogue } from "../lib/assemble.mjs";
import { appendHistory, entryOf } from "../lib/history.mjs";
import { renderCatalogue } from "../lib/render.mjs";
import { agentsFiles, appFiles, owners, sources } from "./fixtures.mjs";
import { mapSource } from "../lib/sources.mjs";

const catalogue = buildCatalogue(sources(), owners, { generatedAt: "2026-11-07T06:00:00Z", runUrl: "https://example.test/run" });
const unit = (id) => catalogue.units.find((u) => u.id === id);

test("each unit kind is a row with its kind, language, owner and size", () => {
  assert.equal(unit("fx-app:scripts/check-links.mjs").kind, "CI check");
  assert.equal(unit("fx-app:scripts/gen-docs.mjs").kind, "generator");
  assert.equal(unit("fx-app:scripts/old-migration.mjs").kind, "one-off");
  assert.equal(unit("fx-app:.githooks/pre-push").kind, "git hook");
  assert.equal(unit("fx-app:scripts/lib/util.mjs").kind, "library");
  assert.equal(unit("fx-app:.github/workflows/nightly.yml").kind, "cron");
  assert.equal(unit("fx-app:.github/workflows/deploy.yml").kind, "deploy");
  assert.equal(unit("fx-app:.github/workflows/ci.yml").kind, "CI check");
  assert.equal(unit("fx-app:Dockerfile").type, "entrypoint");
  assert.equal(unit("fx-app:.claude/settings.json#PostToolUse[0.0]").kind, "agent hook");
  assert.equal(unit("fx-app:scripts/legacy.py").language, "python");
  assert.equal(unit("fx-app:scripts/check-links.mjs").owner, "app-team");
  assert.equal(unit("fx-app:scripts/check-links.mjs").lines, 18);
});

test("what calls a unit is read from workflows, npm scripts, hooks, crons and imports; a unit nobody calls says so", () => {
  const types = (id) => unit(id).calledBy.map((c) => c.type);
  assert.deepEqual([...new Set(types("fx-app:scripts/check-links.mjs"))].sort(), ["npm", "workflow"]);
  assert.ok(types("fx-app:scripts/lib/util.mjs").includes("script"));
  assert.ok(types("fx-app:.githooks/pre-push").includes("hook"));
  assert.ok(types("fx-app:.github/actions/setup/action.yml").includes("workflow"));
  assert.ok(types("krizaka-agents:tools/board-sync.py").includes("cron"));
  assert.ok(types("krizaka-agents:tools/githooks/run").includes("hook"));
  assert.deepEqual(unit("fx-app:scripts/legacy.py").calledBy, []);
  assert.ok(unit("fx-app:scripts/legacy.py").flags.includes("nothingCalls"));
  assert.ok(unit("fx-app:.github/workflows/reusable.yml").flags.includes("nothingCalls"));
  assert.ok(unit("fx-app:package.json#unused").flags.includes("nothingCalls"));
  assert.ok(!unit("fx-app:.github/workflows/ci.yml").flags.includes("nothingCalls"), "a workflow that an event starts is called");
});

test("a unit named in a document is documented, yet still flagged as called by nothing", () => {
  assert.equal(unit("fx-app:scripts/old-migration.mjs").documented, true);
  assert.ok(unit("fx-app:scripts/old-migration.mjs").flags.includes("nothingCalls"));
  assert.equal(unit("fx-app:scripts/legacy.py").documented, false);
});

test("tests and headers: a check without a test is flagged, a header is read from the leading comment", () => {
  assert.equal(unit("fx-app:scripts/check-links.mjs").tests.has, true);
  assert.deepEqual(unit("fx-app:scripts/gen-docs.mjs").tests, { required: true, has: false });
  assert.ok(unit("fx-app:scripts/gen-docs.mjs").flags.includes("noTest"));
  assert.equal(unit("fx-app:scripts/legacy.py").header, false);
  assert.ok(unit("fx-app:scripts/legacy.py").flags.includes("noHeader"));
  assert.match(unit("fx-app:scripts/check-links.mjs").what, /^Checks that every link of the docs answers/);
  assert.equal(unit("fx-app:scripts/long-regex.mjs").manual, true);
});

test("a regex over 80 characters is counted in JavaScript, Python and shell, and a short one is not", () => {
  for (const id of ["fx-app:scripts/long-regex.mjs", "fx-app:scripts/legacy.py", "fx-app:scripts/lint-sh.sh", "fx-app:.github/workflows/ci.yml"]) {
    assert.ok(unit(id).flags.includes("regexOver80"), id);
    assert.equal(unit(id).regex.longest, 125, id);
  }
  assert.equal(unit("fx-app:scripts/long-regex.mjs").regex.over80, 2);
  assert.equal(unit("fx-app:scripts/lint-sh.sh").regex.count, 2);
  assert.equal(unit("krizaka-agents:tools/board-sync.py").regex.over80, 0);
  assert.equal(unit("fx-app:scripts/check-links.mjs").regex.count, 1);
});

test("a copy in another repository is found by its content; fixtures folders are not units", () => {
  assert.deepEqual(unit("fx-app:scripts/check-links.mjs").copies, [{ repo: "fx-copy", path: "scripts/check-links.mjs", similarity: 1 }]);
  assert.ok(unit("fx-copy:scripts/check-links.mjs").flags.includes("copied"));
  assert.equal(unit("fx-app:scripts/__fixtures__/skipped.mjs"), undefined);
});

test("the machine's crons and hooks come from install.json", () => {
  const cron = unit("krizaka-agents:tools/install.json#cron.board-sync");
  assert.deepEqual([cron.type, cron.kind, cron.machine, cron.schedules], ["cron", "cron", true, ["17 * * * *"]]);
  assert.equal(unit("krizaka-agents:tools/install.json#hooks[0].PreToolUse").kind, "agent hook");
});

test("the summary counts kinds and flags, per repository too; the same files give the same catalogue", () => {
  assert.equal(catalogue.schema, "krizaka.automation/1");
  assert.equal(catalogue.summary.units, catalogue.units.length);
  assert.equal(catalogue.summary.repos["fx-app"].units, catalogue.units.filter((u) => u.repo === "fx-app").length);
  assert.equal(catalogue.summary.flags.copied, 2);
  assert.deepEqual(buildCatalogue(sources(), owners, { generatedAt: "2026-11-07T06:00:00Z", runUrl: "https://example.test/run" }), catalogue);
});

test("the day a unit last changed is observed from one run to the next", () => {
  const first = catalogue;
  assert.equal(unit("fx-app:scripts/gen-docs.mjs").changedAt, null, "the first run knows no earlier day");
  const edited = { ...appFiles, "scripts/gen-docs.mjs": `${appFiles["scripts/gen-docs.mjs"]}// edited\n` };
  const second = buildCatalogue([mapSource("fx-app", edited), mapSource("krizaka-agents", agentsFiles)], owners, { generatedAt: "2026-11-08T06:00:00Z", previous: first });
  const at = (id) => second.units.find((u) => u.id === id).changedAt;
  assert.equal(at("fx-app:scripts/gen-docs.mjs"), "2026-11-08");
  assert.equal(at("fx-app:scripts/legacy.py"), null, "unchanged: the earlier answer is kept");
});

test("the history keeps one entry per day, and the page lists the units behind each flag", () => {
  const entry = entryOf(catalogue);
  const history = appendHistory(appendHistory([], { ...entry, date: "2026-11-06" }), entry);
  assert.deepEqual(appendHistory(history, { ...entry, units: 1 }).map((e) => [e.date, e.units]), [["2026-11-06", entry.units], ["2026-11-07", 1]]);
  const page = renderCatalogue(catalogue, history);
  assert.match(page, /### Nothing calls it \(\d+\)/);
  assert.match(page, /`fx-app` `scripts\/legacy.py`/);
  assert.match(page, /## Over time/);
});
