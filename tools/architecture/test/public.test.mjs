import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { publicOf } from "../lib/public.mjs";

const POLICY = JSON.parse(readFileSync(new URL("../../../docs/standards/architecture-public-filter.json", import.meta.url), "utf8"));

const original = () => ({
  schema: "krizaka.architecture/1",
  generatedAt: "2026-11-21T00:00:00.000Z",
  summary: { active: 3 },
  systems: [
    { id: "ui", name: "Krizaka UI", home: "krizaka-ui", repos: ["krizaka-ui"], views: ["ui_c2"], errors: [], files: [] },
    { id: "agents", name: "Agents", home: "secret-home", repos: ["secret-home"], views: ["agents_c2"], errors: [], files: [{ path: "docs/architecture/x.c4" }] },
  ],
  repos: [
    { name: "krizaka-ui", visibility: "public", units: [], system: "ui" },
    { name: "secret-home", visibility: "private", units: [{ name: "private-unit" }], system: "agents" },
  ],
  packages: [],
  drift: [
    { kind: "undocumented", repo: "krizaka-ui", home: "krizaka-ui", why: "krizaka-ui has the job nightly", fact: { kind: "job", name: "nightly" } },
    { kind: "undocumented", repo: "krizaka-ui", home: "krizaka-ui", why: "krizaka-ui has the store ops-private.db", fact: { kind: "store", name: "ops-private.db" } },
    { kind: "invalid", repo: "secret-home", home: "secret-home", why: "bad" },
    { kind: "invalid", repo: "krizaka-ui", home: "krizaka-ui", why: "reads /Users/someone/secret/file and GITHUB_APP_TOKEN, MAIL_API_KEY" },
  ],
  verdicts: [{ repo: "krizaka-ui", status: "pass", items: [] }, { repo: "secret-home", status: "fail", items: [] }],
  views: [
    { id: "ui_c2", scope: "ui", nodes: [{ id: "ui.core", children: [] }], edges: [], undocumented: [{ kind: "undocumented", repo: "secret-home", home: "secret-home", why: "x" }] },
    { id: "agents_c2", scope: "agents", nodes: [{ id: "agents.opsdb", children: [] }], edges: [] },
    { id: "org_c1", scope: "org", nodes: [{ id: "ui", children: ["ui.core"] }, { id: "agents", children: ["agents.opsdb"] }], edges: [{ id: "e", source: "ui", target: "agents" }] },
  ],
  graph: { nodes: [{ id: "krizaka-ui:.", repo: "krizaka-ui" }, { id: "secret-home:.", repo: "secret-home" }], edges: [{ id: "x", source: "krizaka-ui:.", target: "secret-home:." }] },
  unread: [{ repo: "secret-home", why: "x" }],
});

test("the public copy carries no private home, local path, private store or secret name, and keeps the public elements", () => {
  const out = publicOf(original(), POLICY);
  const text = JSON.stringify(out);
  for (const word of ["secret-home", "private-unit", "/Users/", "ops-private.db", "GITHUB_APP_TOKEN", "agents_c2", "agents.opsdb"]) assert.ok(!text.includes(word), `${word} leaked`);
  assert.deepEqual(out.systems.map((s) => s.id), ["ui"]);
  assert.deepEqual(out.repos.map((r) => r.name), ["krizaka-ui"]);
  assert.deepEqual(out.views.map((v) => v.id), ["ui_c2", "org_c1"]);
  assert.ok(text.includes("nightly"));
  assert.deepEqual(out.graph, { nodes: [{ id: "krizaka-ui:.", repo: "krizaka-ui" }], edges: [] });
});

test("the filter does not change the original", () => {
  const o = original();
  publicOf(o, POLICY);
  assert.deepEqual(o, original());
});

test("the filter list is a closed set declared once", () => {
  assert.deepEqual(Object.keys(POLICY).sort(), ["$comment", "localPath", "privateFactKinds", "publicVisibility", "secretName"]);
});
