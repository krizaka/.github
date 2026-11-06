// The rule `no-public-email` (krizaka-internal#2764): a pass tree and a fail tree of fixtures, the exceptions, the skipped paths.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadRules, runCheck, snapshotOf } from "../scripts/conformance.mjs";
import { isPublicSource, publicEmailHits } from "../scripts/public-email.mjs";

const rule = loadRules().find((r) => r.id === "no-public-email");
const check = rule.check;

const filesOf = (dir) => {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out[relative(dir, full)] = readFileSync(full, "utf8");
    }
  };
  walk(dir);
  return out;
};
/** A snapshot whose scan behaves like the tarball scan: the files whose text matches. */
const snapOf = (files) => ({ ...snapshotOf("r", "site", Object.keys(files), async (p) => files[p]), scan: async (re) => Object.keys(files).filter((p) => re.test(files[p])) });
const fixture = (name) => filesOf(new URL(`./fixtures/public-email/${name}`, import.meta.url).pathname);

test("the rule is in the registry for the sites and apps", () => {
  assert.ok(rule);
  assert.deepEqual(rule.applies.kinds, ["site", "app"]);
  assert.match(rule.title, /Law 25/);
});

test("pass fixtures: the contact form link, the privacy officer, a customer's variable, a test and SECURITY.md are green", async () => {
  assert.deepEqual(await runCheck(check, snapOf(fixture("pass"))), { ok: true, why: "" });
});

test("fail fixtures: a literal address in lib/, a mailto in app/ and one in llms-full.txt are red, each located", async () => {
  const red = await runCheck(check, snapOf(fixture("fail")));
  assert.equal(red.ok, false);
  assert.match(red.why, /^3 Krizaka address/);
  assert.match(red.why, /app\/support\/page\.tsx:2 support@verikora\.com/);
  assert.match(red.why, /lib\/site\.ts:1 contact@krizaka\.com/);
});

test("offline (no scan) the cell is unknown, never pass", async () => {
  assert.equal((await runCheck(check, snapshotOf("r", "site", [], async () => null))).ok, null);
});

test("an address at any of our domains is refused, a foreign one is not", () => {
  for (const domain of check.domains) assert.equal(publicEmailHits("lib/a.ts", `x = "hi@${domain}"`, check).length, 1, domain);
  assert.equal(publicEmailHits("lib/a.ts", `x = "hi@example.org"`, check).length, 0);
  assert.equal(publicEmailHits("lib/a.ts", "mailto:${shop.publicEmail}", check).length, 0, "a variable is customer data");
});

test("public sources: the page folders count, tests, seeds, scripts and docs do not", () => {
  for (const path of ["app/page.tsx", "apps/web/components/Footer.tsx", "messages/fr.json", "lib/site.ts", "public/llms-full.txt", "llms.txt"]) assert.equal(isPublicSource(path, check), true, path);
  for (const path of ["tests/a.ts", "app/a.test.tsx", "scripts/x.mjs", "db/seed/a.json", "SECURITY.md", "README.md", "package.json", ".env.example", "app/api/send/route.ts", "node_modules/a/index.js", "docs/a.md", "server/mail.ts"]) {
    assert.equal(isPublicSource(path, check), false, path);
  }
});

test("the exceptions: privacy path, privacy key, customer data", () => {
  const line = 'x: "contact@krizaka.com"';
  assert.equal(publicEmailHits("app/privacy/page.tsx", line, check).length, 0);
  assert.equal(publicEmailHits("app/confidentialite/page.tsx", line, check).length, 0);
  assert.equal(publicEmailHits("messages/en.json", `"privacyOfficer": "a@krizaka.com"`, check).length, 0);
  assert.equal(publicEmailHits("lib/shop.ts", "publicEmail: 'a@folioviv.com'", check).length, 0);
  assert.equal(publicEmailHits("messages/en.json", `"footer": "a@krizaka.com"`, check).length, 1);
});
