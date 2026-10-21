// The real CLI as a subprocess, with a scripted `doctl` first on the PATH and a local HTTPS-less stand-in for the site.
import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createSecretProvider } from "../lib/secrets.mjs";
import { loadConfig } from "../lib/config.mjs";

const CLI = new URL("../bin/krizaka-deploy.mjs", import.meta.url).pathname;

function sandbox({ team = "Krizaka-team" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kd-"));
  const log = join(dir, "doctl.log");
  const spec = { name: "demo", services: [{ name: "web", envs: [{ key: "APP_SEARCH_INDEXING", value: "off" }] }] };
  writeFileSync(join(dir, "app.json"), JSON.stringify([{ id: "app-1", spec: { name: "demo" }, active_deployment: { id: "prev-9", services: [{ source_commit_hash: "abc" }] } }]));
  writeFileSync(join(dir, "spec.json"), JSON.stringify(spec));
  // A doctl that records its arguments and answers the few calls a dry run makes.
  writeFileSync(
    join(dir, "doctl"),
    `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, args.join(" ") + "\\n");
const key = args.slice(2, 4).join(" ");
const app = JSON.parse(fs.readFileSync(${JSON.stringify(join(dir, "app.json"))}, "utf8"))[0];
app.spec = JSON.parse(fs.readFileSync(${JSON.stringify(join(dir, "spec.json"))}, "utf8"));
if (key === "account get") console.log(JSON.stringify([{ team: { name: ${JSON.stringify(team)} } }]));
else if (key === "apps list") console.log(JSON.stringify([{ id: "app-1", spec: { name: "demo" } }]));
else if (key === "apps get") console.log(JSON.stringify([app]));
else { console.error("unscripted: " + args.join(" ")); process.exit(9); }
`,
  );
  chmodSync(join(dir, "doctl"), 0o755);
  return { dir, log: () => readFileSync(log, "utf8").trim().split("\n") };
}

function runCli(args, { dir, env = {} }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd: dir, env: { PATH: `${dir}:${process.env.PATH}`, HOME: dir, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

// The CLI insists on https for the site (a real deployment is never plain http); the live-check part is covered with
// fetch mocks in checks.test.mjs. Here the subprocess proves the guards and that --dry-run changes nothing.
const config = (dir) => {
  writeFileSync(join(dir, ".krizaka-deploy.json"), JSON.stringify({ app: "demo", url: "https://127.0.0.1:1", health: "/health", indexing: "off" }));
};

test("cli: refuses a doctl context other than default, before any doctl call", async () => {
  const sb = sandbox();
  config(sb.dir);
  const r = await runCli(["deploy", "--dry-run"], { dir: sb.dir, env: { DIGITALOCEAN_CONTEXT: "erika" } });
  assert.equal(r.code, 1);
  assert.match(r.out, /REFUSED \[context\].*'erika'/);
  assert.throws(() => sb.log(), /ENOENT/, "doctl was never called");
});

test("cli: refuses credentials of another team", async () => {
  const sb = sandbox({ team: "Erika" });
  config(sb.dir);
  const r = await runCli(["deploy", "--dry-run"], { dir: sb.dir });
  assert.equal(r.code, 1);
  assert.match(r.out, /REFUSED \[team\]/);
  assert.ok(sb.log().every((l) => l.startsWith("--context default ")), "every doctl call named the context");
});

test("cli: a dry run reads, never writes (every doctl call is a read, always in the default context)", async () => {
  const sb = sandbox();
  config(sb.dir);
  // One attempt, no wait: the unreachable site must not cost the 12 x 10 s of a real deploy (118 s -> ~6 s).
  const r = await runCli(["deploy", "--dry-run", "--health-attempts", "1", "--health-delay-ms", "0"], { dir: sb.dir });
  // The site is unreachable on purpose (127.0.0.1:1): the dry run gets as far as the live checks, having changed nothing.
  assert.equal(r.code, 1);
  assert.match(r.out, /\[dry-run\] create-deployment: would run with --force-rebuild/);
  const calls = sb.log();
  assert.ok(calls.every((l) => l.startsWith("--context default ")));
  assert.ok(!calls.some((l) => /create-deployment| update |spec validate/.test(l)), calls.join("\n"));
  assert.match(r.out, /previous deployment: prev-9/);
});

test("cli: the configuration must say whether the site is indexed", async () => {
  const sb = sandbox();
  writeFileSync(join(sb.dir, ".krizaka-deploy.json"), JSON.stringify({ app: "demo", url: "https://x.example", health: "/h" }));
  const r = await runCli(["deploy", "--dry-run"], { dir: sb.dir });
  assert.equal(r.code, 1);
  assert.match(r.out, /"indexing" must be "on"/);
});

test("secrets: the environment first, then the vault tool; a missing key is undefined and nothing is printed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kd-secret-"));
  const tool = join(dir, "secret.sh");
  writeFileSync(tool, '#!/bin/sh\n[ "$1" = "@demo" ] && [ "$2" = "VAULT_KEY" ] && echo "from-vault"\nexit 0\n');
  chmodSync(tool, 0o755);
  const secret = createSecretProvider({ env: { KRIZAKA_SECRET_ENV_KEY: "from-env" }, product: "demo", tool });
  assert.equal(await secret("ENV_KEY"), "from-env");
  assert.equal(await secret("VAULT_KEY"), "from-vault");
  assert.equal(await secret("NOPE"), undefined);
  const noProduct = createSecretProvider({ env: {}, product: null, tool });
  assert.equal(await noProduct("VAULT_KEY"), undefined);
});

test("config: loads a file and resolves the health path against the site", () => {
  const dir = mkdtempSync(join(tmpdir(), "kd-config-"));
  writeFileSync(join(dir, "c.json"), JSON.stringify({ app: "a", url: "https://x.example/", health: "/h", indexing: "on", indexingVariable: false }));
  const c = loadConfig(join(dir, "c.json"));
  assert.equal(c.health, "https://x.example/h");
  assert.equal(c.indexingVariable, false);
  assert.throws(() => loadConfig(join(dir, "missing.json")), /cannot read/);
});

