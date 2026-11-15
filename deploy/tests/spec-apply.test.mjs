// The CI door that applies a merged spec to a dev app (krizaka-internal#3879): the diff it prints names keys, never a value; an apply keeps
// the live secrets; a dry run writes nothing; an app the registry (deploy/apps.json) does not list, or lists for another team, is refused.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deploy } from "../lib/deploy.mjs";
import { applyTarget, specChanges } from "../lib/spec-apply.mjs";
import { GuardError } from "../lib/errors.mjs";
import { createSecretProvider } from "../lib/secrets.mjs";
import { baseConfig, fakeDoctl, fakeFetch, head, ROBOTS_ON } from "./helpers.mjs";

const site = () => fakeFetch({ "/api/health": { status: 200 }, "/robots.txt": { body: ROBOTS_ON }, ...head() });
const verbs = (calls) => calls.map((c) => c.args.slice(0, 2).join(" "));
const registry = JSON.parse(readFileSync(new URL("../apps.json", import.meta.url), "utf8"));

// The verikora-dev incident (krizaka-internal#3878): the file has a plain key the live app lacks, the live app holds an encrypted secret.
const SECRET_VALUE = "EV[1:ciphertext-a]";
const fileSpec = [
  "name: krizaka-com",
  "services:",
  "  - name: web",
  "    github: { repo: krizaka/krizaka-com, branch: main, deploy_on_push: true }",
  "    envs:",
  "      - { key: NEXT_PUBLIC_MEDIA_CDN_URL, scope: RUN_AND_BUILD_TIME, value: https://krizaka-assets.b-cdn.net }",
  "      - { key: MAIL_API_KEY, scope: RUN_TIME, type: SECRET }",
  "      - { key: MAIL_DOMAIN, scope: RUN_TIME, value: mg.krizaka.com }",
  "      - { key: MEDIA_DOCUMENTS_TENANT, scope: RUN_TIME, value: tenant-value-from-the-file }",
  "",
].join("\n");

async function run(options) {
  const { doctl, calls } = fakeDoctl();
  const lines = [];
  const report = await deploy(baseConfig(), { apply: true, ...options }, { doctl, fetch: site(), readFile: async () => fileSpec, log: (l) => lines.push(l), sleep: async () => {} });
  return { report, calls, out: lines.join("\n") };
}

test("spec-apply --dry-run: prints the diff by key, writes nothing, never prints a value", async () => {
  const { calls, out, report } = await run({ dryRun: true });
  assert.ok(!verbs(calls).some((v) => ["apps update", "apps create-deployment"].includes(v)), "no mutating doctl call in a dry run");
  assert.match(out, /\+ services\/web:MEDIA_DOCUMENTS_TENANT \(added\)/);
  assert.ok(report.steps.some((s) => s.name === "diff" && /1 change/.test(s.detail)), "the diff is a step of the report (the job summary)");
  assert.ok(!out.includes(SECRET_VALUE), "the live secret's value is never printed");
  assert.ok(!out.includes("tenant-value-from-the-file"), "a value is never printed, only its key");
  assert.doesNotMatch(out, /mg\.krizaka\.com/, "a carried value is never printed");
});

test("spec-apply: the apply sends the live encrypted secret back and adds the missing key", async () => {
  const { calls } = await run({});
  const update = calls.find((c) => c.args[1] === "update");
  assert.ok(update, "the spec is applied");
  const sent = JSON.parse(update.input);
  const envs = new Map(sent.services[0].envs.map((e) => [e.key, e]));
  assert.equal(envs.get("MAIL_API_KEY").value, SECRET_VALUE, "the live secret is kept");
  assert.equal(envs.get("MEDIA_DOCUMENTS_TENANT").value, "tenant-value-from-the-file");
  assert.ok(verbs(calls).indexOf("apps update") < verbs(calls).indexOf("apps create-deployment"), "applied, then rebuilt and waited for ACTIVE");
});

test("specChanges: added, removed, changed (secret or plain) and structure, by key only", () => {
  const live = {
    name: "a",
    domains: [{ domain: "a.example" }],
    services: [{ name: "web", instance_size_slug: "s", envs: [{ key: "A", value: "1" }, { key: "B", value: "2" }, { key: "S", type: "SECRET", value: "EV[old]" }] }],
    workers: [{ name: "old" }],
  };
  const next = {
    name: "a",
    domains: [{ domain: "b.example" }],
    services: [{ name: "web", instance_size_slug: "m", envs: [{ key: "A", value: "9", scope: "RUN_TIME" }, { key: "C", value: "3" }, { key: "S", type: "SECRET", value: "plain-new-secret" }] }],
    jobs: [{ name: "migrate" }],
  };
  const lines = specChanges(next, live);
  assert.deepEqual(lines, [
    "~ domains",
    "~ services/web: instance_size_slug",
    "~ services/web:A (changed)",
    "~ services/web:A: scope",
    "+ services/web:C (added)",
    "~ services/web:S (secret replaced)",
    "- services/web:B (removed)",
    "- workers/old (component removed)",
    "+ jobs/migrate (component added)",
  ]);
  assert.ok(!lines.join("\n").includes("plain-new-secret") && !lines.join("\n").includes("EV[old]"));
  assert.deepEqual(specChanges(live, structuredClone(live)), []);
});

test("applyTarget: a listed dev app whose configuration names its registered spec is the target", () => {
  const config = baseConfig({ app: "verikora-dev", spec: "deploy/digitalocean/dev.app.yaml" });
  assert.deepEqual(applyTarget(registry, "verikora-dev", config), { app: "verikora-dev", repo: "krizaka/verikora", spec: "deploy/digitalocean/dev.app.yaml" });
});

test("applyTarget: an app missing from the spec set (deploy/apps.json) is refused", () => {
  const config = baseConfig({ app: "verikora-staging", spec: "deploy/digitalocean/dev.app.yaml" });
  assert.throws(() => applyTarget(registry, "verikora-staging", config), (e) => e instanceof GuardError && e.guard === "registry" && /not listed/.test(e.message));
});

test("applyTarget: a production app (krizaka-prod) is refused: the door is for the dev apps only", () => {
  const prod = registry.apps.find((a) => a.team === "krizaka-prod");
  const config = baseConfig({ app: prod.app, spec: prod.spec });
  assert.throws(() => applyTarget(registry, prod.app, config), (e) => e.guard === "registry" && /krizaka-prod/.test(e.message));
});

test("applyTarget: a configuration that names another app or another spec file is refused", () => {
  const other = baseConfig({ app: "folioviv-dev", spec: "deploy/digitalocean/dev.app.yaml" });
  assert.throws(() => applyTarget(registry, "verikora-dev", other), (e) => e.guard === "registry" && /folioviv-dev/.test(e.message));
  const wrongSpec = baseConfig({ app: "verikora-dev", spec: "deploy/digitalocean/other.app.yaml" });
  assert.throws(() => applyTarget(registry, "verikora-dev", wrongSpec), (e) => e.guard === "registry" && /other\.app\.yaml/.test(e.message));
});

test("the workflow: dispatched only, in the dev environment, the dry run before the apply, both through the registry guard", () => {
  const text = readFileSync(new URL("../../.github/workflows/deploy-spec-apply.yml", import.meta.url), "utf8");
  const on = text.slice(text.indexOf("\non:"), text.indexOf("\npermissions:"));
  assert.doesNotMatch(on, /pull_request|workflow_call|push:|schedule/, "no trigger a pull request or a caller's code can reach");
  assert.match(text, /^permissions: \{\}$/m);
  assert.match(text, /^ {4}environment: dev$/m);
  const calls = text.split("\n").filter((l) => l.includes("krizaka-deploy.mjs deploy"));
  assert.equal(calls.length, 2);
  assert.ok(calls.every((l) => l.includes('--app "$APP"') && l.includes("--apply")));
  assert.ok(calls[0].includes("--dry-run") && !calls[1].includes("--dry-run"), "the dry run comes first");
  assert.doesNotMatch(text, /run: .*\$\{\{/, "no expression inside a run line");
});

test("spec-apply --only: the listed component comes from the file, every other one stays as it runs (a founder-gated job is not applied)", async () => {
  const { doctl, calls } = fakeDoctl();
  const withJob = `${fileSpec}jobs:\n  - name: backup\n    envs:\n      - { key: BACKUP_AGE_RECIPIENT, scope: RUN_TIME, type: SECRET, value: "__BACKUP_AGE_RECIPIENT__" }\n`;
  const deps = { doctl, fetch: site(), readFile: async () => withJob, log: () => {}, sleep: async () => {} };
  await assert.rejects(deploy(baseConfig(), { apply: true, dryRun: true }, deps), (e) => e.guard === "secrets" && /BACKUP_AGE_RECIPIENT/.test(e.message), "the whole file needs the job's secret");
  await deploy(baseConfig(), { apply: true, only: ["services/web"] }, deps);
  const sent = JSON.parse(calls.find((c) => c.args[1] === "update").input);
  assert.equal(sent.jobs, undefined, "the job the file adds is not applied");
  assert.ok(sent.services[0].envs.some((e) => e.key === "MEDIA_DOCUMENTS_TENANT"), "the listed component is the file's");
  assert.equal(sent.services[0].envs.find((e) => e.key === "MAIL_API_KEY").value, SECRET_VALUE, "its live secret is kept");
});

test("spec-apply --only: a component the file does not have is refused", async () => {
  const { doctl } = fakeDoctl();
  const deps = { doctl, fetch: site(), readFile: async () => fileSpec, log: () => {}, sleep: async () => {} };
  await assert.rejects(deploy(baseConfig(), { apply: true, dryRun: true, only: ["workers/ghost"] }, deps), (e) => e.guard === "only" && /workers\/ghost/.test(e.message));
});

test("spec-apply --dry-run: a live check that fails is reported, not fatal: it checks the deployment the apply replaces", async () => {
  const { doctl, calls } = fakeDoctl();
  const closed = fakeFetch({ "/api/health": { status: 200 }, "/robots.txt": { body: "User-agent: *\nDisallow: /\n" } });
  const lines = [];
  const report = await deploy(baseConfig(), { apply: true, dryRun: true }, { doctl, fetch: closed, readFile: async () => fileSpec, log: (l) => lines.push(l), sleep: async () => {} });
  assert.ok(report.steps.some((s) => s.name === "live checks" && /robots/.test(s.detail)), "the failure is in the report");
  assert.ok(!verbs(calls).includes("apps update"), "still a dry run");
  // After a real deploy the same failure is fatal.
  const real = fakeDoctl();
  await assert.rejects(deploy(baseConfig(), { apply: true, skipHeadCheck: true }, { doctl: real.doctl, fetch: closed, readFile: async () => fileSpec, log: () => {}, sleep: async () => {} }), (e) => e.guard === "robots");
});

test("config liveIndexing: the host's answer is checked apart from the spec's flag (verikora-dev: flag on, dev host closed by host)", async () => {
  const { validateConfig } = await import("../lib/config.mjs");
  const raw = { app: "verikora-dev", url: "https://dev.verikora.com", health: "/api/healthz", indexing: "on" };
  assert.equal(validateConfig(raw).liveIndexing, "on", "defaults to indexing");
  assert.equal(validateConfig({ ...raw, liveIndexing: "off" }).liveIndexing, "off");
  assert.throws(() => validateConfig({ ...raw, liveIndexing: "maybe" }), /"liveIndexing"/);
  const { doctl } = fakeDoctl();
  const devHost = fakeFetch({
    "/api/healthz": { status: 200, headers: { "x-robots-tag": "noindex" } },
    "/robots.txt": { body: "User-agent: *\nDisallow: /\n", headers: { "x-robots-tag": "noindex" } },
    "/": { status: 308, headers: { location: "https://www.verikora.com/" } },
  });
  const config = baseConfig({ url: "https://dev.verikora.com", health: "https://dev.verikora.com/api/healthz", liveIndexing: "off" });
  const report = await deploy(config, { skipHeadCheck: true }, { doctl, fetch: devHost, log: () => {}, sleep: async () => {} });
  assert.ok(report.steps.some((s) => s.name === "robots" && /noindex/.test(s.detail)), "the closed dev host passes the off checks");
});

test("the workflow: the dry run and the apply carry KRIZAKA_SECRET_BACKUP_AGE_RECIPIENT, and no other step does (krizaka-internal#3879)", () => {
  const text = readFileSync(new URL("../../.github/workflows/deploy-spec-apply.yml", import.meta.url), "utf8");
  const steps = text.split(/\n {6}- /).slice(1);
  const carrying = steps.filter((s) => s.includes("KRIZAKA_SECRET_BACKUP_AGE_RECIPIENT"));
  assert.deepEqual(carrying.map((s) => s.split("\n")[0].replace(/^name: /, "")), ["Dry run (what the apply changes)", "Apply, rebuild main, wait for ACTIVE"]);
  for (const s of carrying) assert.match(s, /KRIZAKA_SECRET_BACKUP_AGE_RECIPIENT: \$\{\{ secrets\.KRIZAKA_SECRET_BACKUP_AGE_RECIPIENT \}\}/);
  assert.doesNotMatch(text, /echo .*BACKUP_AGE_RECIPIENT/, "the value is never printed");
});

test("spec-apply: the recipient comes from the environment variable of the job, and a missing one is refused without a value", async () => {
  const withJob = `${fileSpec}jobs:\n  - name: backup\n    envs:\n      - { key: BACKUP_AGE_RECIPIENT, scope: RUN_TIME, type: SECRET, value: "__BACKUP_AGE_RECIPIENT__" }\n`;
  const RECIPIENT = "age1recipientpublickeyforthetestonly0000000000000000000000000000000";
  const run1 = async (env) => {
    const { doctl, calls } = fakeDoctl();
    const lines = [];
    const secret = createSecretProvider({ env, tool: "/nonexistent" });
    const deps = { doctl, fetch: site(), readFile: async () => withJob, log: (l) => lines.push(l), sleep: async () => {}, secret };
    return { deps, calls, lines };
  };
  const ok = await run1({ KRIZAKA_SECRET_BACKUP_AGE_RECIPIENT: RECIPIENT });
  await deploy(baseConfig(), { apply: true }, ok.deps);
  const sent = JSON.parse(ok.calls.find((c) => c.args[1] === "update").input);
  assert.equal(sent.jobs[0].envs[0].value, RECIPIENT, "the job gets the recipient");
  assert.ok(!ok.lines.join("\n").includes(RECIPIENT), "never printed");
  const missing = await run1({});
  await assert.rejects(deploy(baseConfig(), { apply: true }, missing.deps), (e) => e.guard === "secrets" && /BACKUP_AGE_RECIPIENT/.test(e.message));
  assert.ok(!missing.calls.some((c) => c.args[1] === "update"), "nothing is applied");
});
