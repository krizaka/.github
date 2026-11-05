import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure, fetchPinState, movePins, openPrsToWait, pinBranch, pinFiles, pinPattern, pinPrDecision, publishPinPr, pushArgs } from "./propagate-pins.mjs";

const OLD = "a".repeat(40);
const NEW = "b".repeat(40);

test("movePins moves only the pins of krizaka/.github, in workflows and local actions", () => {
  const root = mkdtempSync(join(tmpdir(), "pins-test-"));
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  mkdirSync(join(root, "actions/x"), { recursive: true });
  const ci = `uses: krizaka/.github/.github/workflows/node-ci.yml@${OLD} # main\n  - uses: actions/checkout@${OLD} # v7\n`;
  writeFileSync(join(root, ".github/workflows/ci.yml"), ci);
  writeFileSync(join(root, "actions/x/action.yml"), `uses: krizaka/.github/actions/sonar-scan@${OLD} # main\n`);
  writeFileSync(join(root, "README.md"), `krizaka/.github/x@${OLD}\n`);
  assert.equal(pinFiles(root).length, 2);
  assert.equal(movePins(root, NEW).length, 2);
  const after = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(after, new RegExp(`node-ci.yml@${NEW} # main`));
  assert.match(after, new RegExp(`actions/checkout@${OLD} # v7`), "another repository's pin is left alone");
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), `krizaka/.github/x@${OLD}\n`, "prose is not a pin");
  assert.equal(movePins(root, NEW).length, 0, "idempotent");
});

test("--source moves the component.yml pins of krizaka/orazaka and leaves the org's own pins alone", () => {
  const root = mkdtempSync(join(tmpdir(), "pins-src-"));
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    `uses: krizaka/orazaka/.github/workflows/component.yml@${OLD} # main\n  uses: krizaka/.github/.github/workflows/node-ci.yml@${OLD} # main\n`,
  );
  assert.equal(movePins(root, NEW, "orazaka").length, 1);
  const after = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(after, new RegExp(`krizaka/orazaka/.github/workflows/component.yml@${NEW} # main`));
  assert.match(after, new RegExp(`krizaka/.github/.github/workflows/node-ci.yml@${OLD} # main`));
  assert.equal(movePins(root, NEW, "orazaka").length, 0, "idempotent");
  assert.ok(pinPattern(".github").test("krizaka/.github/x@" + OLD), "the default source is the org's .github");
  assert.ok(!pinPattern("orazaka").test("krizaka/orazaka-edge/x@" + OLD), "the source name is exact");
});

test("the push carries the app's token through gh's credential helper (a runner has none: every push of 2026-10-29 failed), and a failure says why", () => {
  const args = pushArgs("/w/repo", "deps/x");
  assert.deepEqual(args.slice(-5), ["push", "-q", "-f", "origin", "deps/x"]);
  assert.ok(args.includes("credential.helper=!gh auth git-credential"));
  assert.ok(args.indexOf("credential.helper=") < args.indexOf("credential.helper=!gh auth git-credential"), "the helper list is reset first");
  assert.equal(failure(Object.assign(new Error("Command failed: git push\nsecond"), { stderr: "fatal: could not read Username\nmore" })), "Command failed: git push — fatal: could not read Username");
});

function fakeRun(open) {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args[0] === "api" && String(args[1]).includes("/pulls?state=open")) return JSON.stringify(open);
    if (args[0] === "pr") return "https://github.com/krizaka/r/pull/9";
    return "";
  };
  return { run, calls };
}
const input = { repo: "r", branch: "deps/org-workflow-pins", title: "T", body: "B" };

test("the pin branch is stable: no sha in its name", () => {
  assert.equal(pinBranch("org workflow pins"), "deps/org-workflow-pins");
});

test("an open PR of the same head is updated in place, never created again", () => {
  const { run, calls } = fakeRun([{ number: 4, url: "https://github.com/krizaka/r/pull/4", head: "deps/org-workflow-pins" }]);
  assert.equal(publishPinPr({ ...input, run }), "https://github.com/krizaka/r/pull/4");
  assert.ok(!calls.some((c) => c[1] === "pr"), "no gh pr create");
  assert.ok(calls.some((c) => c.includes("repos/krizaka/r/pulls/4") && c.includes("PATCH") && c.includes("title=T")));
});

test("without an open PR one is created, and the older sha-named PRs are closed as superseded", () => {
  const { run, calls } = fakeRun([
    { number: 2, url: "u2", head: "deps/org-workflow-pins-1234abcd" },
    { number: 3, url: "u3", head: "deps/other-thing" },
  ]);
  assert.equal(publishPinPr({ ...input, run }), "https://github.com/krizaka/r/pull/9");
  assert.ok(calls.some((c) => c[1] === "pr" && c[2] === "create"));
  assert.ok(calls.some((c) => c.includes("repos/krizaka/r/issues/2/comments") && c.includes("body=Superseded by #9")));
  assert.ok(calls.some((c) => c.includes("repos/krizaka/r/pulls/2") && c.includes("state=closed")));
  assert.ok(!calls.some((c) => c.some((x) => String(x).includes("/3"))), "unrelated PRs are left alone");
});

test("the org pins wait while .github has open pull requests, and only then", () => {
  const run = (n) => (cmd, args) => {
    assert.ok(args.includes("repos/krizaka/.github/pulls?state=open&per_page=100"));
    return `${n}\n`;
  };
  assert.equal(openPrsToWait(".github", run(3)), 3);
  assert.equal(openPrsToWait(".github", run(0)), 0);
  // another source (orazaka) has its own rule: it never waits on .github
  assert.equal(openPrsToWait("orazaka", () => assert.fail("no API call")), 0);
});

test("any other open pin PR of the repository is closed as superseded, whatever its head", () => {
  const { run, calls } = fakeRun([
    { number: 5, url: "u5", head: "deps/org-workflow-pins", title: "ci(deps): the org workflow pins move to krizaka/.github@aaaaaaaa" },
    { number: 6, url: "u6", head: "chore/pins-by-hand", title: "ci(deps): the org workflow pins move to krizaka/.github@cccccccc" },
  ]);
  publishPinPr({ ...input, title: "ci(deps): the org workflow pins move to krizaka/.github@bbbbbbbb", run });
  assert.ok(calls.some((c) => c.includes("repos/krizaka/r/issues/6/comments") && c.includes("body=Superseded by #5")));
  assert.ok(!calls.some((c) => c.includes("repos/krizaka/r/issues/5/comments")), "the standing PR is never closed");
});

test("guard: the workflow cannot open a second pin PR in a repository (no push trigger, one serial run, a stable branch)", () => {
  const yml = readFileSync(new URL("../.github/workflows/propagate-pins.yml", import.meta.url), "utf8");
  const on = yml.slice(yml.indexOf("\non:"), yml.indexOf("\npermissions:"));
  assert.ok(!/^\s{2}push:/m.test(on), "pins move once a day or on a release, not on every merge");
  assert.match(on, /schedule:/);
  assert.match(yml, /concurrency:\s*\n\s+group: propagate-pins\s*\n\s+cancel-in-progress: false/, "runs are serial");
  const src = readFileSync(new URL("./propagate-pins.mjs", import.meta.url), "utf8");
  assert.ok(!/pinBranch\([^)]*sha/i.test(src) && !/branch\s*=\s*`[^`]*\$\{sha/.test(src), "the branch never carries a sha");
});

// At most one pin PR per repository per UTC day, across all sources (founder, 2026-11-05: 173 pin PRs closed unmerged in 14 days).
const TODAY = "2026-11-05";
const ORG = { branch: "deps/org-workflow-pins", label: "org workflow pins" };
const pr = (number, head, state, created, title = `ci(deps): the org workflow pins move to krizaka/.github@aaaaaaaa`) => ({
  number,
  head,
  state,
  title,
  createdAt: `${created}T10:17:00Z`,
});

test("pinPrDecision: no pin PR at all → create", () => {
  const d = pinPrDecision({ ...ORG, prs: [pr(1, "feat/x", "open", TODAY, "feat: x")], today: TODAY, headDates: {} });
  assert.equal(d.action, "create");
});

test("pinPrDecision: the open pin PR on the same branch, head from an earlier day → update in place", () => {
  const d = pinPrDecision({ ...ORG, prs: [pr(4, ORG.branch, "open", "2026-11-03")], today: TODAY, headDates: { 4: "2026-11-04T10:17:00Z" } });
  assert.equal(d.action, "update");
  assert.equal(d.pr, 4);
});

test("pinPrDecision: the open pin PR on the same branch already moved today → skip", () => {
  const d = pinPrDecision({ ...ORG, prs: [pr(4, ORG.branch, "open", "2026-11-03")], today: TODAY, headDates: { 4: `${TODAY}T10:17:00Z` } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /today/);
});

test("pinPrDecision: a pin PR created today and already merged or closed → skip until tomorrow", () => {
  for (const state of ["closed", "merged"]) {
    const d = pinPrDecision({ ...ORG, prs: [pr(7, ORG.branch, state, TODAY)], today: TODAY, headDates: {} });
    assert.equal(d.action, "skip", state);
    assert.match(d.reason, /#7/);
  }
});

test("pinPrDecision: another source's pin PR open in the repository → skip (one pin PR per repository at a time)", () => {
  const other = pr(8, "deps/orazaka-workflow-pins", "open", "2026-11-01", "ci(deps): the orazaka workflow pins move to krizaka/orazaka@cccccccc");
  const d = pinPrDecision({ ...ORG, prs: [other], today: TODAY, headDates: { 8: "2026-11-01T00:00:00Z" } });
  assert.equal(d.action, "skip");
  assert.match(d.reason, /#8/);
});

test("pinPrDecision: another source's pin PR created today (merged) counts for the day too", () => {
  const other = pr(8, "deps/orazaka-workflow-pins", "merged", TODAY, "ci(deps): the orazaka workflow pins move to krizaka/orazaka@cccccccc");
  assert.equal(pinPrDecision({ ...ORG, prs: [other], today: TODAY, headDates: {} }).action, "skip");
  const mine = pr(4, ORG.branch, "open", "2026-11-02");
  assert.equal(pinPrDecision({ ...ORG, prs: [other, mine], today: TODAY, headDates: { 4: "2026-11-02T00:00:00Z" } }).action, "skip", "no update the day another pin PR went out");
});

test("pinPrDecision: a new day after yesterday's merge → create", () => {
  const d = pinPrDecision({ ...ORG, prs: [pr(7, ORG.branch, "merged", "2026-11-04")], today: TODAY, headDates: {} });
  assert.equal(d.action, "create");
});

test("pinPrDecision: an old sha-named pin PR of the same source still open does not block (publishPinPr supersedes it)", () => {
  const old = pr(2, "deps/org-workflow-pins-1234abcd", "open", "2026-10-20");
  assert.equal(pinPrDecision({ ...ORG, prs: [old], today: TODAY, headDates: {} }).action, "create");
});

test("listPinPrs keeps only the pin family and reads the head date of the open one through gh (no network in tests)", () => {
  const rows = [
    { number: 4, head: ORG.branch, sha: "s4", state: "open", merged: false, title: "ci(deps): the org workflow pins move to krizaka/.github@aaaaaaaa", createdAt: "2026-11-03T10:17:00Z" },
    { number: 5, head: "feat/x", sha: "s5", state: "open", merged: false, title: "feat: x", createdAt: "2026-11-05T01:00:00Z" },
    { number: 6, head: "chore/pins-by-hand", sha: "s6", state: "closed", merged: true, title: "ci(deps): the org workflow pins move to krizaka/.github@bbbbbbbb", createdAt: "2026-11-05T01:00:00Z" },
  ];
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (String(args[1]).startsWith("repos/krizaka/r/pulls?state=all&per_page=30")) return JSON.stringify(rows);
    if (args[1] === "repos/krizaka/r/commits/s4") return "2026-11-04T10:17:00Z\n";
    throw new Error(`unexpected ${args.join(" ")}`);
  };
  const { prs, headDates } = fetchPinState({ repo: "r", branch: ORG.branch, run });
  assert.deepEqual(prs.map((p) => [p.number, p.state]), [[4, "open"], [6, "merged"]]);
  assert.deepEqual(headDates, { 4: "2026-11-04T10:17:00Z" });
  assert.equal(calls.length, 2, "one list, one head commit");
});

test("guard: the pins move once a day, never hourly", () => {
  const yml = readFileSync(new URL("../.github/workflows/propagate-pins.yml", import.meta.url), "utf8");
  const crons = [...yml.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(crons.length, 1);
  const [minute, hour] = crons[0].split(/\s+/);
  assert.match(minute, /^\d+$/);
  assert.match(hour, /^\d+$/, "one hour of the day, not `*`");
  assert.match(yml, /at most one pin PR per repository per day/);
  const src = readFileSync(new URL("./propagate-pins.mjs", import.meta.url), "utf8");
  assert.ok(src.indexOf("pinPrDecision(") < src.indexOf('"repo", "clone"'), "the decision comes before the clone");
});
