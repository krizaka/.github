// The rule registry and the conformance matrix (krizaka/.github#393).
import test from "node:test";
import assert from "node:assert/strict";
import { appliesTo, evaluate, loadRules, render, runCheck, scopeOf, snapshotOf, summarise, validateRules } from "../scripts/conformance.mjs";

const snap = (name, kind, files) => snapshotOf(name, kind, Object.keys(files), async (p) => files[p]);
const call = (w) => `jobs:\n  x:\n    uses: krizaka/.github/.github/workflows/${w}@${"a".repeat(40)} # main\n`;

test("the registry is valid: every rule has an issue, a check and a fix", () => {
  assert.deepEqual(validateRules(loadRules()), []);
});

test("it registers the rules the founder listed", () => {
  const ids = loadRules().map((r) => r.id);
  for (const id of ["security-scan", "shared-ci", "no-inline-sonar", "scorecard", "dependabot-config", "dependabot-automerge", "visual-regression", "agents-anti-slop", "edit-hook", "release-propagation", "workspace-guard", "expo-sdk-guard"]) {
    assert.ok(ids.includes(id), id);
  }
});

test("a rule without its check, or with an incomplete one, is refused", () => {
  assert.match(validateRules([{ id: "x", title: "t", issue: "krizaka/.github#1", fix: { type: "manual" } }]).join(), /no check/);
  assert.match(validateRules([{ id: "x", title: "t", issue: "krizaka/.github#1", fix: { type: "manual" }, check: { type: "file-exists" } }]).join(), /incomplete/);
  assert.match(validateRules([{ id: "x", title: "t", issue: "oops", check: { type: "file-exists", paths: ["a"] }, fix: { type: "manual" } }]).join(), /no issue/);
});

test("paused, archived and « Archive » repositories are out of scope", () => {
  const { active, paused } = scopeOf([
    { name: "a", status: "Complies", archived: false },
    { name: "b", status: "Rename → c", archived: false },
    { name: "p", status: "Paused (2026-10-25), private", archived: false },
    { name: "z", status: "Archive", archived: null },
    { name: "y", status: "Complies", archived: true },
  ]);
  assert.deepEqual(active.map((r) => r.name), ["a", "b"]);
  assert.deepEqual(paused.map((r) => r.name), ["p", "z", "y"]);
});

test("workflow-calls reads the called workflows, per stack", async () => {
  const check = { type: "workflow-calls", byKind: { site: ["node-ci.yml"], maven: ["maven.yml", "java-ci.yml"] } };
  assert.equal((await runCheck(check, snap("b", "site", { ".github/workflows/ci.yml": call("node-ci.yml") }))).ok, true);
  assert.equal((await runCheck(check, snap("b", "site", { ".github/workflows/ci.yml": "steps:\n  - run: npm ci\n" }))).ok, false);
  assert.equal((await runCheck(check, snap("m", "maven", { ".github/workflows/ci.yml": call("node-ci.yml") }))).ok, false);
  assert.equal((await runCheck(check, snap("m", "maven", { ".github/workflows/ci.yml": call("java-ci.yml") }))).ok, true);
});

test("an Orazaka component calls component.yml of krizaka/orazaka", async () => {
  const text = "uses: krizaka/orazaka/.github/workflows/component.yml@" + "b".repeat(40);
  const check = { type: "workflow-calls", byKind: { maven: ["component.yml"] } };
  assert.equal((await runCheck(check, snap("c", "maven", { ".github/workflows/ci.yml": text }))).ok, true);
});

test("an inline Sonar scanner step is refused", async () => {
  const check = loadRules().find((r) => r.id === "no-inline-sonar").check;
  const inline = "steps:\n  - uses: SonarSource/sonarcloud-github-action@v3\n";
  assert.equal((await runCheck(check, snap("ui", "npm", { ".github/workflows/ci.yml": inline }))).ok, false);
  assert.equal((await runCheck(check, snap("ui", "npm", { ".github/workflows/ci.yml": call("node-ci.yml") }))).ok, true);
});

test("file checks: exists, and contains", async () => {
  const hook = loadRules().find((r) => r.id === "edit-hook").check;
  assert.equal((await runCheck(hook, snap("a", "app", {}))).ok, false);
  assert.equal((await runCheck(hook, snap("a", "app", { ".claude/settings.json": "{}" }))).ok, false);
  assert.equal((await runCheck(hook, snap("a", "app", { ".claude/settings.json": '{"command":"npx krizaka-edit-check"}' }))).ok, true);
  const dep = loadRules().find((r) => r.id === "dependabot-config").check;
  assert.equal((await runCheck(dep, snap("a", "app", { ".github/dependabot.yml": "v" }))).ok, true);
});

test("conditions: kinds, pnpm workspaces, Expo apps, release consumers", async () => {
  const by = (id) => loadRules().find((r) => r.id === id);
  assert.equal(await appliesTo(by("visual-regression"), snap("m", "maven", {})), false);
  assert.equal(await appliesTo(by("visual-regression"), snap("a", "app", {})), true);
  assert.equal(await appliesTo(by("workspace-guard"), snap("a", "app", {})), false);
  assert.equal(await appliesTo(by("workspace-guard"), snap("a", "app", { "pnpm-workspace.yaml": "packages:\n  - a\n" })), true);
  assert.equal(await appliesTo(by("workspace-guard"), snap("a", "app", { "pnpm-workspace.yaml": "minimumReleaseAge: 1\n" })), false);
  assert.equal(await appliesTo(by("expo-sdk-guard"), snap("a", "app", { "apps/mobile/eas.json": "{}" })), true);
  assert.equal(await appliesTo(by("expo-sdk-guard"), snap("a", "app", { "package.json": "{}" })), false);
  const lists = { "orchestration/release-consumers.json": ["a"] };
  assert.equal(await appliesTo(by("release-propagation"), snap("a", "app", {}), lists), true);
  assert.equal(await appliesTo(by("release-propagation"), snap("b", "app", {}), lists), false);
  assert.equal(await appliesTo(by("no-inline-sonar"), snap(".github", "none", {})), false);
});

test("the matrix counts red and green per rule and lists what is out of scope", async () => {
  const rules = loadRules().filter((r) => ["security-scan", "dependabot-config"].includes(r.id));
  const cells = await evaluate(rules, [
    snap("ok", "app", { ".github/workflows/s.yml": call("security-scan.yml"), ".github/dependabot.yml": "v" }),
    snap("bad", "app", {}),
  ]);
  const summary = summarise(rules, cells);
  assert.deepEqual(summary, [{ id: "security-scan", green: 1, red: 1 }, { id: "dependabot-config", green: 1, red: 1 }]);
  const md = render(rules, cells, summary, [{ name: "paused-one" }]);
  assert.match(md, /\| bad \| security-scan, dependabot-config \|/);
  assert.match(md, /Out of scope .*paused-one/);
});

test("a rule may exempt a repository, with a reason of 30+ characters; the cell is n/a and shows it (krizaka/.github#393)", async () => {
  const rule = { id: "r", title: "t", issue: "krizaka/.github#1", check: { type: "file-exists", paths: ["x"] }, fix: { type: "manual" } };
  assert.deepEqual(validateRules([{ ...rule, exempt: { a: "tofu with tflint and checkov, not a node stack at all" } }]), []);
  assert.match(validateRules([{ ...rule, exempt: { a: "too short" } }]).join(), /needs a reason/);
  const cells = await evaluate([{ ...rule, exempt: { a: "tofu with tflint and checkov, not a node stack at all" } }], [snap("a", "iac", {}), snap("b", "iac", {})]);
  assert.equal(cells.a.r.status, "n/a");
  assert.match(cells.a.r.why, /^exempt: tofu/);
  assert.equal(cells.b.r.status, "red");
});

test("onlyRepos limits a rule to the repositories that carry the thing (the Turnstile forms)", async () => {
  const rule = { id: "r", applies: { onlyRepos: ["krizaka-com"] } };
  assert.equal(await appliesTo(rule, snap("krizaka-com", "site", {})), true);
  assert.equal(await appliesTo(rule, snap("other", "site", {})), false);
});

test("the email-verification rule: the two public e-mail forms, each with the file that proves the address", async () => {
  const { loadRules, runCheck } = await import("../scripts/conformance.mjs");
  const rule = loadRules().find((r) => r.id === "email-verification");
  assert.ok(rule, "the rule is in the registry");
  assert.deepEqual(rule.applies.onlyRepos, ["krizaka-com", "krizaka-blog"]);
  assert.equal((await runCheck(rule.check, { paths: ["lib/contact-verification.ts"] })).ok, true);
  assert.equal((await runCheck(rule.check, { paths: ["functions/packages/newsletter/confirm/index.js"] })).ok, true);
  assert.equal((await runCheck(rule.check, { paths: ["lib/contact.ts"] })).ok, false);
});

test("the lab-isolation rule: nothing outside the lab depends on the lab", async () => {
  const rule = loadRules().find((r) => r.id === "lab-isolation");
  assert.ok(rule, "the rule is in the registry");
  assert.equal(await appliesTo(rule, snap("krizaka-lab", "npm", {})), false);
  assert.equal(await appliesTo(rule, snap("krizaka-ui", "npm", {})), true);
  const clean = snap("krizaka-ui", "npm", { "package.json": '{"dependencies":{"@krizaka/tokens":"1"}}' });
  assert.equal((await runCheck(rule.check, clean)).ok, true);
  for (const body of ['{"dependencies":{"krizaka-lab":"github:krizaka/krizaka-lab"}}', '{"dependencies":{"@krizaka/motion":"1"}}']) {
    assert.equal((await runCheck(rule.check, snap("x", "npm", { "package.json": body }))).ok, false, body);
  }
  const sub = snap("x", "npm", { ".gitmodules": "[submodule]\n url = https://github.com/krizaka/krizaka-lab" });
  assert.equal((await runCheck(rule.check, sub)).ok, false);
  const doc = snap("x", "npm", { "README.md": "see krizaka-lab", "package.json": "{}" });
  assert.equal((await runCheck(rule.check, doc)).ok, true, "prose is not a dependency");
});
