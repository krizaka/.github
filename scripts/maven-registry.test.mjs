// The `registry` input of maven.yml (ADR-019): the shell step that parses it is run here for each value.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/maven.yml", import.meta.url), "utf8");
const step = workflow.split("# registry-parse:begin\n")[1].split("          # registry-parse:end")[0];

function parse(registry) {
  const out = join(mkdtempSync(join(tmpdir(), "reg-")), "output");
  const run = spawnSync("bash", ["-c", step], { env: { ...process.env, REGISTRY: registry, GITHUB_OUTPUT: out }, encoding: "utf8" });
  const text = run.status === 0 ? readFileSync(out, "utf8") : "";
  return { status: run.status, stdout: run.stdout, outputs: Object.fromEntries(text.split("\n").filter(Boolean).map((l) => l.split("="))) };
}

test("github, central, and both at once", () => {
  assert.deepEqual(parse("github").outputs, { github: "true", central: "false" });
  assert.deepEqual(parse("central").outputs, { github: "false", central: "true" });
  assert.deepEqual(parse("github,central").outputs, { github: "true", central: "true" });
  assert.deepEqual(parse("central github").outputs, { github: "true", central: "true" });
});

test("an empty or unknown registry fails, never publishes nowhere", () => {
  assert.equal(parse("").status, 1);
  const bad = parse("github,nexus");
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /unknown registry: nexus/);
});

test("one release job per registry; GitHub writes packages with the workflow token only", () => {
  const github = workflow.split("  release-github:")[1].split("  release-central:")[0];
  assert.match(github, /packages: write/);
  assert.doesNotMatch(github, /secrets\.MAVEN_/);
  assert.match(workflow.split("  release-central:")[1], /environment: maven-central/);
});
