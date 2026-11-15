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

const DEV = "https://dev.folioviv.com";
const NOINDEX_HEADERS = { "x-robots-tag": "noindex, nofollow" };
const page = (head) => `<html><head>${head}</head><body>ok</body></html>`;
const GOOD_HEAD = '<meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://www.folioviv.com/fr"><link rel="alternate" hreflang="en" href="https://www.folioviv.com/en">';
const devSite = (over = {}) =>
  fakeFetch({
    "/robots.txt": { body: ROBOTS_OFF, headers: NOINDEX_HEADERS },
    "/": { status: 307, headers: { location: "/fr" } },
    "/fr": { body: page(GOOD_HEAD) },
    "/api/healthz": { status: 200, headers: NOINDEX_HEADERS },
    ...over,
  });

test("dev contract: a dev host serving pages with noindex, canonical and hreflang on www passes (the / → /fr redirect is followed)", async () => {
  const result = await checkIndexing(DEV, "dev", { fetch: devSite(), healthUrl: `${DEV}/api/healthz` });
  assert.deepEqual(result, { robots: "disallows", noindex: "header", canonical: "https://www.folioviv.com/fr", status: 200 });
});

test("dev contract: noindex by the header alone is enough", async () => {
  const headerOnly = devSite({ "/": { body: page('<link rel="canonical" href="https://www.folioviv.com/">'), headers: NOINDEX_HEADERS } });
  assert.equal((await checkIndexing(DEV, "dev", { fetch: headerOnly })).status, 200);
});

test("dev contract: a dev host without noindex on its pages fails", async () => {
  const open = devSite({ "/fr": { body: page('<link rel="canonical" href="https://www.folioviv.com/fr">') } });
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: open }), (e) => e.guard === "robots" && /no noindex/.test(e.message));
});

test("dev contract: a canonical on the dev host itself, a missing canonical or an hreflang off www fails", async () => {
  const self = devSite({ "/fr": { body: page(`<meta name="robots" content="noindex"><link rel="canonical" href="${DEV}/fr">`) } });
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: self }), /canonical .* is not on www\.folioviv\.com/);
  const none = devSite({ "/fr": { body: page('<meta name="robots" content="noindex">') } });
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: none }), /no canonical/);
  const alt = devSite({ "/fr": { body: page(`${GOOD_HEAD}<link rel="alternate" hreflang="fr" href="${DEV}/fr">`) } });
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: alt }), /alternate .* is not on www\.folioviv\.com/);
});

test("dev contract: a redirect to another host, or an error page, fails (a dev host serves, it does not send to www)", async () => {
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: devSite({ "/": { status: 308, headers: { location: "https://www.folioviv.com/" } } }) }), /another host/);
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: devSite({ "/": { status: 500 } }) }), /answers 500/);
});

test("robots (off): robots.txt and the machine endpoints must carry noindex; an open robots.txt is refused", async () => {
  assert.deepEqual(await checkIndexing(DEV, "off", { fetch: devSite(), healthUrl: `${DEV}/api/healthz` }), { robots: "disallows", noindex: "header" });
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: devSite({ "/robots.txt": { body: ROBOTS_OFF } }) }), /robots\.txt .*noindex/);
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: devSite({ "/api/healthz": { status: 200 } }), healthUrl: `${DEV}/api/healthz` }), /healthz .*noindex/);
  await assert.rejects(checkIndexing(DEV, "dev", { fetch: devSite({ "/robots.txt": { body: ROBOTS_ON, headers: { "x-robots-tag": "noindex" } } }) }), /does not say Disallow/);
});

test("seo-family: runs the repository's script against the live site and fails with its log", async () => {
  const seen = [];
  const pass = async (args, { cwd }) => (seen.push({ args, cwd }), { code: 0, log: "" });
  await checkSeoFamily(BASE, { script: "scripts/check-seo-family.mjs", args: ["--organization"], index: "off", cwd: "/repo", spawnCheck: pass });
  assert.deepEqual(seen[0], { args: ["scripts/check-seo-family.mjs", "--base", BASE, "--host", BASE, "--index", "off", "--organization"], cwd: "/repo" });
  seen.length = 0;
  await checkSeoFamily(DEV, { script: "s.mjs", index: "dev", spawnCheck: pass });
  assert.deepEqual(seen[0].args, ["s.mjs", "--base", DEV, "--host", DEV, "--index", "off", "--dev-host"]);
  const fail = async () => ({ code: 1, log: "x\nsitemap.xml missing" });
  await assert.rejects(checkSeoFamily(BASE, { script: "s.mjs", spawnCheck: fail }), (e) => e.guard === "seo-family" && /sitemap\.xml missing/.test(e.message));
});
