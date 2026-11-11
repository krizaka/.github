// The rule registry and the conformance matrix (krizaka/.github#393).
import test from "node:test";
import assert from "node:assert/strict";
import { readJson, missingFromOrg, missingMessage, appliesTo, evaluate, loadRules, patternOf, render, runCheck, scopeOf, snapshotOf, summarise, validateRules } from "../scripts/conformance.mjs";

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

test("a Sovkora component calls component.yml of krizaka/sovkora", async () => {
  const text = "uses: krizaka/sovkora/.github/workflows/component.yml@" + "b".repeat(40);
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
  assert.deepEqual(summary, [
    { id: "security-scan", pass: 1, fail: 1, unknown: 0, manual: 0 },
    { id: "dependabot-config", pass: 1, fail: 1, unknown: 0, manual: 0 },
  ]);
  const md = render(rules, cells, summary, [{ name: "paused-one" }]);
  assert.match(md, /\| bad \| \? \| security-scan, dependabot-config \| none \|/);
  assert.match(md, /Out of scope .*paused-one/);
});

test("a rule may exempt a repository, with a reason of 30+ characters; the cell is n/a and shows it (krizaka/.github#393)", async () => {
  const rule = { id: "r", title: "t", issue: "krizaka/.github#1", check: { type: "file-exists", paths: ["x"] }, fix: { type: "manual" } };
  assert.deepEqual(validateRules([{ ...rule, exempt: { a: "tofu with tflint and checkov, not a node stack at all" } }]), []);
  assert.match(validateRules([{ ...rule, exempt: { a: "too short" } }]).join(), /needs a reason/);
  const cells = await evaluate([{ ...rule, exempt: { a: "tofu with tflint and checkov, not a node stack at all" } }], [snap("a", "iac", {}), snap("b", "iac", {})]);
  assert.equal(cells.a.r.status, "n/a");
  assert.match(cells.a.r.why, /^exempt: tofu/);
  assert.equal(cells.b.r.status, "fail");
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
  assert.equal((await runCheck(check, snap("x", "app", { a: "" }))).ok, null, "offline: no scan, unknown");
});

test("published-no-mention: a package whose built files name a departed product is red, its changelog is history", async () => {
  const check = { type: "published-no-mention", pattern: "acme|initech", allow: ["CHANGELOG.md"] };
  const withPub = (hits) => ({ ...snap("x", "app", { a: "" }), published: async () => hits });
  assert.deepEqual(await runCheck(check, withPub(["@krizaka/ui@1.0.0:CHANGELOG.md"])), { ok: true, why: "" });
  const red = await runCheck(check, withPub(["@krizaka/charts@0.6.0:dist/index.js", "@krizaka/ui@1.0.0:CHANGELOG.md"]));
  assert.equal(red.ok, false);
  assert.match(red.why, /charts@0\.6\.0:dist\/index\.js/);
  assert.equal((await runCheck(check, snap("x", "app", { a: "" }))).ok, null, "offline: nothing published is read, unknown");
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

test("kachizaka is the managed storage's code name, not a departed product (krizaka-internal#2033)", () => {
  for (const id of ["no-departed-product", "no-departed-published"]) {
    const pattern = new RegExp(patternOf(loadRules().find((r) => r.id === id).check), "i");
    assert.equal(pattern.test("kachizaka"), false, id);
    assert.equal(pattern.test(Buffer.from("eW9yb3Jpcw==", "base64").toString()), true, id);
  }
});

test("commercial-names: a repository that runs the code-name guard passes, one without it fails", async () => {
  const rule = loadRules().find((r) => r.id === "commercial-names");
  assert.equal(rule.issue, "krizaka/krizaka-internal#2036");
  const pkg = (scripts) => snapshotOf("verikora", "app", ["package.json"], async () => JSON.stringify({ scripts }));
  assert.equal((await runCheck(rule.check, pkg({ "lint:names": "krizaka-code-names .next/server/app messages" }))).ok, true);
  assert.equal((await runCheck(rule.check, pkg({ lint: "eslint ." }))).ok, false);
});

test("journeys: both callers and `journeys / gate` required on main; a missing one is red, offline proves nothing", async () => {
  const rule = loadRules().find((r) => r.id === "journeys");
  const files = { ".github/workflows/ci.yml": call("journeys.yml") + call("post-deploy-journeys.yml") };
  const withChecks = (list) => snapshotOf("folioviv", "app", Object.keys(files), async (p) => files[p], { requiredChecks: async () => list });
  assert.equal((await runCheck(rule.check, withChecks(["journeys / gate"]))).ok, true);
  const red = await runCheck(rule.check, withChecks(["ci / CI gate"]));
  assert.equal(red.ok, false);
  assert.match(red.why, /journeys \/ gate/);
  assert.equal((await runCheck(rule.check, snap("folioviv", "app", files))).ok, null); // offline: unknown, never pass
  const noPost = { ".github/workflows/ci.yml": call("journeys.yml") };
  assert.equal((await runCheck(rule.check, snap("folioviv", "app", noPost))).ok, false);
  assert.deepEqual(rule.applies.onlyRepos, ["folioviv", "verikora", "sovkora"]);
});

test("merged-result-tested: a merge queue or strict passes, neither fails, offline proves nothing", async () => {
  const rule = loadRules().find((r) => r.id === "merged-result-tested");
  const files = { "package.json": "{}" };
  const guarded = (g) => snapshotOf("x", "npm", Object.keys(files), async (p) => files[p], { mergeGuard: async () => g });
  assert.equal((await runCheck(rule.check, guarded({ mergeQueue: true, strict: false }))).ok, true);
  assert.equal((await runCheck(rule.check, guarded({ mergeQueue: false, strict: true }))).ok, true);
  const red = await runCheck(rule.check, guarded({ mergeQueue: false, strict: false }));
  assert.equal(red.ok, false);
  assert.match(red.why, /merge queue/);
  assert.equal((await runCheck(rule.check, snap("x", "npm", files))).ok, null); // offline: unknown
});

test("required-checks-profile: apps need journeys/visual only where they call them; a missing group is named", async () => {
  const rule = loadRules().find((r) => r.id === "required-checks-profile");
  const base = ["ci / CI gate", "SonarCloud Code Analysis", "Security scan / gitleaks (secrets)"];
  const mk = (kind, files, req) => snapshotOf("x", kind, Object.keys(files), async (p) => files[p], { requiredChecks: async () => req });
  const none = { ".github/workflows/ci.yml": "on: push" };
  assert.equal((await runCheck(rule.check, mk("app", none, base))).ok, true);
  const withJ = { ".github/workflows/ci.yml": call("journeys.yml") + call("visual-regression.yml") };
  const red = await runCheck(rule.check, mk("app", withJ, base));
  assert.equal(red.ok, false);
  assert.match(red.why, /lack: journeys gate$/, "visual regression warns on a pull request: never a required check (rules review 2026-11-05)");
  assert.equal((await runCheck(rule.check, mk("app", withJ, [...base, "journeys / gate"]))).ok, true);
  const lib = await runCheck(rule.check, mk("maven", withJ, ["component / verify"]));
  assert.match(lib.why, /Sonar, security scan/);
  assert.equal((await runCheck(rule.check, snap("x", "app", withJ))).ok, null);
});

test("required-checks-profile: a private repository named in skipRepos owes no SonarCloud check, but still the gate and the scan", async () => {
  const rule = loadRules().find((r) => r.id === "required-checks-profile");
  const mk = (name, kind, req) => snapshotOf(name, kind, [".github/workflows/ci.yml"], async () => "on: push", { requiredChecks: async () => req });
  const noSonar = ["CI gate", "Security scan / gitleaks (secrets)"];
  assert.equal((await runCheck(rule.check, mk("krizaka-infra", "iac", noSonar))).ok, true);
  assert.equal((await runCheck(rule.check, mk("kridoc", "app", noSonar))).ok, true);
  const other = await runCheck(rule.check, mk("krizaka-ui", "app", noSonar));
  assert.equal(other.ok, false);
  assert.match(other.why, /Sonar/);
  const noGate = await runCheck(rule.check, mk("krizaka-infra", "iac", ["Security scan / gitleaks (secrets)"]));
  assert.match(noGate.why, /CI gate/);
  for (const groups of Object.values(rule.check.byKind)) {
    for (const g of groups.filter((x) => x.skipRepos)) assert.ok(g.skipWhy && g.skipWhy.length >= 30, "a skip says why");
  }
});

test("versions-current: red when a family pin is older than a version out for longer than the grace", async () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  const files = { "package.json": JSON.stringify({ devDependencies: { "@krizaka/config": "^0.19.0" } }) };
  const latest = async () => ({ version: "0.20.0", publishedAt: "2026-10-20T00:00:00Z" });
  const live = snapshotOf("a", "app", Object.keys(files), async (p) => files[p], { latest, now });
  const red = await runCheck({ type: "versions-current", ecosystems: ["npm"] }, live);
  assert.equal(red.ok, false);
  assert.match(red.why, /@krizaka\/config 0\.19\.0 < 0\.20\.0/);
  const fresh = snapshotOf("a", "app", Object.keys(files), async (p) => files[p], { latest: async () => ({ version: "0.20.0", publishedAt: "2026-10-30T00:00:00Z" }), now });
  assert.equal((await runCheck({ type: "versions-current" }, fresh)).ok, true);
  assert.equal((await runCheck({ type: "versions-current" }, snap("a", "app", files))).ok, null); // offline: unknown
});

test("release-propagation proves the bump landed, not only that the receiver exists", () => {
  const rule = loadRules().find((r) => r.id === "release-propagation");
  assert.equal(rule.check.type, "all-of");
  assert.deepEqual(rule.check.checks.map((c) => c.type).sort(), ["versions-current", "workflow-calls"]);
  const java = loadRules().find((r) => r.id === "maven-family-current");
  assert.deepEqual(java.check, { type: "versions-current", ecosystems: ["maven"], graceDays: 3 });
});

test("required-checks-report-in-queue: a required check's workflow runs on merge_group, and an app check needs a CI scan", async () => {
  const rule = loadRules().find((r) => r.id === "required-checks-report-in-queue");
  assert.ok(rule, "the rule is registered");
  assert.deepEqual(validateRules([rule]), []);
  const mk = (files, req) => snapshotOf("x", "app", Object.keys(files), async (p) => files[p], { requiredChecks: async () => req });
  const req = ["workspace", "SonarCloud Code Analysis", "Security scan / gitleaks (secrets)"];
  const ci = (queue, sonar) =>
    `name: CI\non:\n  pull_request:\n${queue ? "  merge_group:\n" : ""}jobs:\n  workspace:\n    runs-on: x\n${sonar ? "  sonar:\n    steps:\n      - uses: krizaka/.github/actions/sonar-scan@" + "a".repeat(40) + "\n" : ""}`;
  const sec = (queue) => `name: Security scan\non:\n  pull_request:\n${queue ? "  merge_group:\n" : ""}jobs:\n  gitleaks:\n    runs-on: x\n`;
  const ok = await runCheck(rule.check, mk({ ".github/workflows/ci.yml": ci(true, true), ".github/workflows/security.yml": sec(true) }, req));
  assert.equal(ok.ok, true, ok.why);
  const noQueue = await runCheck(rule.check, mk({ ".github/workflows/ci.yml": ci(false, true), ".github/workflows/security.yml": sec(true) }, req));
  assert.equal(noQueue.ok, false);
  assert.match(noQueue.why, /ci\.yml.*merge_group/);
  const noScan = await runCheck(rule.check, mk({ ".github/workflows/ci.yml": ci(true, false), ".github/workflows/security.yml": sec(true) }, req));
  assert.equal(noScan.ok, false);
  assert.match(noScan.why, /SonarCloud Code Analysis.*scan/);
  assert.equal((await runCheck(rule.check, snap("x", "app", { ".github/workflows/ci.yml": ci(false, false) }))).ok, null);
});

test("rules review 2026-11-05: the same-day rollout is for the security rules only; the run fails only on a red security cell", async () => {
  const { failing } = await import("../scripts/conformance.mjs");
  const all = loadRules();
  const security = all.filter((r) => r.security === true).map((r) => r.id).sort();
  assert.deepEqual(security, ["dependabot-config", "email-verification", "scorecard", "security-scan", "turnstile-server-side"]);
  for (const r of all) assert.ok(r.security === undefined || r.security === true, `${r.id}: security is true or absent`);
  const base = { id: "r", title: "t", issue: "krizaka/.github#1", check: { type: "file-exists", paths: ["x"] }, fix: { type: "manual" } };
  assert.match(validateRules([{ ...base, security: "yes" }]).join(), /security is true or absent/);
  const rules = all.filter((r) => ["security-scan", "shared-ci"].includes(r.id));
  assert.deepEqual(failing(rules, [{ id: "security-scan", pass: 1, fail: 0 }, { id: "shared-ci", pass: 0, fail: 3 }]), []);
  assert.deepEqual(failing(rules, [{ id: "security-scan", pass: 0, fail: 1 }, { id: "shared-ci", pass: 0, fail: 3 }]), ["security-scan"]);
  assert.deepEqual(failing(rules, [{ id: "security-scan", pass: 0, fail: 0, unknown: 2 }]), [], "unknown is not a failure");
  const cells = { a: { "security-scan": { status: "pass" }, "shared-ci": { status: "fail" } } };
  assert.match(render(rules, cells, summarise(rules, cells)), /Same-day rollout \(security rules\): security-scan\. The other rules are reported here, never fanned out\./);
});

// Founder 2026-11-06: « la matrice doit le prouver d'une façon déterministe » (krizaka-internal#2635).
const fixture = () => {
  const files = {
    ".github/workflows/s.yml": call("security-scan.yml"),
    ".github/dependabot.yml": "version: 2\n",
    "apps/web/lib/privacy-officer.test.ts": "it('names the officer', () => expect(page).toMatch('confidentialite@krizaka.com'))\n",
    "apps/web/app/[locale]/privacy/page.tsx": "export default function Page() {}\n",
    "docs/rules-register.md": "x\n<!-- org-rules:start -->\n| `security-scan` | a |\n| `privacy-officer` | b |\n<!-- org-rules:end -->\n",
  };
  return [
    snapshotOf("good", "app", Object.keys(files), async (p) => files[p], { commit: "a".repeat(40) }),
    snapshotOf("bare", "app", ["README.md"], async () => "readme", { commit: "b".repeat(40) }),
    { ...snapshotOf("down", "app", [], async () => null, { commit: null }), error: "could not read the repository: 502" },
  ];
};

test("determinism: the same content at the same commit gives the same matrix, byte for byte", async () => {
  const { reportOf } = await import("../scripts/conformance.mjs");
  const rules = loadRules();
  const run = async () => {
    const cells = await evaluate(rules, fixture());
    return JSON.stringify(reportOf({ rules, cells, summary: summarise(rules, cells), generatedAt: "2026-11-06T06:00:00.000Z", rulesCommit: "c".repeat(40) }));
  };
  const first = await run();
  assert.equal(await run(), first);
  const report = JSON.parse(first);
  assert.equal(report.schema, 2);
  const cell = report.results.find((r) => r.rule === "privacy-officer" && r.repo === "good");
  assert.deepEqual(
    { status: cell.status, commit: cell.commit, check: cell.check, runDate: cell.runDate },
    { status: "pass", commit: "a".repeat(40), check: "path-matches", runDate: "2026-11-06T06:00:00.000Z" },
  );
  assert.equal(cell.evidence[0].path, "apps/web/lib/privacy-officer.test.ts");
  assert.equal(cell.evidence[0].line, 1);
  assert.match(cell.evidence[0].sha256, /^[0-9a-f]{64}$/);
  assert.match(cell.link, /docs\/standards\/rules\.json/);
  for (const r of report.results) assert.ok(["pass", "fail", "unknown", "manual", "n/a"].includes(r.status), `${r.rule} × ${r.repo}: ${r.status}`);
});

test("a repository that cannot be read is unknown in every cell, never pass nor fail; a check that throws is unknown with its reason", async () => {
  const rules = loadRules().filter((r) => ["security-scan", "dependabot-config"].includes(r.id));
  const cells = await evaluate(rules, fixture());
  assert.deepEqual(Object.values(cells.down).map((c) => c.status), ["unknown", "unknown"]);
  assert.match(cells.down["security-scan"].why, /502/);
  const throwing = snapshotOf("t", "app", [".github/dependabot.yml"], async () => {
    throw new Error("socket hang up");
  });
  const out = await evaluate(rules, [throwing]);
  assert.equal(out.t["dependabot-config"].status, "pass", "file-exists reads no content");
  assert.equal(out.t["security-scan"].status, "fail", "no workflow tracked: a real fail");
  const reading = snapshotOf("r", "app", [".github/workflows/ci.yml"], async () => {
    throw new Error("socket hang up");
  });
  const read = await evaluate(rules, [reading]);
  assert.equal(read.r["security-scan"].status, "unknown");
  assert.match(read.r["security-scan"].why, /socket hang up/);
});

test("a manual check is never pass", async () => {
  const rule = { id: "m", title: "t", issue: "krizaka/.github#1", check: { type: "manual", note: "a person looks" }, fix: { type: "manual", note: "n" } };
  assert.deepEqual(validateRules([rule]), []);
  const cells = await evaluate([rule], [snap("a", "app", {})]);
  assert.equal(cells.a.m.status, "manual");
  assert.equal(summarise([rule], cells)[0].pass, 0);
});

test("path-matches: the per-repo test named by convention, with its content when asked", async () => {
  const check = { type: "path-matches", pattern: "(^|/)[^/]*(no-amount)[^/]*\\.test\\.mjs$", contains: "amount" };
  assert.equal((await runCheck(check, snap("a", "site", { "tests/no-amount.test.mjs": "refuses an amount" }))).ok, true);
  assert.equal((await runCheck(check, snap("a", "site", { "tests/no-amount.test.mjs": "empty" }))).ok, false);
  assert.equal((await runCheck(check, snap("a", "site", { "tests/other.test.mjs": "amount" }))).ok, false);
});

test("the public-face rules of réunion 6 are org rules with a deterministic check", () => {
  const rules = loadRules();
  for (const id of ["public-no-founder-name", "public-no-amount", "commercial-names", "code-name-hosts-noindex", "privacy-officer", "product-status-word", "one-contact-path", "rules-register"]) {
    const rule = rules.find((r) => r.id === id);
    assert.ok(rule, id);
    assert.notEqual(rule.check.type, "manual", `${id} has a real check`);
  }
});

test("rules-register: the register names exactly the rules of the registry", async () => {
  const { registerVerdict } = await import("../scripts/conformance.mjs");
  const table = (ids) => `<!-- org-rules:start -->\n| Rule | x |\n| :-- | :-- |\n${ids.map((i) => `| \`${i}\` | y |`).join("\n")}\n<!-- org-rules:end -->`;
  assert.equal(registerVerdict(table(["a", "b"]), ["a", "b"]).ok, true);
  assert.match(registerVerdict(table(["a"]), ["a", "b"]).why, /missing: b/);
  assert.match(registerVerdict(table(["a", "b", "c"]), ["a", "b"]).why, /not in rules\.json: c/);
  assert.match(registerVerdict("no table", ["a"]).why, /org-rules:start/);
});

test("the docs-map rule asks every repository to call docs-map.yml, and the fan-out copies the template", async () => {
  const rule = loadRules().find((r) => r.id === "docs-map");
  assert.deepEqual(rule.check, { type: "workflow-calls", workflows: ["docs-map.yml"] });
  assert.deepEqual(rule.fix, { type: "copy", from: "workflow-templates/docs-map.yml", to: ".github/workflows/docs-map.yml" });
  const caller = "jobs:\n  docs-map:\n    uses: krizaka/.github/.github/workflows/docs-map.yml@main\n";
  assert.equal((await runCheck(rule.check, snap("ui", "npm", { ".github/workflows/docs-map.yml": caller }))).ok, true);
  assert.equal((await runCheck(rule.check, snap("ui", "npm", { ".github/workflows/ci.yml": call("node-ci.yml") }))).ok, false);
});

// ADR-026 phase D: the file-name regexes became lists and small functions; the expectations were recorded from the regex version
// (a comparison on 30,000 generated paths and 5,000 generated workflows gave no difference).
import { isManifest, isPackageManifest, isTestConfig, MANIFEST_FILES, REUSABLE_WORKFLOW_REPOS } from "../scripts/conformance.mjs";

test("file-name tests: a test runner's config, a manifest, a package.json outside node_modules", () => {
  for (const p of ["playwright.config.ts", "apps/web/vitest.config.mjs", "jest.config.cjs", "junit-platform.properties", "x/junit-platform.properties"]) assert.equal(isTestConfig(p), true, p);
  for (const p of ["my-jest.config.js", "jest.config.json", "xjunit-platform.properties", "vitest.config.ts.bak"]) assert.equal(isTestConfig(p), false, p);
  for (const p of ["package.json", "a/pom.xml", "pnpm-workspace.yaml", "x/.gitmodules", "build.gradle", "b/build.gradle.kts"]) assert.equal(isManifest(p), true, p);
  for (const p of ["xpackage.json", "package.json5", "build.gradle.kt", "a/pom.xml/b"]) assert.equal(isManifest(p), false, p);
  assert.equal(isPackageManifest("apps/web/package.json"), true);
  assert.equal(isPackageManifest("node_modules/x/package.json"), false);
  assert.equal(isPackageManifest("xpackage.json"), false);
  assert.ok(MANIFEST_FILES.includes("pom.xml") && REUSABLE_WORKFLOW_REPOS.includes(".github"));
});

test("workflow-calls counts the reusable workflows of the org's own repositories only", async () => {
  const caller = (repo, file) => `jobs:\n  x:\n    uses: krizaka/${repo}/.github/workflows/${file}@v1\n`;
  const check = { type: "workflow-calls", workflows: ["a.yml"] };
  for (const repo of [".github", "sovkora", "orazaka"]) assert.equal((await runCheck(check, snap("r", "npm", { ".github/workflows/c.yml": caller(repo, "a.yml") }))).ok, true, repo);
  for (const repo of ["sovkora-web", "other"]) assert.equal((await runCheck(check, snap("r", "npm", { ".github/workflows/c.yml": caller(repo, "a.yml") }))).ok, false, repo);
});

test("the guard names each listed repository the org does not have, before any token is minted", () => {
  const org = ["a", "b", "krizaka-internal"];
  assert.deepEqual(missingFromOrg(["a", "b", "krizaka-template-web", "krizaka-composer", "a"], org), ["krizaka-composer", "krizaka-template-web"]);
  assert.match(missingMessage(["x", "y"]), /: x, y\./);
  assert.equal(missingMessage(missingFromOrg(["a", "krizaka-internal"], org)), null);
});

test("every active repository of repos.json exists by its current name in the registry lists", () => {
  const names = readJson("repos.json").repositories.map((r) => r.name);
  assert.equal(names.includes("krizaka-composer"), false);
  const { active } = scopeOf(readJson("repos.json").repositories);
  assert.equal(active.some((r) => /^krizaka-template-(web|desktop)$/.test(r.name)), false);
});
