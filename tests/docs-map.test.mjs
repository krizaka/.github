import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { loadMap, mapProblems, missingDocuments } from "../scripts/docs-map.mjs";

const schema = JSON.parse(readFileSync("docs/standards/docs-map.schema.json", "utf8"));
const category = () => ({
  id: "demo",
  title: "A demo",
  when: [{ repo: "r", globs: ["src/**"] }],
  docs: [{ repo: "r", path: "README.md" }],
});
const mapOf = (...categories) => ({ categories });
const withDoc = (doc) => mapOf({ ...category(), docs: [doc] });

describe("the committed map", () => {
  const map = loadMap();
  it("is valid", () => assert.deepEqual(mapProblems(map), []));
  it("holds the eight seed categories", () => {
    const ids = map.categories.map((c) => c.id);
    for (const id of ["way-of-working", "java-norm", "typescript-norm", "new-repository", "product-rename", "automation", "release-process", "board-lanes"]) {
      assert.ok(ids.includes(id), id);
    }
  });
  it("lists the four newcomer guides for the way of working", () => {
    const docs = map.categories.find((c) => c.id === "way-of-working").docs.filter((d) => d.repo === "krizaka-internal");
    assert.equal(docs.length, 4);
  });
});

describe("the shape", () => {
  it("a minimal category is valid", () => assert.deepEqual(mapProblems(mapOf(category())), []));
  it("an empty map is refused", () => assert.equal(mapProblems({ categories: [] }).length, 1));
  it("the schema and the validator ask for the same required keys", () => {
    for (const key of schema.properties.categories.items.required) {
      const c = category();
      delete c[key];
      assert.ok(mapProblems(mapOf(c)).length > 0, `a category without « ${key} » must fail`);
    }
  });
  it("an id used twice is refused", () => assert.match(mapProblems(mapOf(category(), category()))[0], /used twice/));
  it("a bad id is refused", () => assert.match(mapProblems(mapOf({ ...category(), id: "Way Of Working" }))[0], /lowercase/));
  it("an unknown key is refused", () => assert.match(mapProblems(mapOf({ ...category(), extra: 1 }))[0], /unknown key/));
  it("a regex in place of a glob is refused", () => {
    const c = { ...category(), when: [{ repo: "r", globs: ["src/(a|b)/.*\\.js"] }] };
    assert.match(mapProblems(mapOf(c))[0], /a glob, never a regex/);
  });
  it("a document with a glob is refused", () => assert.match(mapProblems(withDoc({ repo: "r", path: "docs/*.md" }))[0], /not a glob/));
  it("a document needs its repository", () => assert.match(mapProblems(withDoc({ path: "README.md" }))[0], /repo/));
  it("a local page has no repository", () => {
    const c = { ...category(), docs: [{ repo: "r", path: "README.md" }, { local: true, path: "cockpit page" }] };
    assert.deepEqual(mapProblems(mapOf(c)), []);
    assert.match(mapProblems(withDoc({ local: true, repo: "r", path: "cockpit page" }))[0], /no repo/);
  });
  it("a category of local pages only is refused", () => assert.match(mapProblems(withDoc({ local: true, path: "cockpit page" }))[0], /not only local/));
});

describe("the documents exist", () => {
  const tree = { r: new Set(["README.md"]) };
  const treeOf = (repo) => tree[repo] ?? new Set();
  it("passes when every document is in its repository", () => assert.deepEqual(missingDocuments(mapOf(category()), treeOf), []));
  it("names a missing document", () => {
    const missing = missingDocuments(withDoc({ repo: "r", path: "GONE.md" }), treeOf);
    assert.deepEqual(missing, ["demo: r/GONE.md"]);
  });
  it("names a document of a repository that has no tree", () => assert.equal(missingDocuments(withDoc({ repo: "other", path: "README.md" }), treeOf).length, 1));
  it("never requires a local page", () => {
    const c = { ...category(), docs: [{ repo: "r", path: "README.md" }, { local: true, path: "cockpit page" }] };
    assert.deepEqual(missingDocuments(mapOf(c), treeOf), []);
  });
});
