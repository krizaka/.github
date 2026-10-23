// The reusable tauri-macos.yml keeps secrets away from pull requests. Parses the workflow text, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const text = readFileSync(new URL("../.github/workflows/tauri-macos.yml", import.meta.url), "utf8");
const jobsText = text.slice(text.indexOf("\njobs:\n"));
const jobs = {};
for (const chunk of jobsText.split(/^  (?=[\w-]+:$)/m).slice(1)) jobs[chunk.slice(0, chunk.indexOf(":"))] = chunk;
const header = text.slice(0, text.indexOf("\njobs:\n"));

test("secrets are declared by name, each required: false, never inherited", () => {
  const block = header.slice(header.indexOf("    secrets:\n"), header.indexOf("\npermissions:"));
  const names = [...block.matchAll(/^      (APPLE_\w+):\n        required: false$/gm)].map((m) => m[1]);
  assert.ok(names.length >= 7);
  assert.equal([...block.matchAll(/required:/g)].length, names.length);
  assert.doesNotMatch(text, /secrets:\s*inherit/);
});

test("sign defaults to false", () => {
  assert.match(header, /sign:\n(?:        .*\n)*?        type: boolean\n        default: false/);
});

test("no step of PR mode references a secret", () => {
  const prJobs = Object.entries(jobs).filter(([n]) => !["release", "guard", "gate"].includes(n));
  assert.ok(prJobs.length >= 2);
  for (const [name, body] of prJobs) assert.doesNotMatch(body, /secrets\./, `job ${name}`);
  assert.doesNotMatch(jobs.check, /environment:/);
});

test("PR mode builds the app unsigned with the target toolchain", () => {
  assert.match(jobs["build-unsigned"], /if: \$\{\{ !inputs\.sign \}\}/);
  assert.match(jobs["build-unsigned"], /targets: aarch64-apple-darwin/);
  assert.match(jobs["build-unsigned"], /pnpm install --frozen-lockfile/);
  assert.match(jobs["build-unsigned"], /pnpm run "\$BUILD"/);
  assert.doesNotMatch(jobs["build-unsigned"], /secrets\./);
});

test("the guard only reads whether a secret exists, and fails on one", () => {
  assert.match(jobs.guard, /if: \$\{\{ !inputs\.sign \}\}/);
  for (const m of jobs.guard.matchAll(/\$\{\{[^}]*\}\}/g)) {
    for (const ref of m[0].matchAll(/secrets\.\w+(?: != '')?/g)) assert.match(ref[0], / != ''$/);
  }
  assert.match(jobs.guard, /exit 1/);
});

function runScript(script, vars) {
  const dir = mkdtempSync(join(tmpdir(), "tauri-workflow-"));
  const file = join(dir, "output");
  writeFileSync(file, "");
  try {
    execFileSync("bash", ["-c", script], {
      env: { PATH: process.env.PATH, GITHUB_OUTPUT: file, ...vars },
      stdio: "pipe",
    });
    return 0;
  } catch (error) {
    return error.status;
  }
}

function runBlock(name, stepName, vars) {
  const lines = jobs[name].split("\n");
  const start = lines.findIndex((line) => line.includes(`- name: ${stepName}`));
  assert.ok(start >= 0, `${name}: ${stepName} step found`);
  const run = lines.findIndex((line, i) => i > start && line.trim() === "run: |");
  assert.ok(run > start, `${name}: ${stepName} script found`);
  const body = [];
  for (const line of lines.slice(run + 1)) {
    if (line.trim() && !line.startsWith("          ")) break;
    body.push(line.slice(10));
  }
  return runScript(body.join("\n"), vars);
}

test("release mode refuses unapproved events and refs and runs in the release environment", () => {
  assert.match(jobs.gate, /if: \$\{\{ inputs\.sign \}\}/);
  assert.match(jobs.gate, /github\.event_name/);
  assert.match(jobs.gate, /github\.ref/);
  assert.equal(runBlock("gate", "Refuse to sign outside a push to main or a tag", { EVENT: "push", REF: "refs/heads/main" }), 0);
  assert.equal(runBlock("gate", "Refuse to sign outside a push to main or a tag", { EVENT: "push", REF: "refs/tags/v1.2.3" }), 0);
  for (const vars of [
    { EVENT: "pull_request", REF: "refs/heads/main" },
    { EVENT: "workflow_dispatch", REF: "refs/heads/main" },
    { EVENT: "push", REF: "refs/heads/feature" },
  ]) assert.equal(runBlock("gate", "Refuse to sign outside a push to main or a tag", vars), 1);
  assert.match(jobs.release, /if: \$\{\{ inputs\.sign \}\}/);
  assert.match(jobs.release, /needs: \[gate, check\]/);
  assert.match(jobs.release, /environment: release/);
  assert.doesNotMatch(jobs.gate, /secrets\./);
});

test("signed releases require every signing and notarisation credential", () => {
  assert.match(jobs.release, /name: Validate signing and notarisation credentials/);
  const signingReady = jobs.release.match(/SIGNING_READY: (.+)/)[1];
  const notarizationReady = jobs.release.match(/NOTARIZATION_READY: (.+)/)[1];
  for (const name of ["APPLE_CERTIFICATE", "APPLE_CERTIFICATE_PASSWORD", "APPLE_SIGNING_IDENTITY"]) {
    assert.ok(signingReady.includes(`secrets.${name} != ''`), `${name} is required for signing`);
  }
  for (const name of ["APPLE_API_ISSUER", "APPLE_API_KEY", "APPLE_API_KEY_P8", "APPLE_TEAM_ID"]) {
    assert.ok(notarizationReady.includes(`secrets.${name} != ''`), `${name} is required for notarisation`);
  }
  assert.equal(runBlock("release", "Validate signing and notarisation credentials", {
    SIGNING_READY: "true", NOTARIZATION_READY: "true",
  }), 0);
  assert.equal(runBlock("release", "Validate signing and notarisation credentials", {
    SIGNING_READY: "false", NOTARIZATION_READY: "true",
  }), 1);
  assert.equal(runBlock("release", "Validate signing and notarisation credentials", {
    SIGNING_READY: "true", NOTARIZATION_READY: "false",
  }), 1);
  assert.doesNotMatch(jobs.release, /ad-hoc otherwise|Not signed yet/);
});

test("the v-tag example sets its tag prefix", () => {
  assert.match(text, /with: \{ working-directory: apps\/desktop, product-name: "Yomizaka", tag-prefix: "v", sign: true \}/);
});
