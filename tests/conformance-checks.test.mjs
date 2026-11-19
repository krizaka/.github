// The site rules of the conformance matrix (krizaka-internal#3783): a site fails when it lags the kit, declares raw colours
// or hard-codes a bird. Pure parts, then the three check types through runCheck on a snapshot.
import test from "node:test";
import assert from "node:assert/strict";
import { birdLiteralHits, guardOf, minorsBehind, rawColourHits, runCheck } from "../scripts/conformance-checks.mjs";
import { appliesTo, doorsOf, readJson, scopeOf, snapshotOf, validateRules, loadRules } from "../scripts/conformance-registry.mjs";
import { evaluate } from "../scripts/conformance.mjs";
import { missingSites } from "../scripts/krizaka-release.mjs";
import { sitesOf } from "../scripts/gen-sites.mjs";

const NOW = Date.parse("2026-11-15T00:00:00Z");
const snap = (files, latest, name = "krizaka-x") =>
  snapshotOf(name, "node", Object.keys(files).sort(), async (p) => files[p] ?? null, { latest, now: NOW });
const pkg = (deps) => JSON.stringify({ dependencies: deps });
const published = (versions) => async ({ name }) => ({ version: versions[name], publishedAt: "2026-11-01T00:00:00Z", times: {} });

test("minors behind: 0.x and 1.x count the same, a major is always more than one", () => {
  assert.equal(minorsBehind("4.4.1", "4.7.1"), 3);
  assert.equal(minorsBehind("4.6.0", "4.7.1"), 1);
  assert.equal(minorsBehind("0.26.2", "0.26.9"), 0);
  assert.equal(minorsBehind("0.4.0", "0.26.2"), 22);
  assert.equal(minorsBehind("3.9.0", "4.0.0"), Infinity);
});

const KIT = { type: "kit-lag", packages: ["@krizaka/ui", "@krizaka/org"], maxMinors: 1 };

test("kit-lag: one minor behind is fine, two is red and names the package", async () => {
  const latest = published({ "@krizaka/ui": "4.7.1", "@krizaka/org": "1.7.1" });
  const ok = await runCheck(KIT, snap({ "package.json": pkg({ "@krizaka/ui": "^4.6.0", "@krizaka/org": "^1.7.0" }) }, latest));
  assert.equal(ok.ok, true);
  const red = await runCheck(KIT, snap({ "site/package.json": pkg({ "@krizaka/ui": "^4.4.1", "@krizaka/org": "^1.7.0" }) }, latest));
  assert.equal(red.ok, false);
  assert.match(red.why, /@krizaka\/ui 4\.4\.1 → 4\.7\.1/);
});

test("kit-lag ignores a day count (a pin published yesterday still counts) and packages outside the kit", async () => {
  const latest = published({ "@krizaka/ui": "4.7.1", "@krizaka/query": "9.0.0" });
  const r = await runCheck(KIT, snap({ "package.json": pkg({ "@krizaka/ui": "4.7.1", "@krizaka/query": "1.0.0" }) }, latest));
  assert.equal(r.ok, true);
});

test("kit-lag is not read offline", async () => {
  const r = await runCheck(KIT, snap({ "package.json": pkg({ "@krizaka/ui": "4.0.0" }) }, null));
  assert.equal(r.ok, null);
});

test("raw colours: hex, rgb and hsl count; a var(--kz-…) fallback and anchors do not", () => {
  const text = [
    "color: #ff0000;",
    "background: rgb(0 0 0 / 0.5);",
    "border: 1px solid hsl(10 20% 30%);",
    "color: var(--kz-ink, #123456);",
    '<a href="#main">x</a> &#8217; item#12',
    "fill: #abc;",
  ].join("\n");
  assert.deepEqual(rawColourHits(text).map((h) => h.line), [1, 2, 3, 6]);
});

const COLOUR = { type: "raw-colour", known: { "krizaka-x": 1 }, except: ["(^|/)og\\.png/route\\.tsx$", "(^|/)manifest\\.ts$"] };

test("raw-colour: sources only, og and manifest allowed, the ratchet tolerates the known count and no more", async () => {
  const files = {
    "app/page.tsx": 'const c = "#ff0000";',
    "app/og.png/route.tsx": 'const c = "#ffffff";',
    "app/manifest.ts": 'theme_color: "#000000"',
    "site/lib/a.css": "a { color: var(--kz-ink); }",
    "scripts/x.mjs": 'const c = "#111111";',
    "node_modules/x/app/y.css": "a{color:#fff}",
  };
  assert.equal((await runCheck(COLOUR, snap(files))).ok, true);
  const worse = await runCheck(COLOUR, snap({ ...files, "app/b.css": "a { color: rgb(1 2 3); }" }));
  assert.equal(worse.ok, false);
  assert.match(worse.why, /2 raw colour\(s\), ratchet 1/);
  assert.match(worse.why, /app\/b\.css:1/);
  assert.equal((await runCheck(COLOUR, snap({ "app/a.css": "a{}" }, undefined, "other"))).ok, true);
});

test("raw-colour: a repository outside the ratchet starts at zero", async () => {
  assert.equal((await runCheck(COLOUR, snap({ "app/a.css": "a{color:#fff}" }, undefined, "other"))).ok, false);
});

test("bird literals: bird=, bird: and tone= with a string are found, a value from the org is not", () => {
  const text = [
    '<MascotQuote bird="duck" />',
    "const home = { bird: 'owl' };",
    "<SiteMascot bird={site.mascot} />",
    '<Mascot tone="host" bird={bird} />',
    "bird: \"falcon\" | \"pigeon\" | null;",
    '<Mascot bird={bird} tone="own" />',
    '<Badge tone="ok" />',
    "const birds = org.sites.map((s) => s.mascot);",
  ].join("\n");
  assert.deepEqual(birdLiteralHits(text).map((h) => h.line), [1, 2, 4]);
});

const BIRD = { type: "bird-literal", allow: ["^app/data/"] };

test("bird-literal: a content bird in an allowed data file passes, elsewhere it fails", async () => {
  const data = { "app/data/blocks.ts": 'export const b = { bird: "falcon" };' };
  assert.equal((await runCheck(BIRD, snap(data))).ok, true);
  const red = await runCheck(BIRD, snap({ ...data, "site/app/components/Home.tsx": '<MascotQuote bird="duck" />' }));
  assert.equal(red.ok, false);
  assert.match(red.why, /Home\.tsx:1/);
});

test("sites: the repos of the company and open-source family, plus the repos of the coming-soon apps", () => {
  const org = `const FAMILY_ROWS: FamilyRow[] = [
  ["krizaka", "Krizaka", "Krizaka", "krizaka", "released", "https://www.krizaka.com", gh("krizaka-com")],
  ["sovkora", "Sovkora", "Sovkora", "products", "development", "https://www.sovkora.com", gh("sovkora")],
  ["ts", "Krizaka TypeScript", "TypeScript", "open-source", "development", "https://ts.krizaka.com", gh("krizaka-ts")],
  ["github", "GitHub", "GitHub", "github", "released", GITHUB, null],
];`;
  const apps = { apps: [{ app: "krizaka-com", repo: "krizaka/krizaka-com" }, { app: "krizaka-ts-site", repo: "krizaka/krizaka-ts" }, { app: "verikora-coming-soon", repo: "krizaka/krizaka-coming-soon" }, { app: "sovkora-dev", repo: "krizaka/sovkora" }] };
  assert.deepEqual(sitesOf(org, apps), ["krizaka-com", "krizaka-coming-soon", "krizaka-ts"]);
  assert.throws(() => sitesOf("nothing", apps), /FAMILY_ROWS/);
});

test("the three site rules are in the registry and valid", () => {
  const rules = loadRules();
  assert.deepEqual(validateRules(rules), []);
  for (const id of ["site-kit-current", "site-no-raw-colour", "site-bird-from-org"]) {
    const rule = rules.find((r) => r.id === id);
    assert.ok(rule, id);
    assert.deepEqual(rule.applies.when, [{ inList: "orchestration/sites.json" }]);
  }
});

test("release-consumers: a site with no entry is reported, the listed ones are not", () => {
  assert.deepEqual(missingSites({ "krizaka-com": [] }, ["krizaka-com", "krizaka-coming-soon"]), ["krizaka-coming-soon: a site with no entry in release-consumers.json"]);
  assert.deepEqual(missingSites({ a: [] }, ["a"]), []);
});

const PW = { type: "playwright-locked", minimum: "1.61" };
const INSTALL = ".github/workflows/e2e.yml";
const installs = "steps:\n  - run: pnpm exec playwright install --with-deps chromium\n";
const pnpmLock = (v) => `packages:\n\n  '@playwright/test@${v}':\n    resolution: {integrity: sha512-x}\n\n  playwright-core@${v}:\n    resolution: {integrity: sha512-y}\n`;
const npmLock = (v) => JSON.stringify({ packages: { "node_modules/playwright": { version: v }, "node_modules/playwright-core": { version: v } } });

test("playwright-locked: red below 1.61 in a pnpm lockfile, green from 1.61", async () => {
  const red = await runCheck(PW, snap({ [INSTALL]: installs, "pnpm-lock.yaml": pnpmLock("1.60.0") }, null));
  assert.equal(red.ok, false);
  assert.match(red.why, /pnpm-lock\.yaml @playwright\/test 1\.60\.0/);
  const green = await runCheck(PW, snap({ [INSTALL]: installs, "pnpm-lock.yaml": pnpmLock("1.64.1") }, null));
  assert.equal(green.ok, true);
});

test("playwright-locked reads an npm lockfile in a sub-folder too", async () => {
  const red = await runCheck(PW, snap({ [INSTALL]: installs, "apps/web/package-lock.json": npmLock("1.50.1") }, null));
  assert.equal(red.ok, false);
  assert.match(red.why, /apps\/web\/package-lock\.json playwright 1\.50\.1/);
  assert.equal((await runCheck(PW, snap({ [INSTALL]: installs, "apps/web/package-lock.json": npmLock("1.61.0") }, null))).ok, true);
});

test("playwright-locked: a workflow that installs it with no lock is red, a repository that never installs it is green", async () => {
  assert.equal((await runCheck(PW, snap({ [INSTALL]: installs }, null))).ok, false);
  assert.equal((await runCheck(PW, snap({ [INSTALL]: "steps:\n  - run: pnpm test\n", "pnpm-lock.yaml": pnpmLock("1.40.0") }, null))).ok, true);
});

test("playwright-locked is in the registry, valid and advisory (not a security rule)", () => {
  const rule = loadRules().find((r) => r.id === "playwright-locked");
  assert.ok(rule);
  assert.notEqual(rule.security, true);
  assert.deepEqual(validateRules([rule]), []);
});

// main-protected (krizaka-restricted#368): main has a ruleset or branch protection that requires a pull request, refuses a force
// push and refuses deletion. The fixtures are what GitHub answers: the active rules of main (`/rules/branches/main`) and the classic
// protection (`/branches/main/protection`, null on its 404 « Branch not protected »).
const MAIN_PROTECTED = loadRules().find((r) => r.id === "main-protected");
const guarded = (rules, classic) => snapshotOf("krizaka-x", "npm", [], async () => null, { mergeGuard: async () => guardOf(rules, classic) });
const ruleset = (...types) => types.map((type) => (type === "required_status_checks" ? { type, parameters: { required_status_checks: [{ context: "ci / CI gate" }] } } : { type }));
const FULL_RULESET = ruleset("pull_request", "required_status_checks", "non_fast_forward", "deletion");
const CLASSIC = {
  required_status_checks: { strict: true, contexts: ["ci / CI gate"] },
  required_pull_request_reviews: { required_approving_review_count: 0 },
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
};

test("main-protected: a security rule on every repository, fixed by the founder's login", () => {
  assert.ok(MAIN_PROTECTED, "the rule main-protected is in rules.json");
  assert.equal(MAIN_PROTECTED.security, true);
  assert.deepEqual(MAIN_PROTECTED.applies, {});
  assert.equal(MAIN_PROTECTED.everyRepo, true, "paused repositories are a door too: the rule reaches them");
  assert.match(MAIN_PROTECTED.fix.note, /founder login/);
  assert.deepEqual(validateRules(loadRules()), []);
});

test("main-protected: no ruleset and no branch protection is red", async () => {
  const red = await runCheck(MAIN_PROTECTED.check, guarded([], null));
  assert.equal(red.ok, false);
  assert.match(red.why, /no ruleset and no branch protection/);
});

test("main-protected: a ruleset or classic protection with a pull request, required checks, no force push and no deletion is green", async () => {
  assert.deepEqual(await runCheck(MAIN_PROTECTED.check, guarded(FULL_RULESET, null)), { ok: true, why: "" });
  assert.deepEqual(await runCheck(MAIN_PROTECTED.check, guarded([], CLASSIC)), { ok: true, why: "" });
  // The parts may come from both: GitHub applies the ruleset and the classic protection together.
  assert.equal((await runCheck(MAIN_PROTECTED.check, guarded(ruleset("pull_request"), { allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } }))).ok, true);
});

test("main-protected: each missing part is red and named", async () => {
  const cases = [
    [ruleset("required_status_checks", "non_fast_forward", "deletion"), null, /pull request/],
    [ruleset("pull_request", "required_status_checks", "deletion"), null, /force push/],
    [ruleset("pull_request", "required_status_checks", "non_fast_forward"), null, /deletion/],
    [[], { ...CLASSIC, required_pull_request_reviews: undefined }, /pull request/],
    [[], { ...CLASSIC, allow_force_pushes: { enabled: true } }, /force push/],
    [[], { ...CLASSIC, allow_deletions: { enabled: true } }, /deletion/],
  ];
  for (const [rules, classic, part] of cases) {
    const red = await runCheck(MAIN_PROTECTED.check, guarded(rules, classic));
    assert.equal(red.ok, false, `${part}`);
    assert.match(red.why, part);
  }
});

test("main-protected: offline (no guard data) proves nothing", async () => {
  const offline = snapshotOf("krizaka-x", "npm", [], async () => null);
  assert.equal((await runCheck(MAIN_PROTECTED.check, offline)).ok, null);
});

test("guardOf: the merge guard and the protection of main read from the rules and the classic protection", () => {
  assert.deepEqual(guardOf([], null), { mergeQueue: false, strict: false, protected: false, pullRequest: false, forcePushBlocked: false, deletionBlocked: false });
  assert.equal(guardOf(ruleset("merge_queue"), null).mergeQueue, true);
  assert.equal(guardOf([], CLASSIC).strict, true);
  assert.equal(guardOf([{ type: "required_status_checks", parameters: { strict_required_status_checks_policy: true } }], null).strict, true);
});

// org-secret-scoped (krizaka-restricted#372): through runCheck on a snapshot, the org secrets this repository sees are passed in.
const SCOPED = { type: "org-secret-scoped" };
const secretSnap = (files, seen) =>
  snapshotOf("krizaka-x", "node", Object.keys(files).sort(), async (p) => files[p] ?? null, { orgSecrets: seen && (async () => seen), reusable: async () => null });

test("org-secret-scoped: red when the repository sees an org secret no workflow uses, green when it uses each one", async () => {
  const files = { ".github/workflows/ci.yml": "jobs:\n  t:\n    env:\n      T: ${{ secrets.NPM_TOKEN }}\n", "README.md": "${{ secrets.EXPO_TOKEN }}" };
  const red = await runCheck(SCOPED, secretSnap(files, [{ name: "NPM_TOKEN", visibility: "all" }, { name: "EXPO_TOKEN", visibility: "all" }]));
  assert.equal(red.ok, false);
  assert.match(red.why, /EXPO_TOKEN/);
  const green = await runCheck(SCOPED, secretSnap(files, [{ name: "NPM_TOKEN", visibility: "selected" }]));
  assert.equal(green.ok, true);
});

test("org-secret-scoped is not read offline", async () => {
  assert.equal((await runCheck(SCOPED, secretSnap({}, null))).ok, null);
});

test("main-protected reaches a paused repository; the other rules do not", async () => {
  const paused = { ...guarded([], null), paused: true };
  assert.equal(await appliesTo(MAIN_PROTECTED, paused), true);
  assert.equal((await evaluate([MAIN_PROTECTED], [paused]))["krizaka-x"]["main-protected"].status, "fail");
  const other = loadRules().find((r) => r.id !== "main-protected" && r.everyRepo !== true);
  assert.equal(await appliesTo(other, paused), false);
});

test("doorsOf: the paused repositories still in the org, never the archived ones", () => {
  const doors = doorsOf([
    { name: "a", status: "Complies", archived: false },
    { name: "p", status: "**Paused** (issues only)", archived: false },
    { name: "q", status: "Paused", archived: null },
    { name: "z", status: "Archive", archived: null },
    { name: "y", status: "Paused", archived: true },
  ]);
  assert.deepEqual(doors.map((r) => r.name), ["p", "q"]);
});

test("repos.json lists the two repositories the matrix missed, so main-protected runs on them", () => {
  const names = readJson("repos.json").repositories.map((r) => r.name);
  assert.ok(names.includes("krizaka-agents-site") && names.includes("krizaka-social"));
  const { active, paused } = scopeOf(readJson("repos.json").repositories);
  const doors = doorsOf(readJson("repos.json").repositories).map((r) => r.name);
  for (const n of ["krizaka-agents-site", "krizaka-social"]) assert.ok(active.some((r) => r.name === n), n);
  for (const n of ["krizaka-restricted", "krizaka-cla-signatures"]) assert.ok(doors.includes(n) && paused.some((r) => r.name === n), n);
});

test("org-secret-scoped reaches a paused repository too: it still sees the org secrets", () => {
  const rule = loadRules().find((r) => r.id === "org-secret-scoped");
  assert.equal(rule.security, true);
  assert.equal(rule.everyRepo, true);
});
