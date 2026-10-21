// Post-deploy checks with HTTP mocked: health, robots / noindex, the SEO family script.
import test from "node:test";
import assert from "node:assert/strict";
import { checkHealth, checkIndexing, checkSeoFamily, wildcardDisallows } from "../lib/checks.mjs";
import { GuardError } from "../lib/errors.mjs";
import { fakeFetch, ROBOTS_OFF, ROBOTS_ON } from "./helpers.mjs";

const BASE = "https://www.krizaka.com";
const noSleep = async () => {};

test("robots parser: reads only the groups of User-agent: *", () => {
  const robots = "User-agent: GPTBot\nDisallow: /private\n\nUser-agent: *\nDisallow: /\n# c\nAllow: /x\n";
  assert.deepEqual(wildcardDisallows(robots), ["/"]);
  assert.deepEqual(wildcardDisallows("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n"), []);
  assert.deepEqual(wildcardDisallows("User-agent: a\nUser-agent: *\nDisallow: /tmp\n"), ["/tmp"]);
});

test("health: passes on 2xx, retries a failing answer, fails after the attempts", async () => {
  const ok = fakeFetch({ "/api/health": { status: 200 } });
  assert.equal((await checkHealth(`${BASE}/api/health`, { fetch: ok, attempts: 3, sleepFn: noSleep })).status, 200);

  let n = 0;
  const flaky = async () => (++n < 3 ? new Response("", { status: 503 }) : new Response("ok"));
  assert.equal((await checkHealth(`${BASE}/api/health`, { fetch: flaky, attempts: 5, sleepFn: noSleep })).attempts, 3);

  const down = fakeFetch({ "/api/health": { status: 502 } });
  await assert.rejects(checkHealth(`${BASE}/api/health`, { fetch: down, attempts: 2, sleepFn: noSleep }), (e) => e instanceof GuardError && e.guard === "health");
  const broken = fakeFetch({ "/api/health": new Error("ECONNREFUSED") });
  await assert.rejects(checkHealth(`${BASE}/api/health`, { fetch: broken, attempts: 2, sleepFn: noSleep }), /ECONNREFUSED/);
});

test("robots (indexed site): allows crawling and names a sitemap; refuses Disallow: / and a missing sitemap", async () => {
  assert.deepEqual(await checkIndexing(BASE, "on", { fetch: fakeFetch({ "/robots.txt": { body: ROBOTS_ON } }) }), { robots: "allows", sitemap: true });
  await assert.rejects(checkIndexing(BASE, "on", { fetch: fakeFetch({ "/robots.txt": { body: ROBOTS_OFF } }) }), /disallows everything/);
  await assert.rejects(checkIndexing(BASE, "on", { fetch: fakeFetch({ "/robots.txt": { body: "User-agent: *\nAllow: /\n" } }) }), /no Sitemap/);
  await assert.rejects(checkIndexing(BASE, "on", { fetch: fakeFetch({}) }), /robots\.txt answers 404/);
});

test("robots (noindex site): needs Disallow: / and a noindex on the home (header or meta); refuses an open one", async () => {
  const header = fakeFetch({ "/robots.txt": { body: ROBOTS_OFF }, "/": { body: "<html></html>", headers: { "x-robots-tag": "noindex, nofollow" } } });
  assert.equal((await checkIndexing(BASE, "off", { fetch: header })).noindex, "header");
  const meta = fakeFetch({ "/robots.txt": { body: ROBOTS_OFF }, "/": { body: '<meta name="robots" content="noindex,nofollow">' } });
  assert.equal((await checkIndexing(BASE, "off", { fetch: meta })).noindex, "meta");
  await assert.rejects(checkIndexing(BASE, "off", { fetch: fakeFetch({ "/robots.txt": { body: ROBOTS_ON } }) }), /does not say Disallow/);
  const noMarker = fakeFetch({ "/robots.txt": { body: ROBOTS_OFF }, "/": { body: "<html><head></head></html>" } });
  await assert.rejects(checkIndexing(BASE, "off", { fetch: noMarker }), /carries no noindex/);
});

test("seo-family: runs the repository's script against the live site and fails with its log", async () => {
  const seen = [];
  const pass = async (args, { cwd }) => (seen.push({ args, cwd }), { code: 0, log: "" });
  await checkSeoFamily(BASE, { script: "scripts/check-seo-family.mjs", args: ["--organization"], index: "off", cwd: "/repo", spawnCheck: pass });
  assert.deepEqual(seen[0], { args: ["scripts/check-seo-family.mjs", "--base", BASE, "--host", BASE, "--index", "off", "--organization"], cwd: "/repo" });
  const fail = async () => ({ code: 1, log: "x\nsitemap.xml missing" });
  await assert.rejects(checkSeoFamily(BASE, { script: "s.mjs", spawnCheck: fail }), (e) => e.guard === "seo-family" && /sitemap\.xml missing/.test(e.message));
});
