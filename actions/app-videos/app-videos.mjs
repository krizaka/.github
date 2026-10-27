#!/usr/bin/env node
/* App videos for the download pages (krizaka/.github#315): the recordings of the e2e tests, current by construction.
     node app-videos.mjs publish --product <id> --input <dir> [--input <dir>…] --manifest <file> [--dry-run]
   Collect   every file `<platform>-<flow>.(mp4|mov|webm)` in the input directories (Maestro `startRecording`, Playwright `video`).
   Transcode ffmpeg → webm (VP9) + mp4 (H.264) + a jpg poster: at most 30 s, no audio, at most 720 px wide.
   Upload    Bunny, `site/products/<product>/download/<platform>-<flow>.<hash>.<ext>` (hash = first 10 hex of the SHA-256: a URL never
             changes content). Same layout and rules as krizaka-com scripts/cdn-assets.mjs, packaged here so every repository can call it.
   Manifest  merged into <file> (a flow not recorded this run keeps its entry; the page guard fails when an entry is too old).
   Prune     PREVIEW ONLY: lists the objects of the product's download folder that the manifest no longer names; it never deletes.
   Credentials (org secrets, never printed): the storage key, zone and endpoint, and the pull-zone host, read from the
   MEDIA_STORAGE_* and MEDIA_CDN_HOSTNAME variables (as scripts/pr-assets.mjs does). No dependency: Node >= 20, ffmpeg and ffprobe on the PATH. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_SECONDS = 30;
export const MAX_WIDTH = 720;
export const PLATFORMS = ["web", "android", "ios", "mac", "windows", "linux"];
export const DEFAULT_CDN = "krizaka-assets.b-cdn.net";
export const RAW = [".mp4", ".mov", ".webm"];
export const TYPES = { webm: "video/webm", mp4: "video/mp4", jpg: "image/jpeg" };

export const hashOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

/** `web-binder.mp4` → { platform: "web", flow: "binder" }; null when the name is not `<platform>-<flow>`. */
export function parseName(file) {
  const m = /^([a-z]+)-([a-z0-9][a-z0-9-]*)$/.exec(basename(file, extname(file)).toLowerCase());
  return m && PLATFORMS.includes(m[1]) ? { platform: m[1], flow: m[2] } : null;
}

/** The directory of a product's videos on the zone, relative to the zone root. */
export function folder(product) {
  if (!/^[a-z][a-z0-9-]*$/.test(product)) throw new Error(`product "${product}" is not an id like yomizaka`);
  return `site/products/${product}/download`;
}

export const objectPath = (product, platform, flow, hash, ext) => `${folder(product)}/${platform}-${flow}.${hash}.${ext}`;

/** The recordings of the input directories, one per (platform, flow); a later directory wins. Files that do not follow the name are listed apart. */
export function collect(dirs) {
  const found = new Map();
  const ignored = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (RAW.includes(extname(name).toLowerCase())) {
        const id = parseName(name);
        if (id) found.set(`${id.platform}-${id.flow}`, { ...id, path: p });
        else ignored.push(p);
      }
    }
  };
  for (const dir of dirs) walk(resolve(dir));
  return { recordings: [...found.values()], ignored };
}

const tool = (bin, args, run) => run(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

/** Transcodes one recording into <out>/<platform>-<flow>.{webm,mp4,jpg}; returns the paths and the length in seconds. */
export function transcode(rec, out, run = execFileSync) {
  const probed = parseFloat(tool("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", rec.path], run));
  const seconds = Math.min(MAX_SECONDS, Number.isFinite(probed) ? probed : MAX_SECONDS);
  const vf = `scale='min(${MAX_WIDTH},iw)':-2,fps=24`;
  const base = ["-y", "-v", "error", "-i", rec.path, "-t", String(MAX_SECONDS), "-an", "-vf", vf];
  const stem = join(out, `${rec.platform}-${rec.flow}`);
  tool("ffmpeg", [...base, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", `${stem}.webm`], run);
  tool("ffmpeg", [...base, "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${stem}.mp4`], run);
  tool("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.min(2, seconds / 2)), "-i", rec.path, "-frames:v", "1", "-vf", vf, "-q:v", "4", `${stem}.jpg`], run);
  return { webm: `${stem}.webm`, mp4: `${stem}.mp4`, jpg: `${stem}.jpg`, seconds: +seconds.toFixed(1) };
}

export function loadConfig(env) {
  const need = (k) => {
    if (!env[k]) throw new Error(`${k} is not set (the org secret)`);
    return env[k];
  };
  return { apiKey: need("MEDIA_STORAGE_API_KEY"), zone: need("MEDIA_STORAGE_ZONE"), endpoint: env.MEDIA_STORAGE_ENDPOINT || "storage.bunnycdn.com", pullZone: env.MEDIA_CDN_HOSTNAME || DEFAULT_CDN };
}

const storageUrl = (cfg, p) => `https://${cfg.endpoint}/${encodeURIComponent(cfg.zone)}/${enc(p)}`;

/** Sends one file under its hashed name; returns the path relative to site/ (what the manifest records). */
export async function send({ cfg, product, platform, flow, ext, file, fetchImpl = fetch }) {
  const body = readFileSync(file);
  const path = objectPath(product, platform, flow, hashOf(body), ext);
  const res = await fetchImpl(storageUrl(cfg, path), {
    method: "PUT",
    headers: { AccessKey: cfg.apiKey, "Content-Type": TYPES[ext], Checksum: createHash("sha256").update(body).digest("hex").toUpperCase() },
    body,
  });
  if (!res.ok) throw new Error(`upload of ${platform}-${flow}.${ext} failed: HTTP ${res.status}`);
  return path.slice("site/".length);
}

export function readManifest(file, product) {
  try {
    const m = JSON.parse(readFileSync(file, "utf8"));
    return { product, videos: Array.isArray(m.videos) ? m.videos : [] };
  } catch (err) {
    if (err.code === "ENOENT") return { product, videos: [] };
    throw err;
  }
}

/** Puts an entry in the manifest in place of the one of the same platform and flow; the list stays sorted. */
export function merge(manifest, entry) {
  const videos = manifest.videos.filter((v) => !(v.platform === entry.platform && v.flow === entry.flow));
  videos.push(entry);
  videos.sort((a, b) => `${a.platform}-${a.flow}`.localeCompare(`${b.platform}-${b.flow}`));
  return { product: manifest.product, videos };
}

export function writeManifest(file, manifest) {
  mkdirSync(dirname(resolve(file)), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ product: manifest.product, cdn: `https://${DEFAULT_CDN}/site`, videos: manifest.videos }, null, 2)}\n`);
}

/** The paths (relative to site/) the manifest names. */
export const named = (manifest) => new Set(manifest.videos.flatMap((v) => Object.values(v.files)));

/** PREVIEW ONLY: the objects of the product's download folder that the manifest does not name. Nothing is ever deleted here. */
export async function prunePreview({ cfg, product, manifest, fetchImpl = fetch, log = console.log }) {
  const dir = folder(product);
  const res = await fetchImpl(`${storageUrl(cfg, dir)}/`, { headers: { AccessKey: cfg.apiKey, Accept: "application/json" } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`listing of ${dir}/ failed: HTTP ${res.status}`);
  const keep = named(manifest);
  const stale = (await res.json())
    .filter((o) => !o.IsDirectory)
    .map((o) => `${dir}/${o.ObjectName}`.slice("site/".length))
    .filter((p) => !keep.has(p));
  for (const p of stale) log(`would delete  site/${p}`);
  log(`${stale.length} old object(s) would be deleted (preview only: remove them by hand with cdn-assets prune after review)`);
  return stale;
}

export async function publish({ product, inputs, manifestFile, dryRun = false, env = process.env, fetchImpl = fetch, run = execFileSync, now = () => new Date(), log = console.log }) {
  const { recordings, ignored } = collect(inputs);
  for (const p of ignored) log(`ignored (not <platform>-<flow>): ${p}`);
  if (!recordings.length) {
    log("no recording to publish");
    return { manifest: readManifest(manifestFile, product), published: 0 };
  }
  const cfg = dryRun ? null : loadConfig(env);
  const out = mkdtempSync(join(tmpdir(), "app-videos-"));
  let manifest = readManifest(manifestFile, product);
  for (const rec of recordings) {
    const t = transcode(rec, out, run);
    const files = {};
    for (const [ext, key] of [["webm", "webm"], ["mp4", "mp4"], ["jpg", "poster"]]) {
      const kb = (statSync(t[ext]).size / 1024).toFixed(0).padStart(6);
      if (dryRun) {
        files[key] = objectPath(product, rec.platform, rec.flow, hashOf(readFileSync(t[ext])), ext).slice("site/".length);
        log(`would send  ${kb} kB  ${files[key]}`);
      } else {
        files[key] = await send({ cfg, product, platform: rec.platform, flow: rec.flow, ext, file: t[ext], fetchImpl });
        log(`sent        ${kb} kB  https://${cfg.pullZone}/site/${files[key]}`);
      }
    }
    manifest = merge(manifest, { platform: rec.platform, flow: rec.flow, seconds: t.seconds, capturedAt: now().toISOString(), files });
  }
  if (!dryRun) {
    writeManifest(manifestFile, manifest);
    await prunePreview({ cfg, product, manifest, fetchImpl, log });
  }
  return { manifest, published: recordings.length };
}

export function parseArgs(argv) {
  const a = { inputs: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") a.inputs.push(argv[++i]);
    else if (argv[i] === "--product") a.product = argv[++i];
    else if (argv[i] === "--manifest") a.manifest = argv[++i];
    else if (argv[i] === "--dry-run") a.dryRun = true;
    else if (!a.command) a.command = argv[i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return a;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const a = parseArgs(process.argv.slice(2));
    if (a.command !== "publish" || !a.product || !a.manifest || !a.inputs.length) throw new Error("usage: app-videos.mjs publish --product <id> --input <dir>… --manifest <file> [--dry-run]");
    const { published } = await publish({ product: a.product, inputs: a.inputs, manifestFile: a.manifest, dryRun: a.dryRun });
    process.stdout.write(`${published} video(s) ${a.dryRun ? "planned" : "published"}\n`);
  } catch (err) {
    console.error(`app-videos: ${err.message}`);
    process.exit(1);
  }
}
