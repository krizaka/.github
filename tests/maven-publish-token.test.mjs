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

test("deploy-modules: an input that limits the deploy to a -pl list and skips the root-POM check", () => {
  assert.match(src, /\n {6}deploy-modules:\n(?: {8}.*\n)*? {8}type: string/);
  assert.match(src, /- name: Already published\?\n {8}id: published\n {8}if: inputs\.deploy-modules == ''/);
  assert.match(deployStep, /DEPLOY_MODULES: \$\{\{ inputs\.deploy-modules \}\}/);
  assert.match(deployStep, /\$\{DEPLOY_MODULES:\+-pl "\$DEPLOY_MODULES"\} deploy/);
});

test("deploy-repository: a package is bound to its first repository, so the deploy URL can name another one", () => {
  assert.match(src, /\n {6}deploy-repository:\n(?: {8}.*\n)*? {8}type: string/);
  assert.match(deployStep, /DEPLOY_REPOSITORY: \$\{\{ inputs\.deploy-repository \}\}/);
  assert.match(deployStep, /maven\.pkg\.github\.com\/\$\{DEPLOY_REPOSITORY:-\$REPOSITORY\}"/);
});
