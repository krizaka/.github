// The Sonar callers pass the main gate `full-on-default-push: ${{ inputs.sonar }}` (krizaka-internal#4310): Sonar analyses main
// only through the jobs that gate guards, so a docs-only push to main must not leave main's analysis stale.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CALLERS = ["node-ci", "java-ci", "maven", "python-ci"];
const read = (name) => readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8");

/** The `uses: …changes.yml@<sha>` block of the job named `job`: its `with:` lines. */
function gateBlock(text, job) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === `  ${job}:`);
  const end = lines.findIndex((l, i) => i > start && /^ {2}[\w-]+:\s*$/.test(l));
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

for (const name of CALLERS) {
  test(`${name}: the main changes gate passes full-on-default-push from inputs.sonar`, () => {
    assert.match(gateBlock(read(name), "changes"), /^ {6}full-on-default-push: \$\{\{ inputs\.sonar \}\}$/m);
  });

  test(`${name}: the changes gate pin is not older than the input`, () => {
    const pins = [...read(name).matchAll(/changes\.yml@([0-9a-f]{40})/g)].map((m) => m[1]);
    assert.ok(pins.length > 0);
    assert.ok(!pins.includes("10140f24680f66980862a3d90978c016942f74e8"), "the pin predates full-on-default-push");
  });
}

test("node-ci: the docker and UI gates do not get full-on-default-push", () => {
  for (const job of ["docker-changes", "ui-changes"]) assert.doesNotMatch(gateBlock(read("node-ci"), job), /full-on-default-push/);
});
