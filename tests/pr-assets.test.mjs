import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { assertPlainNewMedia, contentTypeFor, main, upload } from "../scripts/pr-assets.mjs";

const cfg = { apiKey: "secret-key", zone: "kz-zone", endpoint: "storage.bunnycdn.com", pullZone: "cdn.example.net" };

function folder(files) {
  const dir = mkdtempSync(join(tmpdir(), "pr-assets-"));
  for (const name of files) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), "x");
  }
  return dir;
}

const before = () => Date.now() - 1000;
const okFetch = async () => ({ ok: true, status: 200 });

test("a folder of new images and videos passes", () => {
  const dir = folder(["a.png", "sub/b.webm", ".DS_Store"]);
  assert.doesNotThrow(() => assertPlainNewMedia(dir, before()));
});

test("a folder holding a .json is refused with its fix", () => {
  const dir = folder(["a.png", "metrics.json"]);
  assert.throws(() => assertPlainNewMedia(dir, before()), /metrics\.json.*mktemp/s);
});

test("a folder older than the run is refused with its fix", () => {
  const dir = folder(["a.png"]);
  assert.throws(() => assertPlainNewMedia(dir, Date.now() + 60_000), /existed before this run.*mktemp/s);
});

test("upload sends nothing when the folder is refused", async () => {
  const dir = folder(["a.png", "m.json"]);
  const calls = [];
  const fetchImpl = async (...a) => (calls.push(a), okFetch());
  await assert.rejects(upload({ dir, repo: "r", key: "1", cfg, startedAt: before(), fetchImpl, log: () => {} }), /m\.json/);
  assert.equal(calls.length, 0);
});

test("upload sends every media file under pr-assets/<repo>/<key>/", async () => {
  const dir = folder(["a.png", "sub/b.mp4"]);
  const sent = [];
  const fetchImpl = async (url, init) => (sent.push(init?.method), okFetch());
  const entries = await upload({ dir, repo: "r", key: "1", cfg, startedAt: before(), fetchImpl, log: () => {} });
  assert.deepEqual(entries.map((e) => e.path), ["pr-assets/r/1/a.png", "pr-assets/r/1/sub/b.mp4"]);
  assert.equal(contentTypeFor("x.MP4"), "video/mp4");
  assert.deepEqual(sent, ["PUT", "PUT", "HEAD"]);
});

test("main refuses the folder with exit 1 and prints the reason", async () => {
  const dir = folder(["m.json"]);
  const logs = [];
  const env = { MEDIA_STORAGE_API_KEY: "k", MEDIA_STORAGE_ZONE: "z", MEDIA_CDN_HOSTNAME: "cdn.example.net" };
  const code = await main(["upload", dir, "--repo", "r", "--key", "1"], { env, fetchImpl: okFetch, log: (l) => logs.push(l), startedAt: before() });
  assert.equal(code, 1);
  assert.match(logs.join("\n"), /m\.json/);
});
