// A caller job of a reusable workflow must grant what the called jobs ask for (krizaka-internal#3342): « Bump @krizaka packages »
// was a startup_failure with 0 jobs in every consumer because the caller job granted nothing while the called job asked contents: read.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { callerPermissionProblems } from "../scripts/caller-permissions.mjs";
import { loadRules, runCheck, snapshotOf, validateRules } from "../scripts/conformance.mjs";

const SHA = "a".repeat(40);
const USES = `uses: krizaka/.github/.github/workflows/bump-krizaka.yml@${SHA} # main`;
const CALLEE = "name: x\non:\n  workflow_call:\npermissions: {}\njobs:\n  bump:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n    steps:\n      - run: echo\n";
const caller = (top, job) => `name: c\non: push\n${top}jobs:\n  bump:\n${job}    ${USES}\n`;
const reusable = async () => CALLEE;

test("caller-permissions: a caller job that grants nothing to a job asking contents: read is refused (the startup_failure of #3342)", async () => {
  const text = caller("permissions: {}\n", "");
  const problems = await callerPermissionProblems(".github/workflows/bump-krizaka.yml", text, reusable);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /bump.*contents: read/);
});

test("caller-permissions: the job that grants contents: read, or write, passes; so does a workflow-level grant", async () => {
  for (const [top, job] of [
    ["permissions: {}\n", "    permissions:\n      contents: read\n"],
    ["permissions: {}\n", "    permissions:\n      contents: write\n"],
    ["permissions:\n  contents: read\n", ""],
    ["permissions: read-all\n", ""],
    ["permissions: write-all\n", ""],
  ]) assert.deepEqual(await callerPermissionProblems("c.yml", caller(top, job), reusable), [], top + job);
});

test("caller-permissions: a job-level grant replaces the workflow-level one, so a job that grants nothing is refused whatever the top says", async () => {
  const text = caller("permissions:\n  contents: read\n", "    permissions: {}\n");
  assert.equal((await callerPermissionProblems("c.yml", text, reusable)).length, 1);
});

test("caller-permissions: a read grant does not cover a write ask; a caller with no permissions key is not judged (default token)", async () => {
  const writes = async () => CALLEE.replace("contents: read", "contents: write");
  assert.equal((await callerPermissionProblems("c.yml", caller("", "    permissions:\n      contents: read\n"), writes)).length, 1);
  assert.deepEqual(await callerPermissionProblems("c.yml", caller("", ""), reusable), []);
});

test("caller-permissions: a callee that asks nothing, or a call outside the org's reusable workflows, needs nothing", async () => {
  assert.deepEqual(await callerPermissionProblems("c.yml", caller("permissions: {}\n", ""), async () => CALLEE.replace("    permissions:\n      contents: read\n", "")), []);
  const other = `jobs:\n  b:\n    uses: someone/else/.github/workflows/x.yml@${SHA}\n`;
  assert.deepEqual(await callerPermissionProblems("c.yml", `permissions: {}\n${other}`, reusable), []);
});

test("caller-permissions: the conformance rule judges every workflow of a repository and is unread offline", async () => {
  const rule = loadRules().find((r) => r.id === "caller-permissions");
  assert.ok(rule, "the rule is registered");
  assert.deepEqual(validateRules([rule]), []);
  const files = { ".github/workflows/bump-krizaka.yml": caller("permissions: {}\n", "") };
  const mk = (extra) => snapshotOf("verikora", "npm", Object.keys(files), async (p) => files[p], extra);
  assert.equal((await runCheck(rule.check, mk({ reusable }))).ok, false);
  assert.equal((await runCheck(rule.check, mk({}))).ok, null);
  const fixed = { ".github/workflows/bump-krizaka.yml": caller("permissions: {}\n", "    permissions:\n      contents: read\n") };
  assert.equal((await runCheck(rule.check, snapshotOf("verikora", "npm", Object.keys(fixed), async (p) => fixed[p], { reusable }))).ok, true);
});

test("the caller template of bump-krizaka.yml grants the called job what it asks for", async () => {
  const text = readFileSync(new URL("../workflow-templates/bump-krizaka.yml", import.meta.url), "utf8");
  const callee = readFileSync(new URL("../.github/workflows/bump-krizaka.yml", import.meta.url), "utf8");
  assert.deepEqual(await callerPermissionProblems("workflow-templates/bump-krizaka.yml", text, async () => callee), []);
});

test("the fix of the rule copies the bump caller template (the rule is reported, not a security rule: the founder decides that)", () => {
  const rule = loadRules().find((r) => r.id === "caller-permissions");
  assert.equal(rule.security, undefined);
  assert.deepEqual(rule.fix, { type: "copy", from: "workflow-templates/bump-krizaka.yml", to: ".github/workflows/bump-krizaka.yml" });
});
