#!/usr/bin/env node
// PR captures live on Bunny Storage, never in a repository.
//   node scripts/pr-assets.mjs upload <dir> --repo <repo> --key <pr-or-topic> [--dry-run]
// Sends every image and video of <dir> to `pr-assets/<repo>/<key>/…` and prints the CDN URLs and a Markdown block.
// The folder must be created by this run (mktemp -d) and hold only images and videos: a `.json`, a log, or a folder
// that existed before the run is refused before anything is sent (krizaka-internal#4759).
// Credentials come from the environment: MEDIA_STORAGE_API_KEY, MEDIA_STORAGE_ZONE, MEDIA_STORAGE_ENDPOINT, MEDIA_CDN_HOSTNAME.
// No dependency: Node >= 20.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const PREFIX = "pr-assets";

export const MEDIA_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  webm: "video/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

const extOf = (file) => file.split(".").pop().toLowerCase();
const isMedia = (file) => extOf(file) in MEDIA_TYPES;
export const contentTypeFor = (file) => MEDIA_TYPES[extOf(file)] ?? "application/octet-stream";

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

/** A path segment safe for a storage key: `feat/x y` → `feat-x-y`. */
export function slug(value, name) {
  const s = String(value ?? "").trim().replace(/[^\w.-]+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
  if (!s || s === "." || s === "..") throw new Error(`--${name} is required (letters, digits, . _ -)`);
  return s;
}

export function listFiles(dir) {
  const root = resolve(dir);
  if (!statSync(root).isDirectory()) throw new Error(`${dir} is not a directory`);
  const files = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue; // .DS_Store, .gitkeep…
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) files.push({ path: p, rel: relative(root, p).split(sep).join("/") });
    }
  };
  walk(root);
  return files;
}

const createdAt = (dir) => {
  const s = statSync(dir);
  return s.birthtimeMs > 0 ? s.birthtimeMs : s.ctimeMs;
};

/** Throws, with its fix, unless every file of `dir` is an image or a video and the folder was created at or after `startedAt` (ms). */
export function assertPlainNewMedia(dir, startedAt) {
  const foreign = listFiles(dir).filter((f) => !isMedia(f.rel));
  if (foreign.length) {
    const names = foreign.map((f) => f.rel).join(", ");
    throw new Error(`${dir} holds files that are not images or videos: ${names}. Upload only images and videos: copy the captures into a new folder (mktemp -d) and leave the rest out.`);
  }
  if (createdAt(dir) < startedAt) {
    throw new Error(`${dir} existed before this run. Copy the captures into a new, empty folder made by this run (mktemp -d) and upload that one.`);
  }
}

export const objectPath = (repo, key, rel) => `${PREFIX}/${slug(repo, "repo")}/${slug(key, "key")}/${rel}`;
export const cdnUrl = (cfg, path) => `https://${cfg.pullZone}/${encodePath(path)}`;
export const storageUrl = (cfg, path) => `https://${cfg.endpoint}/${encodeURIComponent(cfg.zone)}/${encodePath(path)}`;

const host = (v) => String(v ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

export function loadConfig(env, { requireKey = true } = {}) {
  const cfg = { apiKey: env.MEDIA_STORAGE_API_KEY ?? "", zone: (env.MEDIA_STORAGE_ZONE ?? "").trim(), endpoint: host(env.MEDIA_STORAGE_ENDPOINT) || "storage.bunnycdn.com", pullZone: host(env.MEDIA_CDN_HOSTNAME) };
  const missing = [];
  if (requireKey && !cfg.apiKey) missing.push("MEDIA_STORAGE_API_KEY");
  if (requireKey && !cfg.zone) missing.push("MEDIA_STORAGE_ZONE");
  if (!cfg.pullZone) missing.push("MEDIA_CDN_HOSTNAME");
  if (missing.length) throw new Error(`missing ${missing.join(", ")} (environment)`);
  return cfg;
}

export const markdownBlock = (entries) => entries.map(({ rel, url }) => (contentTypeFor(rel).startsWith("image/") ? `![${rel}](${url})` : `- [${rel}](${url})`)).join("\n");

async function send({ cfg, entry, file, fetchImpl }) {
  const body = readFileSync(file);
  const res = await fetchImpl(storageUrl(cfg, entry.path), {
    method: "PUT",
    headers: { AccessKey: cfg.apiKey, "Content-Type": entry.type, Checksum: createHash("sha256").update(body).digest("hex").toUpperCase() },
    body,
  });
  if (!res.ok) throw new Error(`upload of ${entry.rel} failed: HTTP ${res.status}`);
}

export async function upload({ dir, repo, key, cfg, startedAt, dryRun = false, fetchImpl = globalThis.fetch, log = console.log }) {
  assertPlainNewMedia(dir, startedAt);
  const files = listFiles(dir);
  if (!files.length) throw new Error(`${dir} has no file to upload`);
  const entries = [];
  for (const f of files) {
    const path = objectPath(repo, key, f.rel);
    const entry = { rel: f.rel, path, url: cdnUrl(cfg, path), type: contentTypeFor(f.rel) };
    if (!dryRun) await send({ cfg, entry, file: f.path, fetchImpl });
    log(`${dryRun ? "[dry-run] " : ""}${entry.url}`);
    entries.push(entry);
  }
  if (!dryRun) {
    const res = await fetchImpl(entries[0].url, { method: "HEAD" });
    if (!res.ok) throw new Error(`uploaded, but ${entries[0].url} answers HTTP ${res.status}: check the pull zone`);
  }
  return entries;
}

export function parseArgs(argv) {
  const out = { _: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--")) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${a} needs a value`);
      out[a.slice(2)] = value;
    } else out._.push(a);
  }
  return out;
}

const USAGE = "usage: node scripts/pr-assets.mjs upload <dir> --repo <repo> --key <pr-or-topic> [--dry-run]";

/** `startedAt` is when the run began (ms); the folder to upload must not be older. Defaults to the start of this process. */
export async function main(argv, { env = process.env, fetchImpl, log = console.log, startedAt = Date.now() - process.uptime() * 1000 } = {}) {
  try {
    const args = parseArgs(argv);
    const [command, dir] = args._;
    if (command !== "upload" || !dir) {
      log(USAGE);
      return 1;
    }
    const cfg = loadConfig(env, { requireKey: !args.dryRun });
    const entries = await upload({ dir, repo: args.repo, key: args.key, cfg, startedAt, dryRun: args.dryRun, fetchImpl, log });
    log(`\n${entries.length} file(s) ${args.dryRun ? "would be sent" : "sent"} — paste in the PR:\n\n${markdownBlock(entries)}`);
    return 0;
  } catch (err) {
    log(`pr-assets: ${err.message}`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(await main(process.argv.slice(2)));
