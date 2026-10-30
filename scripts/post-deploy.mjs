#!/usr/bin/env node
/* After a public site's production deploy (krizaka/.github#438, called through .github/workflows/post-deploy.yml):

     wait     --version-url U --expect S [--timeout-min 25] [--interval-s 20]
              poll U until its body contains S (the build id the deploy must serve): no fixed sleep, the poll ends when the
              live site serves the new build, or fails when the time is up
     changed  --site S --state F [--out F2]
              read S/sitemap.xml and list the URLs that are new or whose <lastmod> moved since the state F (the sitemap as it was when
              the engines were last told); writes the list to --out (default changed.json) and the new state to F
     indexnow --site S --key K --urls F
              IndexNow for the URLs of F only: the key file must be served by the site; a noindex site is skipped

   Pure helpers are exported and tested (tests/post-deploy.test.mjs). Nothing here reads a secret: the IndexNow key is public by design. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The `<url>` entries of a sitemap as { loc: lastmod }. */
export function sitemapEntries(xml) {
  const out = {};
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (loc) out[loc] = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? "";
  }
  return out;
}

/** The URLs to tell the engines about: new ones and ones whose lastmod moved (the first run, with no state, lists them all). */
export const changedUrls = (before, after) => Object.keys(after).filter((u) => !(u in before) || before[u] !== after[u]);

/** True when robots.txt shuts the whole site to every crawler (`User-agent: *` then `Disallow: /`): a noindex site is not pinged. */
export function robotsClosed(robots) {
  let star = false;
  for (const raw of robots.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const [k, ...v] = line.split(":");
    const key = k.trim().toLowerCase();
    const value = v.join(":").trim();
    if (key === "user-agent") star = value === "*";
    else if (star && key === "disallow" && value === "/") return true;
  }
  return false;
}

/** The IndexNow body (https://www.indexnow.org/documentation): at most 10,000 URLs, all on the site's host. */
export function indexNowBody(site, key, urls) {
  const host = new URL(site).host;
  const own = urls.filter((u) => new URL(u).host === host).slice(0, 10000);
  return { host, key, keyLocation: `${site}/${key}.txt`, urlList: own };
}

/** Whether a body holds the build id the deploy must serve (a plain substring: a version, a commit, a build hash). */
export const serves = (body, expect) => expect !== "" && body.includes(expect);

/** The poll's waits: `interval` first, growing by half each time up to 2 minutes (no fixed sleep for a deploy of unknown length). */
export function* waits(intervalMs, timeoutMs) {
  let total = 0;
  let next = intervalMs;
  while (total < timeoutMs) {
    const w = Math.min(next, timeoutMs - total);
    yield w;
    total += w;
    next = Math.min(Math.round(next * 1.5), 120000);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url, fetchImpl = fetch) => {
  try {
    const res = await fetchImpl(url, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(20000) });
    return { status: res.status, body: await res.text() };
  } catch (error) {
    return { status: 0, body: String(error) };
  }
};

/** Polls until the live site serves `expect`; resolves with the number of tries, rejects when the time is up. */
export async function waitForBuild({ url, expect, timeoutMs, intervalMs, fetchImpl = fetch, pause = sleep, log = console.log }) {
  let tries = 0;
  const check = async () => {
    tries += 1;
    const { status, body } = await get(url, fetchImpl);
    if (status === 200 && serves(body, expect)) return true;
    log(`wait: try ${tries}, HTTP ${status}, the build "${expect}" is not served yet`);
    return false;
  };
  if (await check()) return tries;
  for (const w of waits(intervalMs, timeoutMs)) {
    await pause(w);
    if (await check()) return tries;
  }
  throw new Error(`${url} did not serve "${expect}" within ${Math.round(timeoutMs / 60000)} min`);
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const need = (name) => {
  const v = arg(name);
  if (!v) throw new Error(`--${name} is required`);
  return v;
};

async function main() {
  const cmd = process.argv[2];
  if (cmd === "wait") {
    const tries = await waitForBuild({
      url: need("version-url"),
      expect: need("expect"),
      timeoutMs: Number(arg("timeout-min", "25")) * 60000,
      intervalMs: Number(arg("interval-s", "20")) * 1000,
    });
    console.log(`wait: the live site serves the new build (${tries} ${tries === 1 ? "try" : "tries"})`);
  } else if (cmd === "changed") {
    const site = need("site");
    const stateFile = need("state");
    const res = await get(`${site}/sitemap.xml`);
    if (res.status !== 200) throw new Error(`${site}/sitemap.xml: HTTP ${res.status}`);
    const after = sitemapEntries(res.body);
    let before = {};
    try {
      before = JSON.parse(readFileSync(stateFile, "utf8"));
    } catch {
      /* first run: every URL is new */
    }
    const urls = changedUrls(before, after);
    writeFileSync(arg("out", "changed.json"), JSON.stringify(urls));
    writeFileSync(stateFile, JSON.stringify(after));
    console.log(`changed: ${urls.length} of ${Object.keys(after).length} URLs are new or changed`);
  } else if (cmd === "indexnow") {
    const site = need("site");
    const key = need("key");
    const robots = await get(`${site}/robots.txt`);
    if (robotsClosed(robots.body)) return console.log(`indexnow: ${site} is closed to crawlers (robots.txt), nothing to submit`);
    const urls = JSON.parse(readFileSync(need("urls"), "utf8"));
    if (urls.length === 0) return console.log("indexnow: no URL changed, nothing to submit");
    const keyFile = await get(`${site}/${key}.txt`);
    if (keyFile.status !== 200 || keyFile.body.trim() !== key) throw new Error(`IndexNow: ${site}/${key}.txt does not serve the key (HTTP ${keyFile.status})`);
    const body = indexNowBody(site, key, urls);
    const ping = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    console.log(`indexnow: ${body.urlList.length} URLs submitted for ${body.host}, HTTP ${ping.status}`);
    if (ping.status >= 400) throw new Error(`IndexNow answered HTTP ${ping.status}`);
  } else {
    throw new Error("usage: post-deploy.mjs wait|changed|indexnow …");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`post-deploy: ${error.message}`);
    process.exit(1);
  }
}
