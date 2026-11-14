// The `extra-coverage-command` input of maven.yml (krizaka-internal#3553): the step that runs it is exercised here.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/maven.yml", import.meta.url), "utf8");
const step = workflow.split("# extra-coverage:begin\n")[1].split("          # extra-coverage:end")[0];

const run = (command) => spawnSync("bash", ["-c", step], { env: { ...process.env, EXTRA_COVERAGE_COMMAND: command }, encoding: "utf8" });

test("the input is empty by default, so a caller that does not pass it changes nothing", () => {
  assert.match(workflow, /extra-coverage-command:\n {8}description: [^\n]*\n {8}required: false\n {8}default: ""\n {8}type: string/);
  const guarded = workflow.match(/if: \$\{\{ inputs\.extra-coverage-command != '' \}\}/g) ?? [];
  assert.equal(guarded.length, 2, "setup-node and the step are both skipped when the input is empty");
});

test("the command reaches the step through env, never through the run line", () => {
  assert.match(workflow, /EXTRA_COVERAGE_COMMAND: \$\{\{ inputs\.extra-coverage-command \}\}/);
  assert.doesNotMatch(step, /\$\{\{/);
});

test("the command runs; a failing command fails the step; an unset variable and a failing pipe stop it", () => {
  const ok = run("echo covered");
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /covered/);
  assert.equal(run("exit 3").status, 3);
  assert.notEqual(run("echo $UNSET_VARIABLE_X").status, 0);
  assert.notEqual(run("false | cat").status, 0);
});

test("the coverage collection runs after the extra step and before the upload", () => {
  const at = (s) => workflow.indexOf(s);
  assert.ok(at("name: Extra tests with coverage") < at("name: Collect the coverage for SonarCloud"));
});
