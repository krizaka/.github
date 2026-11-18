// The reusable tauri-macos.yml keeps secrets away from pull requests. Parses the workflow text, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// tauri-macos.yml is the pull-request path (no secret, nothing written); tauri-macos-release.yml the signed .dmg, the only job that
// writes (krizaka-internal#4204: a called workflow cannot ask more than its caller grants, even for a skipped job).
function parse(file) {
  const text = readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), "utf8");
  const jobs = {};
  for (const chunk of text.slice(text.indexOf("\njobs:\n")).split(/^  (?=[\w-]+:$)/m).slice(1)) jobs[chunk.slice(0, chunk.indexOf(":"))] = chunk;
  return { text, jobs, header: text.slice(0, text.indexOf("\njobs:\n")) };
}
const { text, jobs, header } = parse("tauri-macos.yml");
const release = parse("tauri-macos-release.yml");

test("secrets are declared by name, each required: false, never inherited", () => {
  for (const w of [{ text, header }, release]) {
    const block = w.header.slice(w.header.indexOf("    secrets:\n"), w.header.indexOf("\n# The workflow level"));
    const names = [...block.matchAll(/^      (APPLE_\w+):\n        required: false$/gm)].map((m) => m[1]);
    assert.ok(names.length >= 7);
    assert.equal([...block.matchAll(/required:/g)].length, names.length);
    assert.doesNotMatch(w.text, /secrets:\s*inherit/);
  }
});

test("sign defaults to false", () => {
  assert.match(header, /sign:\n(?:        .*\n)*?        type: boolean\n        default: false/);
});

test("no step of PR mode references a secret", () => {
  const prJobs = Object.entries(jobs).filter(([n]) => n !== "guard");
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
  assert.doesNotMatch(jobs.guard, /if:/, "the guard runs in every mode");
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

function runBlock(name, stepName, vars, from = jobs) {
  const lines = from[name].split("\n");
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

test("sign: true is refused here: the signed .dmg moved to tauri-macos-release.yml", () => {
  assert.equal(runBlock("guard", "Refuse sign true, moved to tauri-macos-release.yml", { SIGN: "true" }), 1);
  assert.equal(runBlock("guard", "Refuse sign true, moved to tauri-macos-release.yml", { SIGN: "false" }), 0);
  assert.equal(jobs.gate, undefined);
  assert.equal(jobs.release, undefined);
});

test("release mode refuses unapproved events and refs and runs in the release environment", () => {
  const { jobs: r } = release;
  assert.doesNotMatch(r.gate + r.release, /inputs\.sign/);
  assert.match(r.gate, /github\.event_name/);
  assert.match(r.gate, /github\.ref/);
  assert.equal(runBlock("gate", "Refuse to sign outside a push to main or a tag", { EVENT: "push", REF: "refs/heads/main" }, r), 0);
  assert.equal(runBlock("gate", "Refuse to sign outside a push to main or a tag", { EVENT: "push", REF: "refs/tags/v1.2.3" }, r), 0);
  for (const vars of [
    { EVENT: "pull_request", REF: "refs/heads/main" },
    { EVENT: "workflow_dispatch", REF: "refs/heads/main" },
    { EVENT: "push", REF: "refs/heads/feature" },
  ]) assert.equal(runBlock("gate", "Refuse to sign outside a push to main or a tag", vars, r), 1);
  assert.match(r.release, /needs: \[gate, check\]/);
  assert.match(r.release, /environment: release/);
  assert.doesNotMatch(r.gate, /secrets\./);
  assert.doesNotMatch(r.check, /secrets\.|environment:/);
});

test("signed releases require every signing and notarisation credential", () => {
  const { jobs: r } = release;
  assert.match(r.release, /name: Validate signing and notarisation credentials/);
  const signingReady = r.release.match(/SIGNING_READY: (.+)/)[1];
  const notarizationReady = r.release.match(/NOTARIZATION_READY: (.+)/)[1];
  for (const name of ["APPLE_CERTIFICATE", "APPLE_CERTIFICATE_PASSWORD", "APPLE_SIGNING_IDENTITY"]) {
    assert.ok(signingReady.includes(`secrets.${name} != ''`), `${name} is required for signing`);
  }
  for (const name of ["APPLE_API_ISSUER", "APPLE_API_KEY", "APPLE_API_KEY_P8", "APPLE_TEAM_ID"]) {
    assert.ok(notarizationReady.includes(`secrets.${name} != ''`), `${name} is required for notarisation`);
  }
  assert.equal(runBlock("release", "Validate signing and notarisation credentials", {
    SIGNING_READY: "true", NOTARIZATION_READY: "true",
  }, r), 0);
  assert.equal(runBlock("release", "Validate signing and notarisation credentials", {
    SIGNING_READY: "false", NOTARIZATION_READY: "true",
  }, r), 1);
  assert.equal(runBlock("release", "Validate signing and notarisation credentials", {
    SIGNING_READY: "true", NOTARIZATION_READY: "false",
  }, r), 1);
  assert.doesNotMatch(r.release, /ad-hoc otherwise|Not signed yet/);
});

test("the v-tag example sets its tag prefix and calls the release file", () => {
  assert.match(text, /tauri-macos-release\.yml@<sha>\n#\s+with: \{ working-directory: apps\/desktop, product-name: "Verikora", tag-prefix: "v" \}/);
  assert.match(release.text, /with: \{ working-directory: apps\/desktop, product-name: "Verikora", tag-prefix: "v" \}/);
});

test("no job of the pull-request path writes, and only the release job of the release file does (startup_failure otherwise)", () => {
  assert.match(text, /^permissions: \{\}$/m);
  assert.match(release.text, /^permissions: \{\}$/m);
  for (const [name, body] of Object.entries(jobs)) assert.doesNotMatch(body, /: write/, `job ${name}`);
  for (const [name, body] of Object.entries(release.jobs)) {
    if (name === "release") assert.match(body, /^ {6}contents: write # .+$/m);
    else assert.doesNotMatch(body, /: write/, `job ${name}`);
  }
});
