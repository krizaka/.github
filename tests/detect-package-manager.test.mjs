// « Bump @krizaka packages » picks pnpm or npm from the lockfile and refuses a directory with none (krizaka-internal#3342).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { detectPackageManager } from "../scripts/detect-package-manager.mjs";

const dirWith = (...files) => {
  const d = mkdtempSync(join(tmpdir(), "pm-"));
  for (const f of files) writeFileSync(join(d, f), "");
  return d;
};

test("detect-package-manager: pnpm-lock.yaml is pnpm", () => assert.equal(detectPackageManager(dirWith("pnpm-lock.yaml")), "pnpm"));
test("detect-package-manager: package-lock.json is npm", () => assert.equal(detectPackageManager(dirWith("package-lock.json")), "npm"));
test("detect-package-manager: pnpm wins when both exist", () => assert.equal(detectPackageManager(dirWith("package-lock.json", "pnpm-lock.yaml")), "pnpm"));
test("detect-package-manager: no lockfile is a clear error", () => assert.throws(() => detectPackageManager(dirWith("package.json")), /No pnpm-lock\.yaml or package-lock\.json/));

test("detect-package-manager: the CLI reports the manager to the step output and exits 1 without a lockfile", () => {
  const outFile = join(mkdtempSync(join(tmpdir(), "pm-step-")), "step-output");
  writeFileSync(outFile, "");
  const script = new URL("../scripts/detect-package-manager.mjs", import.meta.url).pathname;
  execFileSync("node", [script, dirWith("package-lock.json")], { env: { ...process.env, GITHUB_OUTPUT: outFile } });
  assert.equal(readFileSync(outFile, "utf8"), "manager=npm\n");
  assert.throws(() => execFileSync("node", [script, dirWith()], { stdio: "pipe" }), /Command failed/);
});

test("bump-krizaka workflow: pnpm only for pnpm, a working-directory input, no unconditional pnpm", () => {
  const wf = readFileSync(new URL("../.github/workflows/bump-krizaka.yml", import.meta.url), "utf8");
  assert.match(wf, /working-directory:\n\s+description/);
  assert.match(wf, /detect-package-manager\.mjs/);
  assert.match(wf, /npm install --package-lock-only/);
  assert.match(wf, /pnpm\/action-setup[^\n]*\n\s+if: steps\.pm\.outputs\.manager == 'pnpm'/);
});
