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

test("no-mention: a departed product named outside the allow list is red, history is allowed", async () => {
  const check = { type: "no-mention", pattern: "acme|globex", allow: ["CHANGELOG.md"], allowIn: { r: ["notes/"] } };
  const withScan = (name, hits) => ({ ...snap(name, "app", { a: "" }), scan: async () => hits });
  assert.deepEqual(await runCheck(check, withScan("x", ["CHANGELOG.md"])), { ok: true, why: "" });
  assert.deepEqual(await runCheck(check, withScan("x", ["packages/ui/CHANGELOG.md"])), { ok: true, why: "" }, "a package changelog is history too");
  assert.deepEqual(await runCheck(check, withScan("r", ["notes/a.md"])), { ok: true, why: "" });
  const red = await runCheck(check, withScan("x", ["notes/a.md", "CHANGELOG.md"]));
  assert.equal(red.ok, false);
  assert.match(red.why, /notes\/a\.md/);
  assert.equal((await runCheck(check, snap("x", "app", { a: "" }))).ok, true, "offline: no scan, nothing to prove");
});

test("published-no-mention: a package whose built files name a departed product is red, its changelog is history", async () => {
  const check = { type: "published-no-mention", pattern: "acme|initech", allow: ["CHANGELOG.md"] };
  const withPub = (hits) => ({ ...snap("x", "app", { a: "" }), published: async () => hits });
  assert.deepEqual(await runCheck(check, withPub(["@krizaka/ui@1.0.0:CHANGELOG.md"])), { ok: true, why: "" });
  const red = await runCheck(check, withPub(["@krizaka/charts@0.6.0:dist/index.js", "@krizaka/ui@1.0.0:CHANGELOG.md"]));
  assert.equal(red.ok, false);
  assert.match(red.why, /charts@0\.6\.0:dist\/index\.js/);
  assert.equal((await runCheck(check, snap("x", "app", { a: "" }))).ok, true, "offline: nothing published is read");
  const rule = loadRules().find((r) => r.id === "no-departed-published");
  assert.ok(rule, "the rule is in the registry");
});

test("tarballMatches reads the text files of a GitHub tarball and skips the binaries", async () => {
  const { gzipSync } = await import("node:zlib");
  const { tarballMatches } = await import("../scripts/conformance.mjs");
  const entry = (name, body) => {
    const head = Buffer.alloc(512);
    head.write(name);
    head.write(body.length.toString(8).padStart(11, "0"), 124);
    head[156] = 48;
    return Buffer.concat([head, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
  };
  const tar = Buffer.concat([entry("top/a.md", Buffer.from("see Acme")), entry("top/b.md", Buffer.from("clean")), entry("top/c.bin", Buffer.from([0, 1, 2])), Buffer.alloc(1024)]);
  assert.deepEqual(tarballMatches(gzipSync(tar), /acme/i), ["a.md"]);
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

test("formatter: a config, the format:check script and its CI step are all required (krizaka/.github#427)", async () => {
  const rule = loadRules().find((r) => r.id === "formatter");
  assert.ok(rule);
  const pkg = JSON.stringify({ scripts: { "format:check": 'prettier --check "**/*.{ts,tsx}"' } });
  const full = { "package.json": pkg, "prettier.config.js": "x", ".github/workflows/ci.yml": `${call("node-ci.yml")}    with:\n      format-script: format:check\n` };
  assert.equal(await appliesTo(rule, snap("r", "site", { "pom.xml": "" })), false);
  assert.equal((await runCheck(rule.check, snap("r", "site", full))).ok, true);
  const { "prettier.config.js": _config, ...noConfig } = full;
  assert.equal((await runCheck(rule.check, snap("r", "site", noConfig))).ok, false);
  assert.match((await runCheck(rule.check, snap("r", "site", { ...full, "package.json": "{}" }))).why, /format:check/);
  assert.equal((await runCheck(rule.check, snap("r", "site", { ...full, ".github/workflows/ci.yml": call("node-ci.yml") }))).ok, false);
  // The same step as the lint script's tail, for a pipeline that is not node-ci.
  const inLint = { ...full, ".github/workflows/ci.yml": call("expo-ci.yml"), "package.json": JSON.stringify({ scripts: { lint: "eslint . && pnpm run format:check", "format:check": "prettier --check ." } }) };
  assert.equal((await runCheck(rule.check, snap("r", "site", inLint))).ok, true);
});

test("all-of must list real, non-nested checks", () => {
  const base = { id: "x", title: "t", issue: "krizaka/.github#1", fix: { type: "manual" } };
  assert.match(validateRules([{ ...base, check: { type: "all-of", checks: [] } }]).join(), /incomplete/);
  assert.match(validateRules([{ ...base, check: { type: "all-of", checks: [{ type: "all-of" }] } }]).join(), /incomplete/);
});

test("a check may store its pattern encoded, so the registry spells none of the words it refuses (krizaka/.github#413)", async () => {
  const { patternOf } = await import("../scripts/conformance.mjs");
  assert.equal(patternOf({ pattern: "a|b" }), "a|b");
  assert.equal(patternOf({ patternBase64: Buffer.from("acme|globex").toString("base64") }), "acme|globex");
  assert.equal(patternOf({}), undefined);
  for (const id of ["no-departed-product", "no-departed-published"]) {
    const rule = loadRules().find((r) => r.id === id);
    assert.ok(rule.check.patternBase64 && !rule.check.pattern, id);
    assert.ok(new RegExp(patternOf(rule.check), "i").test(Buffer.from(rule.check.patternBase64, "base64").toString()), id);
  }
});

test("journeys: both callers and `journeys / gate` required on main; a missing one is red, offline proves nothing", async () => {
  const rule = loadRules().find((r) => r.id === "journeys");
  const files = { ".github/workflows/ci.yml": call("journeys.yml") + call("post-deploy-journeys.yml") };
  const withChecks = (list) => snapshotOf("akinaza", "app", Object.keys(files), async (p) => files[p], null, null, async () => list);
  assert.equal((await runCheck(rule.check, withChecks(["journeys / gate"]))).ok, true);
  const red = await runCheck(rule.check, withChecks(["ci / CI gate"]));
  assert.equal(red.ok, false);
  assert.match(red.why, /journeys \/ gate/);
  assert.equal((await runCheck(rule.check, snap("akinaza", "app", files))).ok, true);
  const noPost = { ".github/workflows/ci.yml": call("journeys.yml") };
  assert.equal((await runCheck(rule.check, snap("akinaza", "app", noPost))).ok, false);
  assert.deepEqual(rule.applies.onlyRepos, ["akinaza", "yomizaka", "orazaka-web-client"]);
});

test("merged-result-tested: a merge queue or strict passes, neither fails, offline proves nothing", async () => {
  const rule = loadRules().find((r) => r.id === "merged-result-tested");
  const files = { "package.json": "{}" };
  const guarded = (g) => snapshotOf("x", "npm", Object.keys(files), async (p) => files[p], null, null, null, async () => g);
  assert.equal((await runCheck(rule.check, guarded({ mergeQueue: true, strict: false }))).ok, true);
  assert.equal((await runCheck(rule.check, guarded({ mergeQueue: false, strict: true }))).ok, true);
  const red = await runCheck(rule.check, guarded({ mergeQueue: false, strict: false }));
  assert.equal(red.ok, false);
  assert.match(red.why, /merge queue/);
  assert.equal((await runCheck(rule.check, snap("x", "npm", files))).ok, true);
});

test("required-checks-profile: apps need journeys/visual only where they call them; a missing group is named", async () => {
  const rule = loadRules().find((r) => r.id === "required-checks-profile");
  const base = ["ci / CI gate", "SonarCloud Code Analysis", "Security scan / gitleaks (secrets)"];
  const mk = (kind, files, req) => snapshotOf("x", kind, Object.keys(files), async (p) => files[p], null, null, async () => req);
  const none = { ".github/workflows/ci.yml": "on: push" };
  assert.equal((await runCheck(rule.check, mk("app", none, base))).ok, true);
  const withJ = { ".github/workflows/ci.yml": call("journeys.yml") + call("visual-regression.yml") };
  const red = await runCheck(rule.check, mk("app", withJ, base));
  assert.equal(red.ok, false);
  assert.match(red.why, /journeys gate, visual regression/);
  assert.equal((await runCheck(rule.check, mk("app", withJ, [...base, "journeys / gate", "visual / Visual regression"]))).ok, true);
  const lib = await runCheck(rule.check, mk("maven", withJ, ["component / verify"]));
  assert.match(lib.why, /Sonar, security scan/);
  assert.equal((await runCheck(rule.check, snap("x", "app", withJ))).ok, true);
});
