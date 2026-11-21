import assert from "node:assert/strict";
import { test } from "node:test";
import { buildArchitecture } from "../lib/assemble.mjs";
import { duplicateModels } from "../lib/duplicates.mjs";
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
