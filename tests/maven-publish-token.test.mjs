// maven.yml: the GitHub Packages deploy may use an optional write:packages token (MAVEN_PUBLISH_TOKEN) in place of GITHUB_TOKEN,
// for packages first published by another repository (HTTP 422 with the GITHUB_TOKEN of this one).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../.github/workflows/maven.yml", import.meta.url), "utf8");
const deploy = src.slice(src.indexOf("- name: Deploy\n"));
const deployStep = deploy.slice(0, deploy.indexOf("\n\n"));

test("MAVEN_PUBLISH_TOKEN is an optional workflow_call secret", () => {
  assert.match(src, /\n {6}MAVEN_PUBLISH_TOKEN:\n(?: {8}.*\n)*? {8}required: false/);
});

test("the Deploy step uses it as the server password, falling back to GITHUB_TOKEN", () => {
  assert.match(deployStep, /GITHUB_TOKEN: \$\{\{ secrets\.MAVEN_PUBLISH_TOKEN \|\| secrets\.GITHUB_TOKEN \}\}/);
});

test("the token is used by the Deploy step only", () => {
  assert.equal(src.split("secrets.MAVEN_PUBLISH_TOKEN").length - 1, 1);
});
