// The deploy flow end to end with doctl and HTTP mocked: order of the calls, the wait, the commit guard, dry-run, rollback note.
import test from "node:test";
import assert from "node:assert/strict";
import { deploy, waitActive, commitsOf, rollbackNote } from "../lib/deploy.mjs";
import { GuardError } from "../lib/errors.mjs";
import { SHA, APP_ID, baseConfig, fakeDoctl, fakeFetch, head, ROBOTS_ON } from "./helpers.mjs";

const site = (sha = SHA) => fakeFetch({ "/api/health": { status: 200 }, "/robots.txt": { body: ROBOTS_ON }, ...head(sha) });
const quiet = { log: () => {}, sleep: async () => {} };
const verbs = (calls) => calls.map((c) => c.args.slice(0, 2).join(" "));

test("deploy: force-rebuild, wait for ACTIVE, verify the commit and the checks, leave a rollback note", async () => {
  const { doctl, calls } = fakeDoctl();
  const report = await deploy(baseConfig(), { expectSha: SHA }, { doctl, fetch: site(), ...quiet });
  const order = verbs(calls);
  assert.ok(order.indexOf("apps create-deployment") > order.indexOf("apps get"), "create-deployment follows the reads");
  assert.ok(!order.includes("apps update"), "no spec change without --apply");
  const create = calls.find((c) => c.args[1] === "create-deployment");
  assert.ok(create.args.includes("--force-rebuild"), "always --force-rebuild");
  assert.ok(order.filter((v) => v === "apps get-deployment").length >= 4, "it waited through the phases");
  assert.equal(report.deployment.id, "new-1");
  assert.equal(report.deployment.commit, SHA);
  assert.equal(report.previous.id, "prev-1");
  assert.match(report.rollback, /previous deployment prev-1 \(commit aaaaaaaa/);
  assert.match(report.rollback, new RegExp(`/v2/apps/${APP_ID}/rollback`));
});

test("deploy --apply: validate, then apply, then force-rebuild — in that order, the secrets carried over", async () => {
  const { doctl, calls } = fakeDoctl();
  const fileSpec = "name: krizaka-com\nservices:\n  - name: web\n    envs:\n      - key: MAIL_API_KEY\n        type: SECRET\n      - key: MAIL_DOMAIN\n      - key: NEXT_PUBLIC_MEDIA_CDN_URL\n        value: https://krizaka-assets.b-cdn.net\n";
  await deploy(baseConfig(), { apply: true }, { doctl, fetch: site(), readFile: async () => fileSpec, ...quiet });
  const order = verbs(calls);
  assert.ok(order.indexOf("apps spec") < order.indexOf("apps update"), "validated before applied");
  assert.ok(order.indexOf("apps update") < order.indexOf("apps create-deployment"), "applied before the rebuild");
  const update = calls.find((c) => c.args[1] === "update");
  assert.match(update.input, /EV\[1:ciphertext-a\]/, "the encrypted live value is sent back, not blanked");
  assert.match(update.input, /mg\.krizaka\.com/);
});

test("deploy --apply sends JSON: 'off' stays a string for doctl's YAML 1.1 parser", async () => {
  const live = { name: "x", services: [{ name: "web", envs: [{ key: "APP_SEARCH_INDEXING", value: "off" }] }] };
  const { doctl, calls } = fakeDoctl({ spec: live });
  const file = "name: x\nservices:\n  - name: web\n    envs:\n      - key: APP_SEARCH_INDEXING\n        value: 'off'\n";
  const config = baseConfig({ indexing: "off", indexingVariable: true, url: "https://dev.krizaka.com", health: "https://dev.krizaka.com/api/health" });
  const noindex = { "x-robots-tag": "noindex" };
  const fetch = fakeFetch({ "/api/health": { status: 200, headers: noindex }, "/robots.txt": { body: "User-agent: *\nDisallow: /\n", headers: noindex }, "/": { status: 308, headers: { location: "https://www.krizaka.com/" } } });
  await deploy(config, { apply: true }, { doctl, fetch, readFile: async () => file, ...quiet });
  const sent = calls.find((c) => c.args[1] === "update").input;
  assert.doesNotThrow(() => JSON.parse(sent));
  assert.match(sent, /"value": "off"/);
});

test("deploy --dry-run: guards and checks run, nothing is changed", async () => {
  const { doctl, calls } = fakeDoctl();
  const fileSpec = "name: krizaka-com\nservices:\n  - name: web\n    envs:\n      - key: MAIL_API_KEY\n        type: SECRET\n      - key: MAIL_DOMAIN\n      - key: NEXT_PUBLIC_MEDIA_CDN_URL\n        value: https://krizaka-assets.b-cdn.net\n";
  const fetch = site();
  const report = await deploy(baseConfig(), { dryRun: true, apply: true }, { doctl, fetch, readFile: async () => fileSpec, ...quiet });
  assert.ok(!verbs(calls).some((v) => ["apps update", "apps create-deployment"].includes(v)), "no mutating call");
  assert.ok(fetch.calls.some((u) => u.endsWith("/api/health")), "the live site is still checked");
  assert.equal(report.deployment, undefined);
  assert.equal(report.previous.id, "prev-1", "the rollback target is recorded even in a dry run");
});

test("deploy: a deployment that ends in ERROR fails and the checks never run", async () => {
  const { doctl } = fakeDoctl({ phases: ["BUILDING", "ERROR"] });
  const fetch = site();
  await assert.rejects(deploy(baseConfig(), {}, { doctl, fetch, ...quiet }), (e) => e instanceof GuardError && e.guard === "deployment" && /ERROR/.test(e.message));
  assert.equal(fetch.calls.length, 0);
});

test("deploy: SUPERSEDED and a timeout are failures too", async () => {
  const a = fakeDoctl({ phases: ["SUPERSEDED"] });
  await assert.rejects(waitActive(a.doctl, APP_ID, "new-1", { timeoutMs: 1000, sleep: async () => {} }), /SUPERSEDED/);
  const b = fakeDoctl({ phases: ["BUILDING"] });
  let t = 0;
  await assert.rejects(waitActive(b.doctl, APP_ID, "new-1", { timeoutMs: 60_000, pollMs: 30_000, sleep: async () => {}, now: () => (t += 40_000) }), /still BUILDING/);
});

test("deploy: refuses when the ACTIVE deployment is not the expected commit (the old image served)", async () => {
  const { doctl } = fakeDoctl({ commit: "bbbbbbbb" });
  await assert.rejects(deploy(baseConfig(), { expectSha: SHA }, { doctl, fetch: site(), ...quiet }), (e) => e.guard === "commit");
});

test("deploy: refuses when the live spec flipped to the wrong indexing during the deploy", async () => {
  const flipped = { name: "x", services: [{ name: "web", envs: [{ key: "APP_SEARCH_INDEXING", value: "off" }] }] };
  const ok = { name: "x", services: [{ name: "web", envs: [{ key: "APP_SEARCH_INDEXING", value: "on" }] }] };
  const { doctl } = fakeDoctl({ spec: ok, specAfter: flipped });
  await assert.rejects(deploy(baseConfig({ indexingVariable: true }), {}, { doctl, fetch: site(), ...quiet }), (e) => e.guard === "indexing" && /after the deploy/.test(e.message));
});

test("deploy: a failing live check fails the deploy and names the rollback target", async () => {
  const { doctl } = fakeDoctl();
  const fetch = fakeFetch({ "/api/health": { status: 200 }, "/robots.txt": { body: "User-agent: *\nDisallow: /\n" }, ...head() });
  const lines = [];
  await assert.rejects(deploy(baseConfig(), {}, { doctl, fetch, log: (m) => lines.push(m), sleep: async () => {} }), (e) => e.guard === "robots");
  assert.ok(lines.some((l) => /previous deployment prev-1/.test(l)), "the rollback note is printed on failure");
});

test("deploy: the SEO family script runs from the repository root when configured", async () => {
  const { doctl } = fakeDoctl();
  const seen = [];
  const config = baseConfig({ seoFamily: { script: "scripts/check-seo-family.mjs", args: ["--organization"] } });
  await deploy(config, {}, { doctl, fetch: site(), spawnCheck: async (args, o) => (seen.push([args, o.cwd]), { code: 0, log: "" }), ...quiet });
  assert.equal(seen[0][1], "/repo");
  assert.equal(seen[0][0][0], "scripts/check-seo-family.mjs");
  assert.deepEqual(seen[0][0].slice(-3), ["--index", "on", "--organization"], "the configuration's indexing reaches the family check");
});

test("rollback note: names the previous deployment and its commit, or says there is none", () => {
  assert.match(rollbackNote({ app: "a", appId: "id", previous: { id: "p", commit: "c0ffee" } }), /p \(commit c0ffee\)/);
  assert.match(rollbackNote({ app: "a", appId: "id", previous: null }), /no previous ACTIVE deployment/);
  assert.deepEqual(commitsOf({ services: [{ source_commit_hash: "x" }, { source_commit_hash: "x" }] }), ["x"]);
});

test("head check: a force-rebuild that built a stale commit fails loudly even without --expect-sha", async () => {
  const OLD = "a".repeat(40);
  const { doctl } = fakeDoctl({ commit: OLD });
  await assert.rejects(deploy(baseConfig(), {}, { doctl, fetch: site(), ...quiet }), (e) => e.guard === "commit" && e.message.includes(OLD.slice(0, 10)) && e.message.includes(SHA.slice(0, 10)) && /apply/.test(e.message));
});

test("head check: the build log's checkout is read too — a cached clone is caught when the API still names the head", async () => {
  const OLD = "b".repeat(40);
  const { doctl, calls } = fakeDoctl({ buildLogSha: OLD });
  await assert.rejects(deploy(baseConfig(), {}, { doctl, fetch: site(), ...quiet }), (e) => e.guard === "commit" && /build log/.test(e.message) && e.message.includes(OLD.slice(0, 10)));
  const logs = calls.find((c) => c.args[1] === "logs");
  assert.ok(logs.args.includes("build") && logs.args.includes("new-1"), "the build log of this deployment");
});

test("head check: an empty build log, an unreadable head or a push cause naming another commit all fail", async () => {
  await assert.rejects(deploy(baseConfig(), {}, { doctl: fakeDoctl({ noLog: true }).doctl, fetch: site(), ...quiet }), (e) => e.guard === "commit" && /build log/.test(e.message));
  const noHead = fakeFetch({ "/api/health": { status: 200 }, "/robots.txt": { body: ROBOTS_ON } });
  await assert.rejects(deploy(baseConfig(), {}, { doctl: fakeDoctl().doctl, fetch: noHead, ...quiet }), (e) => e.guard === "commit" && /head of krizaka\/krizaka-com/.test(e.message));
  const cause = { type: "DEPLOY_ON_PUSH", git_push: { commit_sha: "c".repeat(40) } };
  await assert.rejects(deploy(baseConfig(), {}, { doctl: fakeDoctl({ cause }).doctl, fetch: site(), ...quiet }), (e) => e.guard === "commit" && /cause/.test(e.message));
});

test("head check: it passes when the deployment, its build log and main's head agree, and --skip-head-check is explicit", async () => {
  const report = await deploy(baseConfig(), {}, { doctl: fakeDoctl().doctl, fetch: site(), ...quiet });
  assert.ok(report.steps.some((s) => s.name === "head" && s.detail.includes(SHA.slice(0, 10))));
  const stale = fakeDoctl({ commit: "d".repeat(40) });
  const r = await deploy(baseConfig(), { skipHeadCheck: true }, { doctl: stale.doctl, fetch: site(), ...quiet });
  assert.ok(r.steps.some((s) => s.name === "head" && /skipped/.test(s.detail)));
});

test("head check: each component is held to the head of its own repository", async () => {
  const { verifyRunningHead } = await import("../lib/head.mjs");
  const spec = { services: [{ name: "core", github: { repo: "krizaka/orazaka", branch: "main" } }, { name: "web", github: { repo: "krizaka/orazaka-web-client", branch: "main" } }] };
  const deployment = { id: "d1", services: [{ name: "core", source_commit_hash: "1".repeat(40) }, { name: "web", source_commit_hash: "2".repeat(40) }] };
  const f = (a, b) => fakeFetch({ "https://api.github.com/repos/krizaka/orazaka/commits/main": { body: a }, "https://api.github.com/repos/krizaka/orazaka-web-client/commits/main": { body: b } });
  const doctl = { run: async () => `x => Checking out commit "${"1".repeat(40)}"\nx => Checking out commit "${"2".repeat(40)}"\n` };
  assert.equal((await verifyRunningHead({ doctl, fetch: f("1".repeat(40), "2".repeat(40)), appId: "a", deployment, spec })).length, 2);
  await assert.rejects(verifyRunningHead({ doctl, fetch: f("1".repeat(40), "3".repeat(40)), appId: "a", deployment, spec }), (e) => /web/.test(e.message));
});
