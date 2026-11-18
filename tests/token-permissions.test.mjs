// Every workflow declares a read-only token by default (krizaka-internal#4204, OpenSSF Scorecard Token-Permissions): the top level is
// `permissions: {}`, `read-all` or read scopes only, a job that needs more says so on the job, and each write carries a comment saying why.
// Scorecard 5.9 gave krizaka/.github 0 for one workflow with no top-level block (maven.yml, tauri-macos.yml); the last test keeps it at 10.
// Fixtures red and green, then the check type through runCheck, the registry entry, and this repository's own workflows.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { tokenPermissionProblems } from "../scripts/token-permissions.mjs";
import { isSecurity, loadRules, runCheck, snapshotOf, validateRules } from "../scripts/conformance.mjs";

const workflow = (top, job = "") => `name: x
on:
  push:
${top}
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 5
${job}    steps:
      - run: echo
`;

const whys = (text) => tokenPermissionProblems(text).map((p) => p.why);

test("green: permissions {}, read-all or read scopes at the top, with or without a trailing comment", () => {
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {}")), []);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions:\n  contents: read\n  actions: none")), []);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: read-all")), []);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {} # each job asks for its own")), []);
});

test("red: no top-level permissions (the repository's default token decides)", () => {
  const problems = tokenPermissionProblems(workflow(""));
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 1);
  assert.match(problems[0].why, /no top-level permissions/);
});

test("red: a top-level write, write-all, or an empty block", () => {
  assert.match(whys(workflow("permissions:\n  contents: read\n  issues: write # even explained"))[0], /top-level permissions are not read-only/);
  assert.match(whys(workflow("permissions: write-all"))[0], /top-level permissions are not read-only/);
  assert.match(whys(workflow("permissions:"))[0], /top-level permissions are not read-only/);
  assert.equal(tokenPermissionProblems(workflow("permissions:\n  issues: write"))[0].line, 4);
});

test("green: a job asks for what it needs, a write with its reason on the line or on the line above", () => {
  const trailing = "    permissions:\n      contents: write # pushes the regenerated profile to main\n      pull-requests: read\n";
  const above = "    permissions:\n      # pushes the regenerated profile to main\n      contents: write\n";
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {}", trailing)), []);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {}", above)), []);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {}", "    permissions:\n      contents: read\n")), []);
});

test("red: a job-level write without a comment saying why, and a bare write-all", () => {
  const bare = tokenPermissionProblems(workflow("permissions: {}", "    permissions:\n      contents: read\n      statuses: write\n"));
  assert.equal(bare.length, 1);
  assert.equal(bare[0].line, 11);
  assert.match(bare[0].why, /job `build`: statuses: write without a comment/);
  assert.match(whys(workflow("permissions: {}", "    permissions: write-all\n"))[0], /job `build`: write-all without a comment/);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {}", "    permissions: write-all # releases every package\n")), []);
});

test("a flow mapping is read like a block: read-only at the top, a write on the job with its reason on the line", () => {
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: { contents: read } # write scopes live on the job")), []);
  assert.match(whys(workflow("permissions: { contents: read, issues: write }"))[0], /top-level permissions are not read-only/);
  assert.deepEqual(tokenPermissionProblems(workflow("permissions: {}", "    permissions: { contents: write } # pushes the release tag\n")), []);
  const bare = tokenPermissionProblems(workflow("permissions: {}", "    permissions: { contents: read, pull-requests: write }\n"));
  assert.deepEqual(bare.map((p) => p.why), ["job `build`: pull-requests: write without a comment saying why"]);
});

test("an empty comment is not a reason, and a comment above another row does not cover the write", () => {
  assert.equal(tokenPermissionProblems(workflow("permissions: {}", "    permissions:\n      contents: write #\n")).length, 1);
  const shifted = "    permissions:\n      # reads the repository\n      contents: read\n      issues: write\n";
  assert.equal(tokenPermissionProblems(workflow("permissions: {}", shifted)).length, 1);
});

const snap = (files) => snapshotOf("krizaka-x", "npm", Object.keys(files).sort(), async (p) => files[p] ?? null, {});
const CHECK = { type: "token-permissions" };

test("the check names the file and the line, and passes on a repository whose workflows comply", async () => {
  const red = await runCheck(CHECK, snap({ ".github/workflows/a.yml": workflow("permissions: {}"), ".github/workflows/b.yml": workflow("") }));
  assert.equal(red.ok, false);
  assert.match(red.why, /\.github\/workflows\/b\.yml:1 no top-level permissions/);
  const green = await runCheck(CHECK, snap({ ".github/workflows/a.yml": workflow("permissions: read-all"), "README.md": "permissions:" }));
  assert.equal(green.ok, true);
});

test("the rule is registered, valid and a security rule (fanned out by the matrix)", () => {
  const rule = loadRules().find((r) => r.check.type === "token-permissions");
  assert.ok(rule, "rules.json has the rule");
  assert.equal(rule.id, "token-permissions");
  assert.deepEqual(validateRules([rule]), []);
  assert.equal(isSecurity(rule), true);
});

test("every workflow of krizaka/.github passes the rule", () => {
  const dir = new URL("../.github/workflows/", import.meta.url);
  const problems = readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => tokenPermissionProblems(readFileSync(new URL(f, dir), "utf8")).map((p) => `${f}:${p.line} ${p.why}`));
  assert.deepEqual(problems, []);
});
