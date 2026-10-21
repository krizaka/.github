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

const DEV = "https://dev.akinaza.com";
const devSite = (over = {}) =>
  fakeFetch({
    "/robots.txt": { body: ROBOTS_OFF, headers: { "x-robots-tag": "noindex, nofollow" } },
    "/": { status: 308, headers: { location: "https://www.akinaza.com/", "x-robots-tag": "noindex, nofollow" } },
    "/api/healthz": { status: 200, headers: { "x-robots-tag": "noindex, nofollow" } },
    ...over,
  });

test("robots (dev host): robots.txt disallows everything and keeps noindex; the HTML answers 308 to www", async () => {
  const result = await checkIndexing(DEV, "off", { fetch: devSite(), healthUrl: `${DEV}/api/healthz` });
  assert.deepEqual(result, { robots: "disallows", noindex: "header", redirect: "https://www.akinaza.com/" });
});

test("robots (dev host): HTML that is served (200) instead of redirected is refused, whatever it carries", async () => {
  const served = devSite({ "/": { body: '<meta name="robots" content="noindex">', headers: { "x-robots-tag": "noindex" } } });
  await assert.rejects(checkIndexing(DEV, "off", { fetch: served }), (e) => e.guard === "robots" && /308/.test(e.message));
});

test("robots (dev host): a redirect that is not a 308, or leaves for another host or path, is refused", async () => {
  await assert.rejects(checkIndexing(DEV, "off", { fetch: devSite({ "/": { status: 302, headers: { location: "https://www.akinaza.com/" } } }) }), /308/);
  await assert.rejects(checkIndexing(DEV, "off", { fetch: devSite({ "/": { status: 308, headers: { location: "https://www.krizaka.com/" } } }) }), /www\.akinaza\.com/);
  await assert.rejects(checkIndexing(DEV, "off", { fetch: devSite({ "/": { status: 308 } }) }), /Location/);
});

test("robots (dev host): robots.txt and the machine endpoints (health) must carry noindex; an open robots.txt is refused", async () => {
  await assert.rejects(checkIndexing(DEV, "off", { fetch: devSite({ "/robots.txt": { body: ROBOTS_OFF } }) }), /robots\.txt .*noindex/);
  await assert.rejects(checkIndexing(DEV, "off", { fetch: devSite({ "/api/healthz": { status: 200 } }), healthUrl: `${DEV}/api/healthz` }), /healthz .*noindex/);
  await assert.rejects(checkIndexing(DEV, "off", { fetch: devSite({ "/robots.txt": { body: ROBOTS_ON, headers: { "x-robots-tag": "noindex" } } }) }), /does not say Disallow/);
});

test("seo-family: runs the repository's script against the live site and fails with its log", async () => {
  const seen = [];
  const pass = async (args, { cwd }) => (seen.push({ args, cwd }), { code: 0, log: "" });
  await checkSeoFamily(BASE, { script: "scripts/check-seo-family.mjs", args: ["--organization"], index: "off", cwd: "/repo", spawnCheck: pass });
  assert.deepEqual(seen[0], { args: ["scripts/check-seo-family.mjs", "--base", BASE, "--host", BASE, "--index", "off", "--organization"], cwd: "/repo" });
  const fail = async () => ({ code: 1, log: "x\nsitemap.xml missing" });
  await assert.rejects(checkSeoFamily(BASE, { script: "s.mjs", spawnCheck: fail }), (e) => e.guard === "seo-family" && /sitemap\.xml missing/.test(e.message));
});
