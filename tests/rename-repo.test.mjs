// scripts/rename-repo.mjs --dry-run (krizaka/.github#113) against a mocked code search: it lists, it changes nothing.
import test from "node:test";
import assert from "node:assert/strict";
import { nameMatcher, run, validate } from "../scripts/rename-repo.mjs";

const registry = [
  { name: "orazaka-edge", deploy: [], renameTo: "orazaka-edge-service", status: "Rename → orazaka-edge-service" },
  { name: "orazaka-studio", deploy: ["orazaka-dev"], renameTo: "orazaka-studio-service" },
  { name: "akinaza", deploy: ["akinaza-dev"] },
];

const item = (repo, path, ...fragments) => ({
  path,
  repository: { full_name: `krizaka/${repo}` },
  text_matches: fragments.map((fragment) => ({ fragment })),
});

function mockSearch(pages) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const page = Number(new URL(url).searchParams.get("page"));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: pages[page - 1] ?? [],
        total_count: pages.reduce((count, items) => count + items.length, 0),
        incomplete_results: false,
      }),
    };
  };
  return { calls, fetchImpl };
}

function mockSearchMeta(pages, metadata) {
  const { calls, fetchImpl: base } = mockSearch(pages);
  const fetchImpl = async (...args) => {
    const response = await base(...args);
    const body = await response.json();
    return { ...response, json: async () => ({ ...body, ...metadata }) };
  };
  return { calls, fetchImpl };
}

test("the name matches whole, never inside a longer name", () => {
  const match = nameMatcher("orazaka-edge");
  for (const text of ["krizaka/orazaka-edge", "orazaka-edge.git", '"orazaka-edge"', "path: ../orazaka-edge/pom.xml"]) assert.ok(match.test(text), text);
  for (const text of ["orazaka-edge-service", "my-orazaka-edge", "orazaka-edge_x"]) assert.ok(!match.test(text), text);
});

test("dry run: one search per page, the exact matches grouped by repository, and what code search cannot see", async () => {
  const full = Array.from({ length: 100 }, (_, i) => item("orazaka", `docs/page-${String(i).padStart(3, "0")}.md`, "see orazaka-edge"));
  const { calls, fetchImpl } = mockSearch([
    full,
    [
      item("orazaka", "orazaka.workspace.json", '{ "name": "orazaka-edge", "path": "../orazaka-edge" }\n"other": 1'),
      item("krizaka-com", "lib/stack.ts", "repo: 'orazaka-edge-service'"),
      item("orazaka-edge", "README.md", "# orazaka-edge"),
    ],
  ]);
  const text = await run(["orazaka-edge", "orazaka-edge-service", "--dry-run"], { fetchImpl, token: "t", registry });
  assert.equal(calls.length, 2);
  assert.match(decodeURIComponent(calls[0].url), /q="orazaka-edge" org:krizaka&per_page=100&page=1$/);
  assert.equal(calls[0].init.headers.accept, "application/vnd.github.text-match+json");
  assert.match(text, /^## Rename `orazaka-edge` → `orazaka-edge-service` \(dry run: nothing changed\)/);
  assert.match(text, /102 file\(s\) in 2 repositories/);
  assert.match(text, /- `orazaka\.workspace\.json`\n {2}- `\{ "name": "orazaka-edge", "path": "\.\.\/orazaka-edge" \}`/);
  assert.doesNotMatch(text, /lib\/stack\.ts/, "orazaka-edge-service is another name");
  assert.doesNotMatch(text, /"other": 1/);
  assert.match(text, /### Outside code search\n- Branch protection/);
  for (const { init } of calls) assert.equal(init.method ?? "GET", "GET");
});

test("deploy targets of the registry are listed outside code search; a rename other than the decided one is flagged", async () => {
  const { fetchImpl } = mockSearch([[]]);
  const text = await run(["orazaka-studio", "orazaka-workflow-service", "--dry-run"], { fetchImpl, token: "t", registry });
  assert.match(text, /Warning: the standard decided `orazaka-studio` → `orazaka-studio-service`/);
  assert.match(text, /DigitalOcean app `orazaka-dev`/);
  assert.match(text, /0 file\(s\) in 0 repositories/);
});

test("refuses: no --dry-run (real mode is a TODO), an unknown name, a taken or non-standard target, no token", async () => {
  const { calls, fetchImpl } = mockSearch([[]]);
  const opts = { fetchImpl, token: "t", registry };
  await assert.rejects(run(["orazaka-edge", "orazaka-edge-service"], opts), /only --dry-run exists.*TODO/);
  await assert.rejects(run(["nope", "orazaka-edge-service", "--dry-run"], opts), /nope is not in repos\.json/);
  await assert.rejects(run(["orazaka-edge", "akinaza", "--dry-run"], opts), /akinaza already exists/);
  await assert.rejects(run(["orazaka-edge", "orazaka-edge-client", "--dry-run"], opts), /outside the naming standard/);
  await assert.rejects(run(["orazaka-edge", "orazaka-edge-service", "--dry-run"], { ...opts, token: "" }), /needs a token/);
  assert.equal(calls.length, 0);
  assert.equal(validate({ from: "akinaza", to: "akinaza-web", registry }).name, "akinaza");
});

test("a failing search is an error, never an empty list", async () => {
  const fetchImpl = async () => ({ ok: false, status: 403, json: async () => ({}) });
  await assert.rejects(run(["orazaka-edge", "orazaka-edge-service", "--dry-run"], { fetchImpl, token: "t", registry }), /code search: 403/);
});

test("an incomplete or over-limit search is an error, never a complete-looking inventory", async () => {
  const { fetchImpl: overLimit } = mockSearchMeta([[]], { total_count: 1001 });
  await assert.rejects(run(["orazaka-edge", "orazaka-edge-service", "--dry-run"], { fetchImpl: overLimit, token: "t", registry }), /exceeds the 1,000-result limit/);
  const { fetchImpl: incomplete } = mockSearchMeta([[]], { incomplete_results: true });
  await assert.rejects(run(["orazaka-edge", "orazaka-edge-service", "--dry-run"], { fetchImpl: incomplete, token: "t", registry }), /incomplete code search results/);
});
