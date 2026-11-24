import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
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
  assert.equal(gate({ RELEVANT: "^(pom\\.xml|sovkora-end2end/)", GATE_TEST_FILES: JSON.stringify(["docs/a.md", "scripts/x.mjs"]) }), "false");
  assert.equal(gate({ RELEVANT: "^(pom\\.xml|sovkora-end2end/)", GATE_TEST_FILES: JSON.stringify(["docs/a.md", "sovkora-end2end/A.java"]) }), "true");
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
  // The merge queue compares the entry with its base; when that cannot be read it runs everything.
  assert.equal(gate({ EVENT: "merge_group", MQ_BASE: "a".repeat(40), IGNORE: docs, API_TOKEN: "x", GITHUB_API_URL: "http://127.0.0.1:9" }), "true");
  assert.equal(gate({ IGNORE: "(", GATE_TEST_FILES: JSON.stringify(["README.md"]) }), "true");
  assert.equal(gate({ IGNORE: docs, GATE_TEST_FILES: "not json" }), "true");
});

const releasePat = "^(package\\.json|CHANGELOG\\.md|package-lock\\.json|\\.release-please-manifest\\.json)$";
const releaseFiles = JSON.stringify(["package.json", "CHANGELOG.md", "package-lock.json", ".release-please-manifest.json"]);

const releaseBranch = "release-please--branches--main--components--krizaka-com";

test("a release pull request is skipped when every file matches release-files", () => {
  assert.equal(gate({ EVENT: "pull_request", HEAD_REF: releaseBranch, RELEASE_FILES: releasePat, GATE_TEST_FILES: releaseFiles }), "false");
  assert.equal(gate({ EVENT: "pull_request", HEAD_REF: "changeset-release/main", RELEASE_FILES: releasePat, GATE_TEST_FILES: releaseFiles }), "false");
});

test("a release pull request with one other file is not skipped", () => {
  const mixed = JSON.stringify(["package.json", "CHANGELOG.md", "src/index.ts"]);
  assert.equal(gate({ EVENT: "pull_request", HEAD_REF: releaseBranch, RELEASE_FILES: releasePat, GATE_TEST_FILES: mixed }), "true");
});

test("the same files on any other branch run everything (a dependency bump needs its tests)", () => {
  const bump = JSON.stringify(["package.json", "package-lock.json"]);
  for (const HEAD_REF of ["dependabot/npm_and_yarn/all-1", "wip/x", "my-release-please--branch", ""]) {
    assert.equal(gate({ EVENT: "pull_request", HEAD_REF, RELEASE_FILES: releasePat, GATE_TEST_FILES: bump }), "true", HEAD_REF);
  }
});

test("merge_group runs in full even when every file matches release-files", () => {
  assert.equal(gate({ EVENT: "merge_group", HEAD_REF: releaseBranch, RELEASE_FILES: releasePat, GATE_TEST_FILES: releaseFiles }), "true");
});

test("release-files fails open on a bad pattern, and is inert when not set", () => {
  assert.equal(gate({ EVENT: "pull_request", HEAD_REF: releaseBranch, RELEASE_FILES: "(", GATE_TEST_FILES: releaseFiles }), "true");
  assert.equal(gate({ EVENT: "pull_request", HEAD_REF: releaseBranch, GATE_TEST_FILES: releaseFiles }), "true");
});

test("the workflow is callable, pinned, and documents the fail-open `if` callers must use", () => {
  assert.match(yml, /!cancelled\(\) && needs\.changes\.outputs\.code != 'false'/);
  assert.match(yml, /^on:\n {2}workflow_call:/m);
  for (const m of yml.matchAll(/^\s*(?:- )?uses:\s*(\S+@\S+)/gm)) assert.match(m[1], /@[0-9a-f]{40}$/, m[1]);
});

test("a push to the default branch runs in full when full-on-default-push is set, even docs-only (its Sonar analysis)", () => {
  const push = { EVENT: "push", REF_TYPE: "branch", REF_NAME: "main", DEFAULT_BRANCH: "main", IGNORE: docs, GATE_TEST_FILES: JSON.stringify(["README.md"]) };
  assert.equal(gate({ ...push, FULL_ON_DEFAULT_PUSH: "true" }), "true");
  assert.equal(gate({ ...push, FULL_ON_DEFAULT_PUSH: "false" }), "false"); // opt-in: the default is unchanged
  assert.equal(gate({ ...push, FULL_ON_DEFAULT_PUSH: "true", REF_NAME: "feat/x" }), "false"); // another branch keeps the skip
  assert.equal(gate({ ...push, FULL_ON_DEFAULT_PUSH: "true", EVENT: "pull_request" }), "false"); // a pull request keeps the skip
});

// krizaka-internal#4840: the merge queue does not rerun what the pull request's run already proved on the same tree.
const PR_HEAD = "b".repeat(40);
const QUEUED = "c".repeat(40);
const COMPARE = `/repos/krizaka/x/compare/${"a".repeat(40)}...${QUEUED}`;
const queueEnv = (api) => ({
  EVENT: "merge_group",
  MQ_BASE: "a".repeat(40),
  MQ_HEAD_REF: `refs/heads/gh-readonly-queue/main/pr-1114-${"a".repeat(40)}`,
  GITHUB_SHA: QUEUED,
  GITHUB_WORKFLOW_REF: "krizaka/x/.github/workflows/ci.yml@refs/heads/gh-readonly-queue/main/pr-1114-x",
  GITHUB_API_URL: api,
  API_TOKEN: "x",
  IGNORE: docs,
});
const greenRun = { path: ".github/workflows/ci.yml", head_sha: PR_HEAD, event: "pull_request", conclusion: "success", html_url: "https://example.test/run/1" };

/** A fake GitHub API: `routes` maps a path (without the query) to a JSON body, a number (an HTTP status) or a function of the URL. */
function fakeApi(routes) {
  const seen = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    seen.push(req.url);
    const route = routes[url.pathname];
    const body = typeof route === "function" ? route(url) : route;
    if (body === undefined || typeof body === "number") {
      res.writeHead(body ?? 404).end("{}");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${server.address().port}`, seen, close: () => server.close() })));
}

/** The gate run asynchronously (the fake API answers from this process): { code, log }. */
async function gateAsync(env) {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const out = join(dir, "out");
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, GITHUB_REPOSITORY: "krizaka/x", ...env },
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const [status] = await once(child, "close");
  assert.equal(status, 0, log);
  return { code: readFileSync(out, "utf8").trim().replace("code=", ""), log };
}

const sameTree = (overrides = {}) => ({
  "/repos/krizaka/x/pulls/1114": { head: { sha: PR_HEAD } },
  [`/repos/krizaka/x/git/commits/${PR_HEAD}`]: { tree: { sha: "e".repeat(40) } },
  [`/repos/krizaka/x/git/commits/${QUEUED}`]: { tree: { sha: "e".repeat(40) } },
  "/repos/krizaka/x/actions/runs": { workflow_runs: [greenRun] },
  [COMPARE]: { total_commits: 1, files: [{ filename: "src/a.ts" }] },
  ...overrides,
});

async function queue(routes, env = {}) {
  const api = await fakeApi(routes);
  try {
    return { ...(await gateAsync({ ...queueEnv(api.url), ...env })), seen: api.seen };
  } finally {
    api.close();
  }
}

test("merge queue: the tree a green pull-request run tested skips the heavy jobs (they report « Skipped »)", async () => {
  const r = await queue(sameTree());
  assert.equal(r.code, "false", r.log);
  assert.match(r.log, /https:\/\/example\.test\/run\/1/);
  const runs = r.seen.find((u) => u.startsWith("/repos/krizaka/x/actions/runs?"));
  assert.match(runs, new RegExp(`head_sha=${PR_HEAD}`));
  assert.match(runs, /event=pull_request/);
  assert.match(runs, /status=success/);
});

test("merge queue: a different tree (main moved, several pull requests in the group) runs the files' verdict, as before", async () => {
  const r = await queue(sameTree({ [`/repos/krizaka/x/git/commits/${QUEUED}`]: { tree: { sha: "f".repeat(40) } } }));
  assert.equal(r.code, "true", r.log);
  assert.ok(!r.seen.some((u) => u.startsWith("/repos/krizaka/x/actions/runs")), "no run is looked up when the trees differ");
});

test("merge queue: no green run of this workflow on the pull request's head runs everything", async () => {
  const cases = {
    none: { workflow_runs: [] },
    "another workflow": { workflow_runs: [{ ...greenRun, path: ".github/workflows/other.yml" }] },
    "another head": { workflow_runs: [{ ...greenRun, head_sha: "d".repeat(40) }] },
    "not a pull request run": { workflow_runs: [{ ...greenRun, event: "push" }] },
    cancelled: { workflow_runs: [{ ...greenRun, conclusion: "cancelled" }] },
    failed: { workflow_runs: [{ ...greenRun, conclusion: "failure" }] },
  };
  for (const [name, runs] of Object.entries(cases)) {
    const r = await queue(sameTree({ "/repos/krizaka/x/actions/runs": runs }));
    assert.equal(r.code, "true", `${name}: ${r.log}`);
  }
});

test("merge queue: an API failure in the proof runs everything (fail-safe)", async () => {
  for (const path of ["/repos/krizaka/x/pulls/1114", `/repos/krizaka/x/git/commits/${PR_HEAD}`, `/repos/krizaka/x/git/commits/${QUEUED}`, "/repos/krizaka/x/actions/runs"]) {
    for (const status of [403, 500]) {
      const r = await queue(sameTree({ [path]: status }));
      assert.equal(r.code, "true", `${path} ${status}: ${r.log}`);
    }
  }
  const malformed = await queue(sameTree({ "/repos/krizaka/x/actions/runs": { nothing: 1 } }));
  assert.equal(malformed.code, "true", malformed.log);
});

test("merge queue: a docs-only entry still skips when the proof fails (the files' verdict is kept)", async () => {
  const r = await queue(sameTree({ "/repos/krizaka/x/actions/runs": 403, [COMPARE]: { total_commits: 1, files: [{ filename: "README.md" }] } }));
  assert.equal(r.code, "false", r.log);
});

test("merge queue: no pull request in the queue branch, or no workflow ref, runs everything", async () => {
  assert.equal((await queue(sameTree(), { MQ_HEAD_REF: "refs/heads/gh-readonly-queue/main/odd" })).code, "true");
  assert.equal((await queue(sameTree(), { GITHUB_WORKFLOW_REF: "" })).code, "true");
});

test("merge queue: reuse-pr-run false keeps the full run (a caller whose queue proves more than its pull request)", async () => {
  const r = await queue(sameTree(), { REUSE_PR_RUN: "false" });
  assert.equal(r.code, "true", r.log);
  assert.ok(!r.seen.some((u) => u.startsWith("/repos/krizaka/x/pulls/")), "the proof is not attempted");
});

test("the gate never asks for a token scope a caller does not already grant (no startup_failure on a pin bump)", () => {
  // Listing a pull request's runs needs no `actions: read` on a public repository; a private one answers 403 and runs in full.
  assert.deepEqual([...yml.matchAll(/^( *)permissions:.*$/gm)].map((m) => m[0]), ["permissions:"]);
  assert.match(yml, /^permissions:\n {2}contents: read\n\n/m);
});
