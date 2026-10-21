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
  const w = world({ apps: [app("blog", "krizaka/blog"), app("akinaza", "krizaka/akinaza")], deployments: { "id-blog": [deployment(OLD)], "id-akinaza": [deployment(HEAD, "BUILDING")] } });
  const fetch = fakeFetch({ ...github("krizaka/blog", HEAD, 25), ...github("krizaka/akinaza", HEAD, 25) });
  const report = await run(w, fetch);
  assert.deepEqual(report.missing.map((m) => m.app), ["blog"]);
  assert.deepEqual(report.ok.map((m) => m.app), ["akinaza"]);
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
  const w = world({ apps: [app("orazaka-dev", "krizaka/orazaka", { deploy_on_push: undefined })], deployments: { "id-orazaka-dev": [deployment(OLD)] } });
  const report = await run(w, fakeFetch(github("krizaka/orazaka", HEAD, 90)));
  assert.equal(report.missing.length, 0);
  assert.equal(report.manual[0].app, "orazaka-dev");
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
