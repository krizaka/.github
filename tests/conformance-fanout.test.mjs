// The fan-out of a rule (krizaka/.github#393): pure parts.
import test from "node:test";
import assert from "node:assert/strict";
import { filesFor, pinTemplate, planOf, sectionOf, withHook } from "../scripts/conformance-fanout.mjs";
import { loadRules } from "../scripts/conformance.mjs";

const SHA = "c".repeat(40);
const rule = (id) => loadRules().find((r) => r.id === id);

test("a template's reusable call is pinned to a commit and keeps its branch as the comment", () => {
  const out = pinTemplate("    uses: krizaka/.github/.github/workflows/security-scan.yml@main\n", SHA);
  assert.equal(out, `    uses: krizaka/.github/.github/workflows/security-scan.yml@${SHA} # main\n`);
});

test("every copy template exists and calls the workflow its rule checks", async () => {
  for (const r of loadRules().filter((x) => x.fix.type === "copy")) {
    const [file] = await filesFor(r, { sha: SHA });
    assert.match(file.path, /^\.github\/workflows\//);
    if (r.check.type === "workflow-calls") assert.ok(r.check.workflows.some((w) => file.content.includes(w)), r.id);
    if (r.check.type === "workflow-matches") assert.match(file.content, new RegExp(r.check.pattern), r.id);
    assert.doesNotMatch(file.content, /workflows\/[\w.-]+@main/, `${r.id} is pinned`);
  }
});

test("the anti-slop section is appended to AGENTS.md, or starts one; never twice a heading", async () => {
  const r = rule("agents-anti-slop");
  const [appended] = await filesFor(r, { sha: SHA, current: async () => "# AGENTS.md\n\nMine.\n" });
  assert.match(appended.content, /^# AGENTS.md\n\nMine\.\n\n## 9\. Anti-slop \(ADR-015\)/);
  const [created] = await filesFor(r, { sha: SHA, current: async () => null });
  assert.match(created.content, /^# AGENTS.md[\s\S]*## 9\. Anti-slop/);
  assert.equal(sectionOf("a\n## 9. Anti-slop (ADR-015)\nbody\n", "## 9. Anti-slop (ADR-015)"), "## 9. Anti-slop (ADR-015)\nbody\n");
});

test("the edit hook is merged into settings.json, once, keeping what is there", () => {
  const merged = JSON.parse(withHook('{"permissions":{"allow":["Bash(ls)"]},"hooks":{"PostToolUse":[{"matcher":"Bash","hooks":[]}]}}'));
  assert.deepEqual(merged.permissions, { allow: ["Bash(ls)"] });
  assert.equal(merged.hooks.PostToolUse.length, 2);
  assert.equal(JSON.parse(withHook(withHook(null))).hooks.PostToolUse.length, 1);
});

test("the plan: one pull request per red repository, manual rules listed apart", () => {
  const rules = loadRules();
  const cells = {
    a: { "security-scan": { status: "red" }, "shared-ci": { status: "red" }, scorecard: { status: "green" } },
    b: { "security-scan": { status: "green" } },
    c: { "shared-ci": { status: "red" } },
  };
  assert.deepEqual(planOf(rules, cells), [
    { repo: "a", rules: ["security-scan"], manual: ["shared-ci"] },
    { repo: "c", rules: [], manual: ["shared-ci"] },
  ]);
  assert.deepEqual(planOf(rules, cells, { repos: ["a"], rules: ["security-scan"] }), [{ repo: "a", rules: ["security-scan"], manual: [] }]);
});
