// The post-merge deploy check: a merge to main that starts no deployment within the grace period is reported
// (and, with --trigger, deployed with a plain create-deployment, then verified like any deploy). krizaka/.github#113 P2-8.
import test from "node:test";
import assert from "node:assert/strict";
import { watch } from "../lib/watch.mjs";
import { createDoctl } from "../lib/doctl.mjs";
import { fakeFetch } from "./helpers.mjs";

const HEAD = "e".repeat(40);
const OLD = "f".repeat(40);
const NOW = Date.parse("2026-10-21T18:00:00Z");
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString();

const app = (name, repo, over = {}) => ({ id: `id-${name}`, spec: { name, services: [{ name: "web", github: { repo, branch: "main", deploy_on_push: true, ...over } }] } });
const github = (repo, sha, age) => ({ [`https://api.github.com/repos/${repo}/commits/main`]: { body: JSON.stringify({ sha, commit: { committer: { date: minutesAgo(age) } } }) } });
const deployment = (commit, phase = "ACTIVE", over = {}) => ({ id: `dep-${commit.slice(0, 3)}`, phase, created_at: minutesAgo(1), services: [{ name: "web", source_commit_hash: commit }], ...over });

function world({ apps, deployments = {}, calls = [] }) {
  const exec = async (args) => {
    calls.push(args.slice(2));
    const [a, b, c] = args.slice(2);
    if (`${a} ${b}` === "account get") return JSON.stringify([{ team: { name: "Krizaka-team" } }]);
    if (`${a} ${b}` === "apps list") return JSON.stringify(apps);
    if (`${a} ${b}` === "apps list-deployments") return JSON.stringify(deployments[c] ?? []);
    if (`${a} ${b}` === "apps create-deployment") return JSON.stringify([{ id: "triggered-1" }]);
    throw new Error(`unscripted doctl call: ${args.slice(2).join(" ")}`);
  };
  return { doctl: createDoctl({ exec, env: {} }), calls };
}
const run = (w, fetch, options = {}) => watch({ graceMinutes: 10, ...options }, { doctl: w.doctl, fetch, now: () => NOW, log: () => {}, env: {} });

test("watch: a head older than the grace period with no deployment is missing; one with a deployment is fine", async () => {
  const w = world({ apps: [app("blog", "krizaka/blog"), app("folioviv", "krizaka/folioviv")], deployments: { "id-blog": [deployment(OLD)], "id-folioviv": [deployment(HEAD, "BUILDING")] } });
  const fetch = fakeFetch({ ...github("krizaka/blog", HEAD, 25), ...github("krizaka/folioviv", HEAD, 25) });
  const report = await run(w, fetch);
  assert.deepEqual(report.missing.map((m) => m.app), ["blog"]);
  assert.deepEqual(report.ok.map((m) => m.app), ["folioviv"]);
});

test("watch: a merge younger than the grace period is not reported yet", async () => {
  const w = world({ apps: [app("blog", "krizaka/blog")], deployments: { "id-blog": [deployment(OLD)] } });
  const report = await run(w, fakeFetch(github("krizaka/blog", HEAD, 4)));
  assert.equal(report.missing.length, 0);
  assert.equal(report.waiting[0].app, "blog");
});

test("watch: a deployment of the head that failed is not 'missing' (it started) but is reported as failed", async () => {
  const w = world({ apps: [app("blog", "krizaka/blog")], deployments: { "id-blog": [deployment(HEAD, "ERROR")] } });
  const report = await run(w, fakeFetch(github("krizaka/blog", HEAD, 30)));
  assert.equal(report.missing.length, 0);
  assert.equal(report.failed[0].app, "blog");
});

test("watch: a component without deploy_on_push is a manual deploy and never expected to start by itself", async () => {
  const w = world({ apps: [app("sovkora-dev", "krizaka/sovkora", { deploy_on_push: undefined })], deployments: { "id-sovkora-dev": [deployment(OLD)] } });
  const report = await run(w, fakeFetch(github("krizaka/sovkora", HEAD, 90)));
  assert.equal(report.missing.length, 0);
  assert.equal(report.manual[0].app, "sovkora-dev");
});

test("watch --trigger: a missing deployment is started with a plain create-deployment (never --force-rebuild alone)", async () => {
  const calls = [];
  const w = world({ apps: [app("blog", "krizaka/blog")], deployments: { "id-blog": [deployment(OLD)] }, calls });
  const report = await run(w, fakeFetch(github("krizaka/blog", HEAD, 25)), { trigger: true });
  const create = calls.find((c) => c[1] === "create-deployment");
  assert.ok(create && !create.includes("--force-rebuild"));
  assert.equal(report.missing[0].triggered, "triggered-1");
});

test("watch: an app of another team or an unreadable head fails loudly instead of passing", async () => {
  const w = world({ apps: [app("blog", "krizaka/blog")], deployments: { "id-blog": [] } });
  await assert.rejects(run(w, fakeFetch({})), (e) => e.guard === "commit");
});

// Recorded shapes of `doctl apps list-deployments` (verikora-dev, 2026-11-14/15): the failed commit deployment, then DigitalOcean's automatic rollback.
const push = (sha, phase, minutes, over = {}) => ({ id: `push-${phase}-${minutes}`, phase, created_at: minutesAgo(minutes), cause: `commit ${sha.slice(0, 7)} pushed to github.com/krizaka/verikora`, cause_details: { type: "GIT_PUSH", git_push: { commit_sha: sha } }, services: [{ name: "web", source_commit_hash: sha }], ...over });
const rollback = (sha, minutes) => ({ id: `rb-${minutes}`, phase: "ACTIVE", created_at: minutesAgo(minutes), cause: "automatic rollback after a failed deployment", cause_details: { type: "AUTOROLLBACK" }, services: [{ name: "web", source_commit_hash: sha }] });
const failedBuild = { steps: [{ name: "deploy", status: "ERROR", steps: [{ name: "health check", status: "ERROR", reason: { code: "DeployContainerHealthChecksFailed", message: "Health checks failed on port 8080" } }] }] };

test("watch (a): the newest commit deployment ERROR followed by an automatic rollback ACTIVE is failed, the app named with its commit, phase and reason", async () => {
  const w = world({ apps: [app("verikora-dev", "krizaka/verikora")], deployments: { "id-verikora-dev": [rollback(OLD, 5), push(HEAD, "ERROR", 6, { progress: failedBuild }), push(OLD, "SUPERSEDED", 600)] } });
  const report = await run(w, fakeFetch(github("krizaka/verikora", HEAD, 30)));
  assert.equal(report.failed.length, 1);
  assert.equal(report.failed[0].app, "verikora-dev");
  assert.equal(report.failed[0].sha, HEAD);
  assert.equal(report.failed[0].phase, "ERROR");
  assert.match(report.failed[0].reason, /deploy\/health check: Health checks failed on port 8080/);
  assert.equal(report.ok.length, 0);
});

test("watch (b): the newest commit deployment ACTIVE is green", async () => {
  const w = world({ apps: [app("verikora-dev", "krizaka/verikora")], deployments: { "id-verikora-dev": [push(HEAD, "ACTIVE", 6), push(OLD, "SUPERSEDED", 600)] } });
  const report = await run(w, fakeFetch(github("krizaka/verikora", HEAD, 30)));
  assert.equal(report.failed.length, 0);
  assert.equal(report.ok[0].app, "verikora-dev");
});

test("watch (b'): a later good commit after an old failure is green", async () => {
  const w = world({ apps: [app("verikora-dev", "krizaka/verikora")], deployments: { "id-verikora-dev": [push(HEAD, "ACTIVE", 6), rollback(OLD, 60), push(OLD, "ERROR", 61)] } });
  const report = await run(w, fakeFetch(github("krizaka/verikora", HEAD, 30)));
  assert.equal(report.failed.length, 0);
});

test("watch (c): a CANCELED commit deployment is failed", async () => {
  const w = world({ apps: [app("verikora-dev", "krizaka/verikora")], deployments: { "id-verikora-dev": [push(HEAD, "CANCELED", 6)] } });
  const report = await run(w, fakeFetch(github("krizaka/verikora", HEAD, 30)));
  assert.equal(report.failed[0].phase, "CANCELED");
});

test("watch (d): an app without deploy_on_push is never expected, even with a failed deployment in its list", async () => {
  const w = world({ apps: [app("sovkora-dev", "krizaka/sovkora", { deploy_on_push: undefined })], deployments: { "id-sovkora-dev": [push(HEAD, "ERROR", 6)] } });
  const report = await run(w, fakeFetch(github("krizaka/sovkora", HEAD, 90)));
  assert.equal(report.failed.length, 0);
  assert.equal(report.manual[0].app, "sovkora-dev");
});
