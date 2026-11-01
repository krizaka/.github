import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure, movePins, openPrsToWait, pinBranch, pinFiles, pinPattern, publishPinPr, pushArgs } from "./propagate-pins.mjs";

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
  assert.ok(!/^\s{2}push:/m.test(on), "pins move hourly or on a release, not on every merge");
  assert.match(on, /schedule:/);
  assert.match(yml, /concurrency:\s*\n\s+group: propagate-pins\s*\n\s+cancel-in-progress: false/, "runs are serial");
  const src = readFileSync(new URL("./propagate-pins.mjs", import.meta.url), "utf8");
  assert.ok(!/pinBranch\([^)]*sha/i.test(src) && !/branch\s*=\s*`[^`]*\$\{sha/.test(src), "the branch never carries a sha");
});
