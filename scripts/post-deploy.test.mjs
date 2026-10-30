import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { changedUrls, indexNowBody, robotsClosed, serves, sitemapEntries, waitForBuild, waits } from "./post-deploy.mjs";

const xml = `<urlset><url><loc>https://x.com/</loc><lastmod>2026-10-01</lastmod></url><url><loc>https://x.com/a</loc></url></urlset>`;

test("sitemapEntries reads each URL with its lastmod (empty when it has none)", () => {
  assert.deepEqual(sitemapEntries(xml), { "https://x.com/": "2026-10-01", "https://x.com/a": "" });
});

test("changedUrls lists the new URLs and the ones whose lastmod moved, and all of them on a first run", () => {
  const after = { "https://x.com/": "2026-10-02", "https://x.com/a": "", "https://x.com/b": "2026-10-02" };
  assert.deepEqual(changedUrls({ "https://x.com/": "2026-10-01", "https://x.com/a": "" }, after), ["https://x.com/", "https://x.com/b"]);
  assert.deepEqual(changedUrls({}, after), Object.keys(after));
  assert.deepEqual(changedUrls(after, after), []);
});

test("a site closed to every crawler is not pinged; one closed to a single bot is", () => {
  assert.equal(robotsClosed("User-agent: *\nDisallow: /\n"), true);
  assert.equal(robotsClosed("User-agent: *\nAllow: /\nDisallow: /admin\n\nUser-agent: GPTBot\nDisallow: /\n"), false);
  assert.equal(robotsClosed("# closed\nUser-agent: *  # all\nDisallow: / # everything"), true);
  assert.equal(robotsClosed(""), false);
});

test("the IndexNow body keeps the site's own URLs, with the key file location", () => {
  const body = indexNowBody("https://www.krizaka.com", "k".repeat(32), ["https://www.krizaka.com/a", "https://evil.example/b"]);
  assert.deepEqual(body, {
    host: "www.krizaka.com",
    key: "k".repeat(32),
    keyLocation: `https://www.krizaka.com/${"k".repeat(32)}.txt`,
    urlList: ["https://www.krizaka.com/a"],
  });
});

test("serves is a plain substring and never true for an empty build id", () => {
  assert.equal(serves("<footer>v1.4.0</footer>", "v1.4.0"), true);
  assert.equal(serves("<footer>v1.3.0</footer>", "v1.4.0"), false);
  assert.equal(serves("anything", ""), false);
});

test("the waits grow by half, are capped at 2 minutes and add up to the timeout, never beyond", () => {
  const list = [...waits(20000, 600000)];
  assert.equal(list[0], 20000);
  assert.equal(list[1], 30000);
  assert.ok(list.every((w) => w <= 120000));
  assert.equal(list.reduce((a, b) => a + b, 0), 600000);
});

test("waitForBuild returns as soon as the live site serves the build, without sleeping once it does", async () => {
  const bodies = ["v1.3.0", "v1.3.0", "<b>v1.4.0</b>"];
  const pauses = [];
  const tries = await waitForBuild({
    url: "https://x.com/",
    expect: "v1.4.0",
    timeoutMs: 600000,
    intervalMs: 1000,
    fetchImpl: async () => ({ status: 200, text: async () => bodies.shift() }),
    pause: async (ms) => pauses.push(ms),
    log: () => {},
  });
  assert.equal(tries, 3);
  assert.deepEqual(pauses, [1000, 1500]);
});

test("waitForBuild fails when the time is up, and when the site is down the whole time", async () => {
  await assert.rejects(
    waitForBuild({
      url: "https://x.com/",
      expect: "v2",
      timeoutMs: 5000,
      intervalMs: 1000,
      fetchImpl: async () => {
        throw new Error("down");
      },
      pause: async () => {},
      log: () => {},
    }),
    /did not serve "v2"/,
  );
});

const workflow = readFileSync(new URL("../.github/workflows/post-deploy.yml", import.meta.url), "utf8");

test("the reusable workflow waits, pings the changed URLs only, checks the live host and files an issue on the site's repository", () => {
  assert.match(workflow, /workflow_call:/);
  assert.match(workflow, /post-deploy\.mjs wait/);
  assert.ok(workflow.indexOf("post-deploy.mjs wait") < workflow.indexOf("post-deploy.mjs changed"), "wait comes first");
  assert.ok(workflow.indexOf("post-deploy.mjs changed") < workflow.indexOf("post-deploy.mjs indexnow"));
  assert.ok(workflow.indexOf("post-deploy.mjs indexnow") < workflow.indexOf("node seo/scripts/check-seo-family.mjs"));
  assert.match(workflow, /check-seo-family\.mjs --base "\$\{SITE\}" --host "\$\{SITE\}"/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /repos\/\$\{GITHUB_REPOSITORY\}\/issues/);
  assert.doesNotMatch(workflow, /\bsleep\s+\d/, "no fixed sleep");
  assert.doesNotMatch(workflow, /gh issue (list|create)|gh search/, "REST only (GraphQL quota)");
});
