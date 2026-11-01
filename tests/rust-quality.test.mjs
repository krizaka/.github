import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/rust-quality.yml", import.meta.url), "utf8");

test("rust-quality takes a runner, a test switch and a prepare command with safe defaults", () => {
  assert.match(wf, /runs-on:\n\s+description:[^\n]*\n\s+type: string\n\s+default: ubuntu-latest/);
  assert.match(wf, /\n {6}test:\n\s+description:[^\n]*\n\s+type: boolean\n\s+default: true/);
  assert.match(wf, /prepare:\n\s+description:[^\n]*\n\s+type: string\n\s+default: ""/);
});

test("the job runs on the chosen runner and the tests are switchable", () => {
  assert.match(wf, /runs-on: \$\{\{ inputs\.runs-on \}\}/);
  assert.match(wf, /name: tests\n\s+if: \$\{\{ inputs\.test \}\}/);
});

test("prepare goes through an env variable, never interpolated into the script", () => {
  assert.match(wf, /PREPARE: \$\{\{ inputs\.prepare \}\}/);
  assert.match(wf, /run: bash -euo pipefail -c "\$PREPARE"/);
  assert.doesNotMatch(wf, /run:[^\n]*\$\{\{ inputs\./);
});

test("apt packages are installed on Linux runners only", () => {
  assert.match(wf, /inputs\.apt-packages != '' && runner\.os == 'Linux'/);
});
