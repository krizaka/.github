// krizaka/.github#324 and #325: a fixture secret fails the central gitleaks config, and a fixture workflow with
// `${{ github.event.pull_request.title }}` inside `run:` fails zizmor. Fixtures are written at run time into a temp
// directory, so this repository never holds a secret-looking value. The tools are installed by the workflow
// (lint-workflows.yml); a missing tool FAILS the test, it is never skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: "utf8" });

test("gitleaks: the hook refuses a fixture config holding a webhook-style secret, and passes a clean one", () => {
  const dir = mkdtempSync(join(tmpdir(), "kz-gl-"));
  const git = (...a) => run("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], dir);
  git("init", "-q");
  const aws = "ghp_" + randomBytes(27).toString("base64url").replace(/[-_]/g, "a").slice(0, 36);
  writeFileSync(join(dir, "config.yml"), `github_token: ${aws}\n`);
  git("add", ".");
  const bad = run("bash", [join(root, "scripts/hooks/gitleaks-staged.sh")], dir);
  assert.equal(bad.error, undefined, "gitleaks must be installed");
  assert.notEqual(bad.status, 0, "a staged secret must fail the hook");
  assert.ok(!(bad.stdout + bad.stderr).includes(aws), "the value is never printed");
  writeFileSync(join(dir, "config.yml"), "name: example\n");
  git("add", ".");
  assert.equal(run("bash", [join(root, "scripts/hooks/gitleaks-staged.sh")], dir).status, 0);
});

test("zizmor: a workflow with the pull request title inside run: fails", () => {
  const dir = mkdtempSync(join(tmpdir(), "kz-zz-"));
  mkdirSync(join(dir, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(dir, ".github/workflows/bad.yml"),
    "name: bad\non: pull_request\npermissions: {}\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo \"${{ github.event.pull_request.title }}\"\n",
  );
  const r = run("zizmor", ["--offline", "--min-severity", "medium", "--no-progress", dir], dir);
  assert.equal(r.error, undefined, "zizmor must be installed");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /template-injection/);
});
