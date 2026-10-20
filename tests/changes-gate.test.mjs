import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const yml = readFileSync(new URL("../.github/workflows/changes.yml", import.meta.url), "utf8");
const script = yml.split("<<'GATE'\n")[1].split("\n          GATE")[0].replace(/^ {10}/gm, "");

function gate(env) {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const out = join(dir, "out");
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, GITHUB_REPOSITORY: "krizaka/x", GITHUB_API_URL: "http://127.0.0.1:9", ...env },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  let text = "";
  try {
    text = readFileSync(out, "utf8");
  } catch {}
  return text.trim().replace("code=", "");
}
const docs = "^[^/]+\\.md$|^docs/|^\\.changeset/";

test("docs-only changes are skipped", () => {
  assert.equal(gate({ IGNORE: docs, GATE_TEST_FILES: JSON.stringify(["README.md", "docs/a/b.md", ".changeset/x.md"]) }), "false");
});

test("one code file among docs runs everything", () => {
  assert.equal(gate({ IGNORE: docs, GATE_TEST_FILES: JSON.stringify(["README.md", "packages/ui/src/a.tsx"]) }), "true");
});

test("a markdown file below a package is code for the site (not ignored by the root-only pattern)", () => {
  assert.equal(gate({ IGNORE: docs, GATE_TEST_FILES: JSON.stringify(["packages/ui/CHANGELOG.md"]) }), "true");
});

test("`relevant` is an allow-list", () => {
  assert.equal(gate({ RELEVANT: "^(pom\\.xml|orazaka-end2end/)", GATE_TEST_FILES: JSON.stringify(["docs/a.md", "scripts/x.mjs"]) }), "false");
  assert.equal(gate({ RELEVANT: "^(pom\\.xml|orazaka-end2end/)", GATE_TEST_FILES: JSON.stringify(["docs/a.md", "orazaka-end2end/A.java"]) }), "true");
});

test("an empty file list runs everything (an empty « ci: trigger checks » commit)", () => {
  assert.equal(gate({ IGNORE: docs, GATE_TEST_FILES: "[]" }), "true");
});

test("schedule, dispatch, tags and a first push run in full", () => {
  for (const EVENT of ["schedule", "workflow_dispatch", "merge_group"]) assert.equal(gate({ EVENT, IGNORE: docs }), "true", EVENT);
  assert.equal(gate({ EVENT: "push", REF_TYPE: "tag", BEFORE: "a".repeat(40), IGNORE: docs }), "true");
  assert.equal(gate({ EVENT: "push", REF_TYPE: "branch", BEFORE: "0".repeat(40), IGNORE: docs }), "true");
});

test("fails open: an unreachable API, a bad pattern, a bad hook all run everything", () => {
  assert.equal(gate({ EVENT: "pull_request", PR: "1", IGNORE: docs, API_TOKEN: "x" }), "true");
  assert.equal(gate({ IGNORE: "(", GATE_TEST_FILES: JSON.stringify(["README.md"]) }), "true");
  assert.equal(gate({ IGNORE: docs, GATE_TEST_FILES: "not json" }), "true");
});

test("the workflow is callable, pinned, and documents the fail-open `if` callers must use", () => {
  assert.match(yml, /!cancelled\(\) && needs\.changes\.outputs\.code != 'false'/);
  assert.match(yml, /^on:\n {2}workflow_call:/m);
  for (const m of yml.matchAll(/^\s*(?:- )?uses:\s*(\S+@\S+)/gm)) assert.match(m[1], /@[0-9a-f]{40}$/, m[1]);
});
