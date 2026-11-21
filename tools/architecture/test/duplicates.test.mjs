import assert from "node:assert/strict";
import { test } from "node:test";
import { buildArchitecture } from "../lib/assemble.mjs";
import { duplicateModels, loadProjections } from "../lib/duplicates.mjs";
import { org } from "./fixtures.mjs";

const files = (entries) => new Map(Object.entries(entries));
const model = "model {\n}\n";

test("duplicates: the same model file name in two repositories is refused, naming both paths", () => {
  const sources = [
    { name: ".github", files: files({ "docs/architecture/specification.c4": model, "docs/architecture/org.c4": model, "docs/architecture/agents.c4": model }) },
    { name: "krizaka-agents", files: files({ "docs/architecture/agents.c4": model }) },
  ];
  const [dup] = duplicateModels(sources);
  assert.deepEqual(dup.copies, [".github:docs/architecture/agents.c4", "krizaka-agents:docs/architecture/agents.c4"]);
});

test("duplicates: the org base and one model per system are not duplicates", () => {
  const sources = [
    { name: ".github", files: files({ "docs/architecture/specification.c4": model, "docs/architecture/org.c4": model }) },
    { name: "a", files: files({ "docs/architecture/a.c4": model, "docs/architecture/a-extra.c4": model }) },
    { name: "b", files: files({ "docs/architecture/b.c4": model, "README.md": "x" }) },
  ];
  assert.deepEqual(duplicateModels(sources), []);
});

test("a second copy of a system's model fails the repository that holds the copy, and the verdict names both paths", async () => {
  const arch = await buildArchitecture(org((f) => { f[".github"]["docs/architecture/sovkora.c4"] = f.sovkora["docs/architecture/sovkora.c4"]; }));
  const v = arch.verdicts.find((x) => x.repo === ".github");
  assert.equal(v.status, "fail");
  const why = v.items.map((i) => i.why).join("\n");
  assert.match(why, /\.github:docs\/architecture\/sovkora\.c4/);
  assert.match(why, /sovkora:docs\/architecture\/sovkora\.c4/);
});

const projection = { path: ".github:docs/architecture/agents.c4", home: "krizaka-agents", reason: "a public site reads it", ticket: "krizaka-internal#4552" };
const twoHolders = () => [
  { name: ".github", files: files({ "docs/architecture/agents.c4": model }) },
  { name: "krizaka-agents", files: files({ "docs/architecture/agents.c4": model }) },
];

test("duplicates: an allow-listed public projection passes, a new duplicate still fails", () => {
  assert.deepEqual(duplicateModels(twoHolders(), [projection]), []);
  const other = [...twoHolders(), { name: "blog", files: files({ "docs/architecture/agents.c4": model }) }];
  assert.deepEqual(duplicateModels(other, [projection]).map((d) => d.strays), [["blog"]]);
  assert.equal(duplicateModels(twoHolders(), []).length, 1);
});

test("duplicates: a projection held by another repository than the listed one is not honoured", () => {
  const sources = [{ name: "blog", files: files({ "docs/architecture/agents.c4": model }) }, twoHolders()[1]];
  assert.equal(duplicateModels(sources, [projection]).length, 1);
});

test("projections: the shipped list is well formed and only shrinks", () => {
  const MAX_PROJECTIONS = 1; // lower it when a projection is removed; never raise it
  const list = loadProjections();
  assert.ok(list.length <= MAX_PROJECTIONS);
  for (const p of list) {
    assert.deepEqual(Object.keys(p).sort(), ["home", "path", "reason", "ticket"]);
    assert.match(p.path, /^[^:]+:docs\/architecture\/[^/]+\.c4$/);
    assert.match(p.ticket, /^krizaka-internal#\d+$/);
  }
});
