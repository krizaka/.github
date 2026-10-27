import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { collect, folder, hashOf, loadConfig, merge, named, objectPath, parseArgs, parseName, prunePreview, publish, send } from "./app-videos.mjs";

const cfg = { apiKey: "test-key-value", zone: "zone", endpoint: "storage.example", pullZone: "cdn.example" };

test("names follow <platform>-<flow>", () => {
  assert.deepEqual(parseName("/x/web-the-binder.mp4"), { platform: "web", flow: "the-binder" });
  assert.equal(parseName("run-1.mp4"), null);
  assert.equal(parseName("tv-home.mp4"), null);
});

test("the path is site/products/<product>/download/<platform>-<flow>.<hash>.<ext>", () => {
  assert.equal(objectPath("yomizaka", "web", "binder", "0123456789", "webm"), "site/products/yomizaka/download/web-binder.0123456789.webm");
  assert.throws(() => folder("../x"));
});

test("collect keeps one recording per flow and lists the files it ignores", () => {
  const d = mkdtempSync(join(tmpdir(), "av-"));
  mkdirSync(join(d, "sub"));
  writeFileSync(join(d, "web-binder.webm"), "a");
  writeFileSync(join(d, "sub", "android-documents.mp4"), "b");
  writeFileSync(join(d, "run-1.mp4"), "c");
  const { recordings, ignored } = collect([d]);
  assert.deepEqual(recordings.map((r) => `${r.platform}-${r.flow}`).sort(), ["android-documents", "web-binder"]);
  assert.equal(ignored.length, 1);
});

test("merge replaces the same flow and keeps the others, sorted", () => {
  let m = { product: "p", videos: [] };
  m = merge(m, { platform: "web", flow: "b", files: {} });
  m = merge(m, { platform: "android", flow: "a", files: {} });
  m = merge(m, { platform: "web", flow: "b", seconds: 9, files: {} });
  assert.deepEqual(m.videos.map((v) => `${v.platform}-${v.flow}`), ["android-a", "web-b"]);
  assert.equal(m.videos[1].seconds, 9);
});

test("send puts the file under its hash and returns the path relative to site/", async () => {
  const f = join(mkdtempSync(join(tmpdir(), "av-")), "x.webm");
  writeFileSync(f, "video");
  let call;
  const path = await send({ cfg, product: "yomizaka", platform: "web", flow: "binder", ext: "webm", file: f, fetchImpl: async (url, init) => ((call = { url, init }), { ok: true }) });
  assert.equal(path, `products/yomizaka/download/web-binder.${hashOf(Buffer.from("video"))}.webm`);
  assert.equal(call.init.method, "PUT");
  assert.match(call.url, /^https:\/\/storage\.example\/zone\/site\/products\/yomizaka\/download\//);
});

test("prune is a preview: it lists the unnamed objects and never calls DELETE", async () => {
  const manifest = { product: "yomizaka", videos: [{ platform: "web", flow: "binder", files: { mp4: "products/yomizaka/download/web-binder.aaaaaaaaaa.mp4" } }] };
  const methods = [];
  const lines = [];
  const stale = await prunePreview({
    cfg,
    product: "yomizaka",
    manifest,
    log: (l) => lines.push(l),
    fetchImpl: async (_u, init = {}) => (methods.push(init.method ?? "GET"), { ok: true, status: 200, json: async () => [{ ObjectName: "web-binder.aaaaaaaaaa.mp4" }, { ObjectName: "web-binder.bbbbbbbbbb.mp4" }] }),
  });
  assert.deepEqual(stale, ["products/yomizaka/download/web-binder.bbbbbbbbbb.mp4"]);
  assert.ok(!methods.includes("DELETE"));
  assert.ok(lines.some((l) => l.startsWith("would delete")));
  assert.deepEqual([...named(manifest)], ["products/yomizaka/download/web-binder.aaaaaaaaaa.mp4"]);
});

test("publish transcodes, uploads, writes the manifest and never prints the key", async () => {
  const d = mkdtempSync(join(tmpdir(), "av-"));
  writeFileSync(join(d, "web-binder.webm"), "raw");
  const manifestFile = join(d, "out", "app-videos.json");
  const lines = [];
  // a fake ffmpeg that writes its last argument; a fake ffprobe that answers 12.34
  const run = (bin, args) => (bin === "ffprobe" ? "12.34\n" : (writeFileSync(args.at(-1), `out:${args.at(-1)}`), ""));
  const res = await publish({
    product: "yomizaka",
    inputs: [d],
    manifestFile,
    env: { MEDIA_STORAGE_API_KEY: "test-key-value", MEDIA_STORAGE_ZONE: "z" },
    run,
    log: (l) => lines.push(l),
    now: () => new Date("2026-10-27T00:00:00Z"),
    fetchImpl: async (_u, init = {}) => ({ ok: true, status: 200, json: async () => [], ...init }),
  });
  assert.equal(res.published, 1);
  const m = JSON.parse(readFileSync(manifestFile, "utf8"));
  assert.equal(m.videos[0].seconds, 12.3);
  assert.equal(m.videos[0].capturedAt, "2026-10-27T00:00:00.000Z");
  assert.deepEqual(Object.keys(m.videos[0].files), ["webm", "mp4", "poster"]);
  assert.ok(!lines.join("\n").includes("test-key-value"));
});

test("credentials are required and named", () => {
  assert.throws(() => loadConfig({}), /MEDIA_STORAGE_API_KEY is not set/);
  assert.equal(loadConfig({ MEDIA_STORAGE_API_KEY: "k", MEDIA_STORAGE_ZONE: "z" }).pullZone, "krizaka-assets.b-cdn.net");
});

test("arguments", () => {
  const a = parseArgs(["publish", "--product", "p", "--input", "a", "--input", "b", "--manifest", "m", "--dry-run"]);
  assert.deepEqual([a.command, a.product, a.inputs, a.manifest, a.dryRun], ["publish", "p", ["a", "b"], "m", true]);
});
