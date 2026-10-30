import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure, movePins, pinFiles, pinPattern, pushArgs } from "./propagate-pins.mjs";

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
