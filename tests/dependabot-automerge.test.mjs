import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const reusable = read(".github/workflows/dependabot-automerge.yml");
const template = read("workflow-templates/dependabot-automerge.yml");

test("the reusable workflow is callable (a file that only calls itself never runs)", () => {
  assert.match(reusable, /^on:\n {2}workflow_call:/m);
  assert.doesNotMatch(reusable, /uses: krizaka\/\.github\/\.github\/workflows\/dependabot-automerge\.yml/);
});

test("every uses: of the reusable workflow is pinned by SHA", () => {
  for (const m of reusable.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)) assert.match(m[1], /@[0-9a-f]{40}$/, m[1]);
});

test("the caller template is read-only at the top and writes only on its job (Scorecard Token-Permissions)", () => {
  const top = template.slice(0, template.indexOf("\njobs:")).split("\n").filter((l) => !l.startsWith("#")).join("\n");
  assert.match(top, /^permissions:\n {2}contents: read\n/m);
  assert.doesNotMatch(top, /write/);
  assert.match(template.slice(template.indexOf("\njobs:")), /permissions:\n {6}contents: write\n {6}pull-requests: write/);
});
