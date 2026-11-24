import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { assertPlainNewMedia, contentTypeFor, loadConfig, main, markdownBlock, parseArgs, slug, upload } from "../scripts/pr-assets.mjs";

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

test("arguments, slugs, config and the Markdown block", () => {
  assert.deepEqual(parseArgs(["upload", "d", "--repo", "r", "--dry-run"]), { _: ["upload", "d"], dryRun: true, repo: "r" });
  assert.throws(() => parseArgs(["--repo"]), /needs a value/);
  assert.equal(slug("feat/x y", "key"), "feat-x-y");
  assert.throws(() => slug("..", "key"), /--key is required/);
  assert.throws(() => loadConfig({}), /MEDIA_STORAGE_API_KEY, MEDIA_STORAGE_ZONE, MEDIA_CDN_HOSTNAME/);
  assert.equal(loadConfig({ MEDIA_CDN_HOSTNAME: "https://cdn.example.net/" }, { requireKey: false }).pullZone, "cdn.example.net");
  assert.equal(markdownBlock([{ rel: "a.png", url: "u1" }, { rel: "b.mp4", url: "u2" }]), "![a.png](u1)\n- [b.mp4](u2)");
});

test("a dry run sends nothing and lists the URLs; a failed upload or pull zone is reported", async () => {
  const dir = folder(["a.png"]);
  const logs = [];
  const never = async () => assert.fail("no request in a dry run");
  const entries = await upload({ dir, repo: "r", key: "1", cfg, startedAt: before(), dryRun: true, fetchImpl: never, log: (l) => logs.push(l) });
  assert.equal(entries.length, 1);
  assert.match(logs[0], /^\[dry-run\] https:\/\/cdn\.example\.net\/pr-assets\/r\/1\/a\.png$/);
  const put500 = async () => ({ ok: false, status: 500 });
  await assert.rejects(upload({ dir, repo: "r", key: "1", cfg, startedAt: before(), fetchImpl: put500, log: () => {} }), /HTTP 500/);
  const head404 = async (_u, init) => (init.method === "HEAD" ? { ok: false, status: 404 } : { ok: true, status: 200 });
  await assert.rejects(upload({ dir, repo: "r", key: "1", cfg, startedAt: before(), fetchImpl: head404, log: () => {} }), /pull zone/);
  await assert.rejects(upload({ dir: folder([]), repo: "r", key: "1", cfg, startedAt: before(), log: () => {} }), /no file to upload/);
});

test("main prints the usage without a command, and succeeds on a clean folder", async () => {
  const logs = [];
  assert.equal(await main([], { log: (l) => logs.push(l) }), 1);
  assert.match(logs[0], /usage:/);
  const dir = folder(["a.png"]);
  const env = { MEDIA_STORAGE_API_KEY: "k", MEDIA_STORAGE_ZONE: "z", MEDIA_CDN_HOSTNAME: "cdn.example.net" };
  const out = [];
  assert.equal(await main(["upload", dir, "--repo", "r", "--key", "1"], { env, fetchImpl: okFetch, log: (l) => out.push(l), startedAt: before() }), 0);
  assert.match(out.join("\n"), /1 file\(s\) sent/);
});
