import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { movePins, pinFiles } from "./propagate-pins.mjs";

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
