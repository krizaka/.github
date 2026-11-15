// The site rules of the conformance matrix (krizaka-internal#3783): a site fails when it lags the kit, declares raw colours
// or hard-codes a bird. Pure parts, then the three check types through runCheck on a snapshot.
import test from "node:test";
import assert from "node:assert/strict";
import { birdLiteralHits, minorsBehind, rawColourHits, runCheck } from "../scripts/conformance-checks.mjs";
import { snapshotOf, validateRules, loadRules } from "../scripts/conformance-registry.mjs";
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
