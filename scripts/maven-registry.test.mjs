// The `registry` input of maven.yml (ADR-021): the shell step that parses it is run here for each value.
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

test("none is the default of the input and publishes nowhere; central only when the caller passes it (krizaka-internal#3554)", () => {
  assert.match(workflow, /registry:\n {8}description: [^\n]*\n {8}required: false\n {8}default: "none"/);
  assert.deepEqual(parse("none").outputs, { central: "false" });
  assert.deepEqual(parse("central").outputs, { central: "true" });
  const mixed = parse("none central");
  assert.equal(mixed.status, 1);
  assert.match(mixed.stdout, /none cannot be combined/);
});

test("the tag-run copy of the parser is the verify copy, and a none tag run says so in the step summary", () => {
  const copy = workflow.split("# registry-parse:copy-begin\n")[1].split("          # registry-parse:copy-end")[0];
  assert.equal(copy, step);
  assert.match(workflow, /deploys nothing/);
});

test("central parses correctly; github is an error (GitHub Packages removed, krizaka-internal#2701)", () => {
  assert.deepEqual(parse("central").outputs, { central: "true" });
  const github = parse("github");
  assert.equal(github.status, 1);
  assert.match(github.stdout, /no longer supported/);
  assert.equal(parse("github,central").status, 1);
});

test("an empty or unknown registry fails, never publishes nowhere", () => {
  assert.equal(parse("").status, 1);
  const bad = parse("nexus");
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /unknown registry: nexus/);
});

test("one release job for central; release-central requires the maven-central environment", () => {
  assert.doesNotMatch(workflow, /release-github:/, "release-github job removed");
  assert.match(workflow.split("  release-central:")[1], /environment: maven-central/);
});
