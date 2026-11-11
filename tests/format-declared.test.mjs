// The `format-declared` check and the rule `prepush-format-security` (krizaka-internal#2813): every language of a repository has its
// formatter declared and run in CI; a repository without that language is asked nothing.
import test from "node:test";
import assert from "node:assert/strict";
import { loadRules, runCheck, snapshotOf, validateRules } from "../scripts/conformance.mjs";
import { formatVerdict } from "../scripts/format-declared.mjs";

const snap = (files, kind = "app") => snapshotOf("x", kind, Object.keys(files), async (p) => files[p]);
const CI = ".github/workflows/ci.yml";
const FORMAT = JSON.stringify({ scripts: { "format:check": "prettier --check ." } });
const SCAN = `jobs:\n  s:\n    uses: krizaka/.github/.github/workflows/security-scan.yml@${"a".repeat(40)} # main\n`;

test("TS/JS: a prettier format:check script run by CI passes, a missing script or a missing CI step fails", async () => {
  assert.equal((await formatVerdict(snap({ "package.json": FORMAT, [CI]: "run: pnpm run format:check" }))).ok, true);
  const lint = JSON.stringify({ scripts: { "format:check": "prettier --check .", lint: "eslint . && pnpm run format:check" } });
  assert.equal((await formatVerdict(snap({ "package.json": lint, [CI]: "run: pnpm run lint" }))).ok, true);
  assert.match((await formatVerdict(snap({ "package.json": "{}", [CI]: "" }))).why, /no `format:check` script/);
  assert.match((await formatVerdict(snap({ "package.json": FORMAT, [CI]: "run: pnpm test" }))).why, /CI does not run `format:check`/);
});

test("Java: Maven in CI (Spotless is bound to validate); none fails", async () => {
  assert.equal((await formatVerdict(snap({ "pom.xml": "<project/>", [CI]: "uses: x/.github/workflows/maven.yml@abc" }, "maven"))).ok, true);
  assert.match((await formatVerdict(snap({ "pom.xml": "<project/>", [CI]: "run: echo" }, "maven"))).why, /Maven/);
});

test("Python: a ruff configuration asks for `ruff format` in CI; no configuration asks nothing", async () => {
  const configured = { "pyproject.toml": "[tool.ruff]\nline-length = 100\n", [CI]: "run: ruff check ." };
  assert.match((await formatVerdict(snap(configured, "python"))).why, /ruff format/);
  assert.equal((await formatVerdict(snap({ ...configured, [CI]: "run: ruff format --check ." }, "python"))).ok, true);
  assert.equal((await formatVerdict(snap({ "tool.py": "x = 1\n", [CI]: "" }, "python"))).ok, true);
});

test("Rust and OpenTofu: cargo fmt and tofu fmt in CI; fixtures are not the repository's code", async () => {
  assert.match((await formatVerdict(snap({ "crates/a/Cargo.toml": "", [CI]: "run: cargo test" }, "rust"))).why, /cargo fmt/);
  assert.equal((await formatVerdict(snap({ "crates/a/Cargo.toml": "", [CI]: "uses: x/.github/workflows/rust-quality.yml@abc" }, "rust"))).ok, true);
  assert.match((await formatVerdict(snap({ "main.tf": "", [CI]: "" }, "iac"))).why, /tofu fmt/);
  assert.equal((await formatVerdict(snap({ "tests/fixtures/main.tf": "", [CI]: "" }, "iac"))).ok, true);
});

test("the rule needs the format declaration AND the security scan", async () => {
  const rule = loadRules().find((r) => r.id === "prepush-format-security");
  assert.deepEqual(validateRules([rule]), []);
  const files = { "package.json": FORMAT, [CI]: "run: pnpm run format:check", ".github/workflows/security.yml": SCAN };
  assert.equal((await runCheck(rule.check, snap(files))).ok, true);
  assert.equal((await runCheck(rule.check, snap({ ...files, ".github/workflows/security.yml": "" }))).ok, false);
  assert.equal((await runCheck(rule.check, snap({ ...files, "package.json": "{}" }))).ok, false);
});
