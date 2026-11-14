import assert from "node:assert/strict";
import { test } from "node:test";
import { missingRequiredChecks, releaseTokenProblems, noassertionProblems, selfHostedLines, selfHostedProblems, SELF_HOSTED_EXCEPTIONS, configToolStems, localCopyProblems, LOCAL_COPY_EXCEPTIONS, CONFIG_HOME } from "../scripts/audit-guards.mjs";

test("a main without required checks is refused", () => {
  assert.equal(missingRequiredChecks([]).length, 2);
  assert.deepEqual(missingRequiredChecks(["CI gate", "SonarCloud Code Analysis"]), []);
  assert.deepEqual(missingRequiredChecks(["CI gate"]), ["Sonar is not a required check of main"]);
});

test("a reusable-workflow gate is reported as `ci / CI gate` and counts", () => {
  assert.deepEqual(missingRequiredChecks(["ci / CI gate", "SonarCloud Code Analysis"], "krizaka-com"), []);
  assert.deepEqual(missingRequiredChecks(["not a CI gate", "SonarCloud Code Analysis"], "krizaka-com"), ["CI gate is not a required check of main"]);
});

test("a repository with another legitimate gate is accepted only on that exact check", () => {
  assert.deepEqual(missingRequiredChecks(["workspace", "SonarCloud Code Analysis"], "sovkora"), []);
  assert.deepEqual(missingRequiredChecks(["workspace", "SonarCloud Code Analysis"], "krizaka-com"), ["CI gate is not a required check of main"]);
  assert.deepEqual(missingRequiredChecks(["SonarCloud Code Analysis"], "sovkora"), ["CI gate is not a required check of main"]);
});

const app = `      - id: app
        uses: actions/create-github-app-token@v3
      - uses: googleapis/release-please-action@v5
        with:
          token: \${{ steps.app.outputs.token }}
`;
test("a release workflow with an app token passes", () => assert.deepEqual(releaseTokenProblems(app), []));
test("a fallback to the workflow token after the app token passes", () =>
  assert.deepEqual(releaseTokenProblems(app.replace("token }}", "token || secrets.GITHUB_TOKEN }}")), []));
test("release-please with the workflow token alone is refused", () => {
  const bad = "      - uses: googleapis/release-please-action@v5\n        with:\n          token: ${{ secrets.GITHUB_TOKEN }}\n";
  assert.equal(releaseTokenProblems(bad).length, 2);
});
test("changesets without an app step is refused", () =>
  assert.equal(releaseTokenProblems("      - uses: changesets/action@v2\n        with:\n          github-token: x\n").length, 1));
test("a workflow that is not a release one is ignored", () => assert.deepEqual(releaseTokenProblems("run: echo"), []));

test("a public repo with NOASSERTION fails", () => {
  assert.equal(noassertionProblems("some-lib", "NOASSERTION").length, 1);
});
test("a public repo with a recognised licence passes", () => {
  assert.deepEqual(noassertionProblems("some-lib", "Apache-2.0"), []);
  assert.deepEqual(noassertionProblems("some-lib", "MIT"), []);
});
test("FSL repos are exempt from NOASSERTION (GitHub cannot classify FSL-1.1-ALv2)", () => {
  assert.deepEqual(noassertionProblems("sovkora", "NOASSERTION"), []);
});
test("a null spdx_id is not NOASSERTION and does not fail", () => {
  assert.deepEqual(noassertionProblems("some-lib", null), []);
});

const wf = (runsOn) => `jobs:\n  build:\n    name: build\n${runsOn}\n    steps:\n      - run: echo\n`;
const CASES = [
  ["a hosted runner", wf("    runs-on: ubuntu-latest"), []],
  ["inline self-hosted", wf("    runs-on: self-hosted"), [4]],
  ["a flow list with labels", wf("    runs-on: [self-hosted, golden]"), [4]],
  ["a block list", wf("    runs-on:\n      - self-hosted\n      - macOS"), [5]],
  ["a labels mapping", wf("    runs-on:\n      group: g\n      labels: [self-hosted]"), [6]],
  ["an expression", wf("    runs-on: ${{ fromJSON('[\"self-hosted\"]') }}"), [4]],
  ["an input of a shared workflow", "jobs:\n  ci:\n    uses: krizaka/.github/.github/workflows/x.yml@abc\n    with:\n      runs-on: '[\"self-hosted\"]'\n", [5]],
  ["a comment only", wf("    runs-on: ubuntu-latest # not self-hosted"), []],
  ["a hosted block list then a later mention", wf("    runs-on:\n      - ubuntu-latest\n    env:\n      X: self-hosted"), []],
  ["an input declaration whose description mentions it", "on:\n  workflow_call:\n    inputs:\n      runs-on:\n        description: 'a private repository: [\"self-hosted\"]'\n        type: string\n        default: '\"ubuntu-latest\"'\n", []],
  ["an input declaration whose default is self-hosted", "on:\n  workflow_call:\n    inputs:\n      runs-on:\n        description: x\n        default: '\"self-hosted\"'\n", [6]],
];
for (const [name, yaml, lines] of CASES) test(`self-hosted lines: ${name}`, () => assert.deepEqual(selfHostedLines(yaml), lines));

test("a public repository naming a self-hosted runner is a finding with repo, file and line", () => {
  assert.deepEqual(selfHostedProblems("some-lib", ".github/workflows/ci.yml", wf("    runs-on: [self-hosted, x]"), true), [
    "some-lib/.github/workflows/ci.yml:4: a public repository names a self-hosted runner (a fork PR would run on our machine; krizaka-internal#3633)",
  ]);
});
test("a private repository may use a self-hosted runner", () => {
  assert.deepEqual(selfHostedProblems("some-app", ".github/workflows/ci.yml", wf("    runs-on: self-hosted"), false), []);
});
test("a tracked exception names its ticket and silences only that file", () => {
  for (const [key, ticket] of Object.entries(SELF_HOSTED_EXCEPTIONS)) assert.match(ticket, /^krizaka-internal#\d+$/, key);
  assert.deepEqual(selfHostedProblems("sovkora", ".github/workflows/packs-golden.yml", wf("    runs-on: [self-hosted, golden]"), true), []);
  assert.equal(selfHostedProblems("sovkora", ".github/workflows/other.yml", wf("    runs-on: self-hosted"), true).length, 1);
});

const BIN = {
  "krizaka-seo-family": "bin/krizaka-seo-family.mjs",
  "krizaka-sg-ratchet": "bin/krizaka-sg-ratchet.mjs",
  "krizaka-edit-check": "bin/krizaka-edit-check.mjs",
};
test("the tool stems come from the bin field of the package, one source", () => {
  assert.deepEqual(configToolStems(BIN), ["seo-family", "sg-ratchet", "edit-check"]);
  assert.deepEqual(configToolStems(undefined), []);
});
test("a local copy of a shipped tool is a finding with repo and path", () => {
  const paths = ["scripts/check-seo-family.mjs", "scripts/sg-ratchet.mjs", "tools/krizaka-edit-check.js", "scripts/build.mjs", "docs/seo-family.md", "src/seo-family-card.tsx"];
  assert.deepEqual(localCopyProblems("some-site", paths, configToolStems(BIN)), [
    "some-site/scripts/check-seo-family.mjs: a local copy of @krizaka/config's `krizaka-seo-family` (run the bin instead; krizaka-internal#3649)",
    "some-site/scripts/sg-ratchet.mjs: a local copy of @krizaka/config's `krizaka-sg-ratchet` (run the bin instead; krizaka-internal#3649)",
    "some-site/tools/krizaka-edit-check.js: a local copy of @krizaka/config's `krizaka-edit-check` (run the bin instead; krizaka-internal#3649)",
  ]);
});
test("a file outside scripts, bin or tools, or under node_modules, is not a copy", () => {
  assert.deepEqual(localCopyProblems("r", ["src/sg-ratchet.mjs", "node_modules/x/scripts/sg-ratchet.mjs"], ["sg-ratchet"]), []);
});
test("the package's own source is not a copy of itself", () => {
  assert.deepEqual(localCopyProblems(CONFIG_HOME.repo, [`${CONFIG_HOME.prefix}scripts/check-seo-family.mjs`], ["seo-family"]), []);
});
test("a tracked copy names its ticket and silences only that file", () => {
  for (const [key, ticket] of Object.entries(LOCAL_COPY_EXCEPTIONS)) assert.match(ticket, /^krizaka-internal#\d+$/, key);
  const [[key]] = Object.entries(LOCAL_COPY_EXCEPTIONS);
  const slash = key.indexOf("/");
  const [repo, path] = [key.slice(0, slash), key.slice(slash + 1)];
  assert.deepEqual(localCopyProblems(repo, [path], ["seo-family", "sg-ratchet"]), []);
  assert.equal(localCopyProblems(repo, ["scripts/other/sg-ratchet.mjs"], ["sg-ratchet"]).length, 1);
});
