// Who uses each org secret (krizaka-restricted#372): the usage reader counts every way a secret reaches a job, and a repository
// that sees an org secret none of its workflows use is red. A wrong « unused » breaks a release once the secret is scoped (slice 2),
// so every doubt counts as used.
import test from "node:test";
import assert from "node:assert/strict";
import { inheritCalls, inventoryRows, orgSecretVerdict, renderInventory, secretRefs, secretUsage, seenBy } from "../scripts/org-secrets.mjs";

const ORG = [
  { name: "NPM_TOKEN", visibility: "all", repos: null },
  { name: "EXPO_TOKEN", visibility: "private", repos: null },
  { name: "RELEASE_APP_PRIVATE_KEY", visibility: "selected", repos: ["krizaka-ui", ".github"] },
];

test("seenBy: all reaches every repository, private only the private ones, selected only the listed ones", () => {
  assert.deepEqual(seenBy(ORG, { name: "krizaka-ui", private: false }).map((s) => s.name), ["NPM_TOKEN", "RELEASE_APP_PRIVATE_KEY"]);
  assert.deepEqual(seenBy(ORG, { name: "verikora", private: true }).map((s) => s.name), ["NPM_TOKEN", "EXPO_TOKEN"]);
  assert.deepEqual(seenBy(ORG, { name: "krizaka-com", private: false }).map((s) => s.name), ["NPM_TOKEN"]);
});

test("secretRefs: dot and index forms, any case, with their line; GITHUB_TOKEN is not an org secret", () => {
  const text = ["env:", "  A: ${{ secrets.npm_token }}", "  B: ${{ secrets['EXPO_TOKEN'] }}", "  C: ${{ secrets.GITHUB_TOKEN }}"].join("\n");
  assert.deepEqual(secretRefs(text).names, [
    { name: "NPM_TOKEN", line: 2 },
    { name: "EXPO_TOKEN", line: 3 },
  ]);
  assert.equal(secretRefs(text).dynamic, null);
});

test("secretRefs: a computed lookup or toJSON(secrets) is dynamic (every secret counted as used)", () => {
  assert.match(secretRefs("x: ${{ secrets[matrix.key] }}").dynamic, /line 1/);
  assert.match(secretRefs("y: ${{ toJSON(secrets) }}").dynamic, /line 1/);
});

const CALLER = `name: release
on: push
jobs:
  build:
    uses: krizaka/.github/.github/workflows/node-ci.yml@abc123 # v1
  publish:
    uses: krizaka/.github/.github/workflows/npm-publish.yml@abc123
    secrets: inherit
  quoted:
    uses: "krizaka/sovkora/.github/workflows/deploy.yml@main"
    secrets:   inherit
  explicit:
    uses: krizaka/.github/.github/workflows/expo.yml@abc123
    secrets:
      token: \${{ secrets.EXPO_TOKEN }}
`;

test("inheritCalls: only the jobs that pass secrets: inherit, with the workflow they call", () => {
  assert.deepEqual(inheritCalls(CALLER), [
    { job: "publish", repo: "krizaka/.github", file: "npm-publish.yml", ref: "abc123" },
    { job: "quoted", repo: "krizaka/sovkora", file: "deploy.yml", ref: "main" },
  ]);
});

test("inheritCalls: `secrets: inherit` the parser cannot tie to a job makes every call of the file count as inherit", () => {
  const odd = "jobs:\n  weird:\n    <<: *defaults\n    uses: krizaka/.github/.github/workflows/a.yml@v1\nx-defaults: &defaults\n  secrets: inherit\n";
  assert.deepEqual(inheritCalls(odd).map((c) => c.file), ["a.yml"]);
});

const reusable = (files) => async (repo, file, ref) => files[`${repo}/${file}@${ref}`] ?? null;

test("secretUsage: own workflows, composite actions, and the secrets an inherited reusable workflow references (nested)", async () => {
  const files = [
    { path: ".github/workflows/release.yml", text: CALLER },
    { path: ".github/actions/sign/action.yml", text: "runs:\n  using: composite\n# needs ${{ secrets.SIGNING_KEY }}\n" },
  ];
  const called = {
    ".github/npm-publish.yml@abc123": "on: workflow_call\njobs:\n  p:\n    steps:\n      - run: echo\n        env:\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\n  app:\n    uses: krizaka/.github/.github/workflows/app-token.yml@def\n    secrets: inherit\n",
    ".github/app-token.yml@def": "on: workflow_call\njobs:\n  t:\n    steps:\n      - with:\n          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}\n",
    "sovkora/deploy.yml@main": "on: workflow_call\njobs:\n  d:\n    steps: []\n",
  };
  const usage = await secretUsage(files, reusable(called));
  assert.deepEqual([...usage.used.keys()].sort(), ["EXPO_TOKEN", "NPM_TOKEN", "RELEASE_APP_PRIVATE_KEY", "SIGNING_KEY"]);
  assert.equal(usage.used.get("EXPO_TOKEN"), ".github/workflows/release.yml:15");
  assert.equal(usage.used.get("NPM_TOKEN"), ".github/workflows/release.yml → krizaka/.github/.github/workflows/npm-publish.yml@abc123:7");
  assert.match(usage.used.get("RELEASE_APP_PRIVATE_KEY"), /npm-publish\.yml@abc123 → krizaka\/\.github\/\.github\/workflows\/app-token\.yml@def:6$/);
  assert.deepEqual(usage.inherits.map((i) => `${i.path} ${i.job} ${i.target}`), [
    ".github/workflows/release.yml publish krizaka/.github/.github/workflows/npm-publish.yml@abc123",
    ".github/workflows/release.yml quoted krizaka/sovkora/.github/workflows/deploy.yml@main",
  ]);
  assert.deepEqual(usage.unknown, []);
});

test("secretUsage: an inherited workflow that cannot be read, or outside the org, is unknown (never « unused »)", async () => {
  const files = [{ path: ".github/workflows/a.yml", text: "jobs:\n  x:\n    uses: krizaka/.github/.github/workflows/gone.yml@v1\n    secrets: inherit\n  y:\n    uses: someone/else/.github/workflows/w.yml@v2\n    secrets: inherit\n" }];
  const usage = await secretUsage(files, reusable({}));
  assert.equal(usage.unknown.length, 2);
  assert.match(usage.unknown[0], /gone\.yml@v1, which could not be read/);
  assert.match(usage.unknown[1], /someone\/else/);
});

test("orgSecretVerdict: red when the repository sees a secret it does not use, green once scoped, unknown never red", async () => {
  const usage = await secretUsage([{ path: ".github/workflows/ci.yml", text: "env:\n  T: ${{ secrets.NPM_TOKEN }}\n" }], reusable({}));
  const red = orgSecretVerdict(seenBy(ORG, { name: "verikora", private: true }), usage);
  assert.equal(red.ok, false);
  assert.match(red.why, /sees 1 org secret\(s\) it does not use: EXPO_TOKEN/);
  assert.match(red.why, /set the secret to selected repositories/);
  assert.deepEqual(orgSecretVerdict(seenBy(ORG, { name: "krizaka-com", private: false }), usage), { ok: true, why: "" });
  const unknown = orgSecretVerdict(seenBy(ORG, { name: "verikora", private: true }), { ...usage, unknown: ["dynamic"] });
  assert.equal(unknown.ok, null);
});

test("inventory: per secret, who uses it (with the file) and who sees it without using it; names only", () => {
  const repos = [
    { name: "krizaka-ui", seen: seenBy(ORG, { name: "krizaka-ui", private: false }).map((s) => s.name), usage: { used: new Map([["NPM_TOKEN", ".github/workflows/r.yml:3"]]), unknown: [], inherits: [] } },
    { name: "verikora", seen: seenBy(ORG, { name: "verikora", private: true }).map((s) => s.name), usage: { used: new Map(), unknown: [], inherits: [] } },
  ];
  const rows = inventoryRows(ORG, repos);
  assert.deepEqual(rows[0], { name: "NPM_TOKEN", visibility: "all", users: [{ repo: "krizaka-ui", where: ".github/workflows/r.yml:3" }], idle: ["verikora"], unknown: [] });
  assert.deepEqual(rows[1].idle, ["verikora"]);
  assert.deepEqual(rows[2], { name: "RELEASE_APP_PRIVATE_KEY", visibility: "selected", users: [], idle: ["krizaka-ui"], unknown: [] });
  const md = renderInventory(rows);
  assert.match(md, /^\| Secret \| Visibility today \|/);
  assert.match(md, /\| `NPM_TOKEN` \| all \| krizaka-ui \(`.github\/workflows\/r.yml:3`\) \| verikora \|/);
});
