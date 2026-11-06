import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { changedFiles, docsLine, globMatches, judge, categoriesHit } from "../scripts/docs-map-check.mjs";

const map = {
  categories: [
    {
      id: "norm",
      title: "A norm",
      when: [{ repo: "r", globs: ["packages/config/**", "*.md"] }],
      docs: [{ repo: "r", path: "packages/config/README.md" }, { repo: "r", path: "AGENTS.md" }, { repo: "guides", path: "docs/a.md" }, { local: true, path: "cockpit" }],
    },
    { id: "far", title: "Far docs", when: [{ repo: "r", globs: ["far/**"] }], docs: [{ repo: "guides", path: "docs/a.md" }] },
    { id: "other", title: "Other repo", when: [{ repo: "elsewhere", globs: ["**"] }], docs: [{ repo: "elsewhere", path: "README.md" }] },
  ],
};

describe("globs", () => {
  it("* stays in one folder, ** crosses folders", () => {
    assert.ok(globMatches("docs/*.md", "docs/a.md"));
    assert.ok(!globMatches("docs/*.md", "docs/sub/a.md"));
    assert.ok(globMatches("docs/**", "docs/sub/deep/a.md"));
    assert.ok(globMatches("**/a.md", "a.md"));
    assert.ok(globMatches("**/a.md", "x/y/a.md"));
    assert.ok(globMatches("tools/board-*.py", "tools/board-sync.py"));
  });
  it("a literal path matches itself only", () => {
    assert.ok(globMatches("AGENTS.md", "AGENTS.md"));
    assert.ok(!globMatches("AGENTS.md", "docs/AGENTS.md"));
    assert.ok(!globMatches("docs/**", "docs"));
  });
});

describe("the Docs line", () => {
  it("accepts a link and a reason, in any case", () => {
    assert.equal(docsLine("x\nDocs: https://github.com/krizaka/krizaka-internal/pull/9\n").kind, "link");
    assert.equal(docsLine("docs: krizaka-internal#2761").kind, "link");
    assert.equal(docsLine("Docs: not needed, a typo in a comment").kind, "not-needed");
    assert.equal(docsLine("DOCS: Not needed, internal rename").kind, "not-needed");
  });
  it("refuses an empty line, a missing reason and prose", () => {
    assert.equal(docsLine("Docs:"), null);
    assert.equal(docsLine("Docs: not needed"), null);
    assert.equal(docsLine("Docs: not needed,   "), null);
    assert.equal(docsLine("Docs: later maybe"), null);
    assert.equal(docsLine("We updated the docs"), null);
    assert.equal(docsLine(undefined), null);
  });
});

describe("the categories a change is in", () => {
  it("matches by repository and glob", () => {
    assert.deepEqual(categoriesHit(map, "r", ["packages/config/a.ts"]).map((h) => h.category.id), ["norm"]);
    assert.deepEqual(categoriesHit(map, "r", ["src/a.ts"]), []);
    assert.deepEqual(categoriesHit(map, "unknown", ["packages/config/a.ts"]), []);
  });
});

describe("the verdict", () => {
  const run = (files, body = "", repo = "r") => judge(map, repo, files, body);
  it("a change that matches nothing passes", () => assert.deepEqual(run(["src/a.ts"]).problems, []));
  it("a matching change without its documents fails and names them", () => {
    const [p] = run(["packages/config/a.ts"]).problems;
    assert.match(p, /norm/);
    assert.match(p, /packages\/config\/README\.md/);
    assert.match(p, /Docs: not needed, <why>/);
    assert.ok(!p.includes("cockpit"), "a local page is never asked");
  });
  it("a matching change with one document of the repository passes", () => {
    assert.deepEqual(run(["packages/config/a.ts", "AGENTS.md"]).problems, []);
  });
  it("a document of another repository does not count in the diff", () => {
    assert.equal(run(["far/a.ts", "docs/a.md"]).problems.length, 1);
  });
  it("a Docs link passes", () => assert.deepEqual(run(["far/a.ts"], "Docs: krizaka-internal#2761").problems, []));
  it("Docs: not needed, with a reason, passes", () => assert.deepEqual(run(["far/a.ts"], "Docs: not needed, test only").problems, []));
  it("Docs: not needed without a reason fails", () => assert.equal(run(["far/a.ts"], "Docs: not needed").problems.length, 1));
  it("two categories hit are two problems", () => {
    assert.equal(run(["far/a.ts", "packages/config/a.ts"]).problems.length, 2);
  });
  it("lists the categories it matched", () => assert.deepEqual(run(["far/a.ts"], "Docs: krizaka-internal#1").matched, ["far"]));
});

describe("the changed files", () => {
  it("reads every page and keeps the previous name of a rename", async () => {
    const pages = [[{ filename: "a" }, { filename: "b", previous_filename: "old" }], [{ filename: "c" }], []];
    let n = 0;
    assert.deepEqual(await changedFiles(async () => pages[n++]), ["a", "b", "old", "c"]);
  });
});

describe("the workflow and its caller", () => {
  const workflow = readFileSync(".github/workflows/docs-map.yml", "utf8");
  const template = readFileSync("workflow-templates/docs-map.yml", "utf8");
  it("is reusable, warns by default and runs the script", () => {
    assert.ok(workflow.includes("workflow_call:"));
    assert.ok(workflow.includes("default: warn"));
    assert.ok(workflow.includes("MODE: ${{ inputs.mode || 'warn' }}"));
    assert.ok(workflow.includes("node scripts/docs-map-check.mjs"));
    assert.ok(workflow.includes("  check:\n"), "the job is `check`, so the check reads « docs-map / check »");
  });
  it("is called by the template on the events where the description can change", () => {
    assert.ok(template.includes("  docs-map:\n"));
    assert.ok(template.includes("uses: krizaka/.github/.github/workflows/docs-map.yml@main"));
    assert.ok(template.includes("edited"));
  });
});
