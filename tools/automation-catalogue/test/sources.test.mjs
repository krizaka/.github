import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { readPublished } from "../lib/publish.mjs";
import { githubSource, lastRunsOf } from "../lib/sources.mjs";

function tarOf(name, text) {
  const head = Buffer.alloc(512);
  head.write(name, 0);
  head.write(`${text.length.toString(8).padStart(11, "0")}\0`, 124);
  head.write("0", 156);
  return gzipSync(Buffer.concat([head, Buffer.from(text), Buffer.alloc(512 - text.length), Buffer.alloc(1024)]));
}

async function withFetch(handler, run) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(String(url));
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = real;
  }
}

test("a repository costs two requests whatever its size: the commit, then one tarball", async () => {
  const handler = (url) => (url.includes("/commits/HEAD")
    ? Response.json({ sha: "a".repeat(40), commit: { committer: { date: "2026-11-06T00:00:00Z" } } })
    : new Response(tarOf("top/scripts/a.mjs", "export {}\n")));
  await withFetch(handler, async (calls) => {
    const source = await githubSource("fx");
    assert.deepEqual([...source.files], [["scripts/a.mjs", "export {}\n"]]);
    assert.equal(source.commit, "a".repeat(40));
    assert.equal(calls.length, 2);
  });
});

test("a repository that cannot be read throws, so the run names it and goes on with the others", async () => {
  await withFetch(() => new Response("no", { status: 404 }), async () => {
    await assert.rejects(githubSource("gone"), /404/);
  });
});

test("the last runs come from one request; without the right to read Actions they are unknown, not invented", async () => {
  const page = { workflow_runs: [{ path: ".github/workflows/a.yml", created_at: "2026-11-06T01:00:00Z", conclusion: "success" }, { path: ".github/workflows/a.yml", created_at: "2026-11-05T01:00:00Z", conclusion: "failure" }] };
  await withFetch(() => Response.json(page), async (calls) => {
    const runs = await lastRunsOf("fx");
    assert.deepEqual(runs.get(".github/workflows/a.yml"), { at: "2026-11-06T01:00:00Z", conclusion: "success" });
    assert.equal(calls.length, 1);
  });
  await withFetch(() => new Response("forbidden", { status: 403 }), async () => assert.equal((await lastRunsOf("fx")).size, 0));
});

test("the previous catalogue is read from the public raw address; an unreadable one is null", async () => {
  await withFetch(() => Response.json({ units: [] }), async (calls) => {
    assert.deepEqual(await readPublished("automation/catalogue.json"), { units: [] });
    assert.match(calls[0], /^https:\/\/raw\.githubusercontent\.com\/krizaka\/\.github\/conformance-matrix\/automation\/catalogue\.json$/);
  });
  await withFetch(() => new Response("", { status: 404 }), async () => assert.equal(await readPublished("x.json"), null));
});
