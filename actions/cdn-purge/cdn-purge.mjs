#!/usr/bin/env node
/* Purge by URL of the Bunny pull zone that serves the media (krizaka-assets), for the files that change IN PLACE.
     node cdn-purge.mjs [--dry-run] <url>...        (or URLs on stdin, one per line, when none is given)
   A real run needs the Bunny ACCOUNT key in the environment (the storage zone's key does not work here). Never printed.
   A hashed file (`name.<10 hex>.ext`) is immutable: a new content is a new URL, so it is skipped, never purged.
   The pages of blog., www. and ui. are not behind a pull zone (DigitalOcean serves them): nothing to purge there. */
import { pathToFileURL } from "node:url";

export const PURGE_API = "https://api.bunny.net/purge";
export const KEY_ENV = "MEDIA_ACCOUNT_API_KEY";
const HASHED = /\.[0-9a-f]{10}\.[a-z0-9]+$/;
const HOST = /(^|\.)b-cdn\.net$/;

/** Splits the URLs into those to purge, and those refused with their reason. */
export function plan(urls) {
  const purge = [], skipped = [];
  for (const raw of urls.map((u) => u.trim()).filter(Boolean)) {
    let u;
    try { u = new URL(raw); } catch { skipped.push({ url: raw, why: "not a URL" }); continue; }
    if (u.protocol !== "https:" || !HOST.test(u.hostname)) skipped.push({ url: raw, why: "not a Krizaka media pull zone" });
    else if (HASHED.test(u.pathname)) skipped.push({ url: raw, why: "hashed file: immutable, never purged" });
    else purge.push(u.href);
  }
  return { purge, skipped };
}

export async function purgeAll(urls, { key, dryRun = false, fetchImpl = fetch, log = console.log } = {}) {
  const { purge, skipped } = plan(urls);
  for (const s of skipped) log(`skip   ${s.url} (${s.why})`);
  let failed = 0;
  for (const url of purge) {
    if (dryRun) { log(`would purge ${url}`); continue; }
    if (!key) throw new Error(`${KEY_ENV} is not set`);
    const res = await fetchImpl(`${PURGE_API}?${new URLSearchParams({ url, async: "false" })}`, { method: "POST", headers: { AccessKey: key } });
    if (res.ok) log(`purged ${url}`);
    else { failed++; log(`FAILED ${url} (HTTP ${res.status})`); }
  }
  return { purged: dryRun ? 0 : purge.length - failed, skipped: skipped.length, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  let urls = args.filter((a) => !a.startsWith("--"));
  if (!urls.length && !process.stdin.isTTY) urls = (await new Promise((r) => { let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => r(s)); })).split("\n");
  const r = await purgeAll(urls, { key: process.env[KEY_ENV], dryRun });
  if (r.failed) process.exit(1);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
