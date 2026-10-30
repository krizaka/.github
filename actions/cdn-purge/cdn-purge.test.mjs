import test from "node:test";
import assert from "node:assert/strict";
import { plan, purgeAll } from "./cdn-purge.mjs";

const Z = "https://krizaka-assets.b-cdn.net";
test("cdn-purge: an in-place file is purged, a hashed one is skipped, a foreign host is refused", () => {
  const p = plan([`${Z}/org/v1/org.json`, `${Z}/site/blog/x/kit-cut-480.ce616c4860.webp`, "https://example.com/a.json", "nope", ""]);
  assert.deepEqual(p.purge, [`${Z}/org/v1/org.json`]);
  assert.deepEqual(p.skipped.map((s) => s.why), ["hashed file: immutable, never purged", "not a Krizaka media pull zone", "not a URL"]);
});
test("cdn-purge: dry run calls nothing and needs no key", async () => {
  const lines = [];
  const r = await purgeAll([`${Z}/brand/manifest.json`], { dryRun: true, fetchImpl: () => assert.fail("no call"), log: (l) => lines.push(l) });
  assert.deepEqual(r, { purged: 0, skipped: 0, failed: 0 });
  assert.match(lines[0], /would purge .*brand\/manifest\.json/);
});
test("cdn-purge: POSTs the Bunny purge with the key as AccessKey, and counts failures", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: !url.includes("bad"), status: 401 }; };
  const r = await purgeAll([`${Z}/org/v1/org.json`, `${Z}/bad.json`], { key: "k", fetchImpl, log: () => {} });
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.AccessKey, "k");
  assert.ok(calls[0].url.startsWith("https://api.bunny.net/purge?url=https%3A%2F%2Fkrizaka-assets.b-cdn.net%2Forg%2Fv1%2Forg.json"));
  assert.deepEqual(r, { purged: 1, skipped: 0, failed: 1 });
});
test("cdn-purge: without a key a real run fails closed", async () => {
  await assert.rejects(purgeAll([`${Z}/org/v1/org.json`], { fetchImpl: () => assert.fail("no call") }), /MEDIA_ACCOUNT_API_KEY/);
});
