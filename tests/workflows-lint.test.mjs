// actionlint (with shellcheck on every `run:`) on every workflow of the repository (krizaka/.github#113). It uses an
// `actionlint` on the PATH, else the pinned container lint-workflows.yml runs; with neither, the test is skipped.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const IMAGE = "rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667";
const works = (cmd, args) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;

function actionlint() {
  if (works("actionlint", ["-version"])) return ["actionlint", ["-no-color"]];
  if (works("docker", ["info"])) return ["docker", ["run", "--rm", "-v", `${ROOT}:/repo`, "-w", "/repo", IMAGE, "-no-color"]];
  return null;
}

const runner = actionlint();

test("actionlint: every workflow is clean", { skip: runner ? false : "neither actionlint nor docker is available" }, () => {
  const workflows = readdirSync(new URL("../.github/workflows/", import.meta.url)).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(workflows.includes("krizaka-ci.yml"));
  const [cmd, args] = runner;
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
