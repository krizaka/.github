// The reusable tauri-macos.yml keeps secrets away from pull requests. Parses the workflow text, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  const prJobs = Object.entries(jobs).filter(([n]) => n !== "release" && n !== "guard");
  assert.ok(prJobs.length >= 2);
  for (const [name, body] of prJobs) assert.doesNotMatch(body, /secrets\./, `job ${name}`);
  assert.doesNotMatch(jobs.check, /environment:/);
});

test("the guard only reads whether a secret exists, and fails on one", () => {
  assert.match(jobs.guard, /if: \$\{\{ !inputs\.sign \}\}/);
  for (const m of jobs.guard.matchAll(/\$\{\{[^}]*\}\}/g)) {
    for (const ref of m[0].matchAll(/secrets\.\w+(?: != '')?/g)) assert.match(ref[0], / != ''$/);
  }
  assert.match(jobs.guard, /exit 1/);
});

test("release mode refuses pull_request and runs in the release environment", () => {
  assert.match(jobs.gate, /if: \$\{\{ inputs\.sign \}\}/);
  assert.match(jobs.gate, /github\.event_name/);
  assert.match(jobs.gate, /github\.ref/);
  assert.match(jobs.gate, /"\$EVENT" = "push"/);
  assert.match(jobs.gate, /refs\/heads\/main\|refs\/tags\/\*/);
  assert.match(jobs.gate, /exit 1/);
  assert.match(jobs.release, /if: \$\{\{ inputs\.sign \}\}/);
  assert.match(jobs.release, /needs: \[gate, check\]/);
  assert.match(jobs.release, /environment: release/);
  assert.doesNotMatch(jobs.gate, /secrets\./);
});
