// The build pack's stack detection (actions/detect/detect.mjs, krizaka/.github#113) against one fixture repository per stack
// (tests/buildpack/<stack>/), and the guards of `.krizaka/ci.json` and of `tofu test`. Hermetic: the workspace manifest is a file.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { DEFAULT_IGNORE, detect, loadManifest, readConfig, resolvePnpmVersion, unsafeTofuTests } from "../actions/detect/detect.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = join(ROOT, "tests", "buildpack");
const manifest = JSON.parse(readFileSync(join(FIXTURES, "workspace.manifest.json"), "utf8"));
const fixture = (stack, repository = `krizaka/fixture-${stack}`) => detect({ root: join(FIXTURES, stack), repository, manifest });

/** A throw-away checkout with the given files. */
function checkout(files) {
  const dir = mkdtempSync(join(tmpdir(), "buildpack-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

test("workspace: a repository listed in orazaka.workspace.json is verified inside the workspace, whatever it holds", () => {
  const plan = fixture("workspace", "krizaka/orazaka-edge");
  assert.equal(plan.stack, "workspace");
  assert.equal(plan.component, "orazaka-edge");
  assert.equal(plan.rewrite, false, "component.yml: OpenRewrite is opt-in");
  assert.equal(plan.container, false, "the workspace flow builds no image");
  assert.equal(plan.timeout, 60);
  assert.equal(plan.ignore, DEFAULT_IGNORE.workspace);
  // A Node member is a workspace member too (component.yml verifies orazaka-ui-kit the same way).
  assert.throws(() => fixture("node", "krizaka/orazaka-ui-kit"), /afterBuild" does not apply/, "the node fixture declares an afterBuild");
  assert.equal(fixture("blog", "krizaka/orazaka-ui-kit").stack, "workspace");
});

test("maven: pom.xml, Java 21; Spotless and OpenRewrite only when the pom or its parent declares them", () => {
  const plan = fixture("maven");
  assert.equal(plan.stack, "maven");
  assert.equal(plan.javaVersion, "21");
  assert.equal(plan.spotless, false);
  assert.equal(plan.rewrite, false);
  assert.equal(plan.timeout, 45);
  // The same component, outside the workspace: a plain Maven project whose parent (orazaka-build) carries the plugins.
  const inherited = fixture("workspace", "krizaka/not-a-member");
  assert.equal(inherited.stack, "maven");
  assert.equal(inherited.spotless, true);
  assert.equal(inherited.rewrite, true);
  const optedOut = checkout({ "pom.xml": "<artifactId>krizaka-parent</artifactId>", ".krizaka/ci.json": '{ "rewrite": false }' });
  assert.equal(detect({ root: optedOut, manifest }).rewrite, false);
  assert.equal(detect({ root: optedOut, manifest }).spotless, true);
});

test("node: npm, the package.json scripts that exist, the quality scripts, .krizaka/ci.json values", () => {
  const plan = fixture("node");
  assert.equal(plan.stack, "node");
  assert.equal(plan.packageManager, "npm");
  assert.deepEqual([plan.lint, plan.typecheck, plan.test, plan.build], ["lint", "typecheck", "test", "build"]);
  assert.equal(plan.quality, "depcruise");
  assert.equal(plan.env, "FIXTURE_FLAG=on");
  assert.equal(plan.afterBuild, "scripts/after-build.sh");
  assert.equal(plan.timeout, 10, ".krizaka/ci.json timeoutMinutes");
  assert.equal(plan.ignore, DEFAULT_IGNORE.node);
  assert.equal(plan.duplication, false);
  assert.equal(plan.container, false);
});

test("node: pnpm version from package metadata or lockfile; a Dockerfile builds an image", () => {
  for (const files of [{ "pnpm-lock.yaml": "" }, { "pnpm-workspace.yaml": "packages: []" }, {}]) {
    const pkg = Object.keys(files).length ? "{}" : '{ "packageManager": "pnpm@10.0.0" }';
    const plan = detect({ root: checkout({ "package.json": pkg, ...files }), manifest });
    assert.equal(plan.packageManager, "pnpm");
    assert.ok(plan.pnpmVersion);
  }
  assert.equal(detect({ root: checkout({ "package.json": '{"packageManager":"pnpm@9.15.0"}', "pnpm-lock.yaml": "lockfileVersion: '9.0'" }), manifest }).pnpmVersion, "9.15.0");
  assert.equal(detect({ root: checkout({ "package.json": '{"devEngines":{"packageManager":{"name":"pnpm","version":"8.15.0"}}}', "pnpm-lock.yaml": "lockfileVersion: '6.0'" }), manifest }).pnpmVersion, "8.15.0");
  assert.equal(detect({ root: checkout({ "package.json": "{}", "pnpm-lock.yaml": "lockfileVersion: '6.0'" }), manifest }).pnpmVersion, "8");
  assert.equal(detect({ root: checkout({ "package.json": "{}", "pnpm-lock.yaml": "lockfileVersion: '9.0'" }), manifest }).pnpmVersion, "9");
  assert.equal(detect({ root: checkout({ "package.json": "{}", "pnpm-workspace.yaml": "packages: []" }), manifest }).pnpmVersion, "10");
  const plan = detect({ root: checkout({ "package.json": "{}", Dockerfile: "FROM scratch", "dup-ratchet.json": "{}" }), manifest });
  assert.equal(plan.container, true);
  assert.equal(plan.containerDockerfile, "Dockerfile");
  assert.equal(plan.duplication, true);
  assert.deepEqual([plan.lint, plan.test, plan.build], ["", "", ""], "a script that does not exist is not run");
});

test("blog: package.json and an MDX content/ folder: the Node pipeline, labelled blog", () => {
  const plan = fixture("blog");
  assert.equal(plan.stack, "blog");
  assert.equal(plan.packageManager, "pnpm");
  assert.equal(plan.build, "build");
  assert.doesNotMatch("content/posts/hello.mdx", new RegExp(plan.ignore), "the content is never ignored by the gate");
});

test("python: pip, the requirements (repository-relative), ruff and pytest-xdist when configured", () => {
  const plan = fixture("python");
  assert.equal(plan.stack, "python");
  assert.equal(plan.pythonManager, "pip");
  assert.equal(plan.requirements, "requirements.txt");
  assert.equal(plan.pythonLint, "ruff check .");
  assert.equal(plan.pythonTest, "pytest -n auto");
  assert.equal(plan.pythonExtras, "pytest-xdist ruff");
  const uv = detect({ root: checkout({ "pyproject.toml": "[project]\nname = 'x'\n", "uv.lock": "" }), manifest });
  assert.equal(uv.pythonManager, "uv");
  assert.equal(uv.pythonTest, "", "no test, no pytest");
  const uvTests = detect({ root: checkout({ "pyproject.toml": "[project]\nname = 'x'\n", "uv.lock": "", "test_app.py": "" }), manifest });
  assert.equal(uvTests.pythonTest, "pytest");
  const installableWithRequirements = detect({
    root: checkout({ "pyproject.toml": "[project]\nname = 'x'\n", "requirements.txt": "requests", "test_app.py": "" }),
    manifest,
  });
  assert.match(installableWithRequirements.pythonExtras, /-e \./);
  assert.match(installableWithRequirements.pythonExtras, /pytest-xdist/);
  const sub = detect({ root: FIXTURES, base: "python", manifest });
  assert.equal(sub.workingDirectory, "python");
  assert.equal(sub.requirements, "python/requirements.txt", "requirements are relative to the checkout (they key the cache)");
});

test("iac: every OpenTofu module, never applied", () => {
  const plan = fixture("iac");
  assert.equal(plan.stack, "iac");
  assert.equal(plan.tfDirs, ".");
  assert.equal(plan.timeout, 15);
  const nested = detect({ root: checkout({ "stacks/dns/main.tf": "", "stacks/app/main.tf": "", "modules/x/main.tf": "" }), manifest });
  assert.equal(nested.tfDirs, "modules/x\nstacks/app\nstacks/dns");
  const text = readFileSync(join(FIXTURES, "iac", "tests", "main.tftest.hcl"), "utf8");
  assert.deepEqual(unsafeTofuTests([{ path: "main.tftest.hcl", text }]), [], "the fixture's test only plans");
});

test("iac: only an active top-level `command = plan` makes a run block safe", () => {
  const text = 'run "plans" {\n  command = plan\n}\n\nrun "applies" {\n  assert {\n    condition = true\n  }\n}\n';
  assert.deepEqual(unsafeTofuTests([{ path: "t.tftest.hcl", text }]), ['t.tftest.hcl: run "applies"']);
  assert.deepEqual(unsafeTofuTests([{ path: "t.tftest.hcl", text: 'run "a" {\n  command = apply\n}\n' }]), ['t.tftest.hcl: run "a"']);
  for (const text of [
    'run "commented" {\n  /* command = plan\n     this is still a comment */\n  command = apply\n}\n',
    'run "missing" {\n  # command = plan\n  assert { condition = true }\n}\n',
    'run "nested" {\n  assert { command = plan }\n}\n',
    'run "string" {\n  note = "command = plan"\n}\n',
    'run "heredoc" {\n  note = <<-EOT\n    command = plan\n  EOT\n  command = apply\n}\n',
  ]) assert.deepEqual(unsafeTofuTests([{ path: "t.tftest.hcl", text }]), ['t.tftest.hcl: run "' + /run "([^"]+)/.exec(text)[1] + '"']);
});

test("the detection order: workspace before maven before node before python before iac", () => {
  const all = { "pom.xml": "<project/>", "package.json": "{}", "pyproject.toml": "", "main.tf": "" };
  assert.equal(detect({ root: checkout(all), repository: "krizaka/orazaka-edge", manifest }).stack, "workspace");
  assert.equal(detect({ root: checkout(all), manifest }).stack, "maven");
  const { "pom.xml": _p, ...noPom } = all;
  assert.equal(detect({ root: checkout(noPom), manifest }).stack, "node");
  const { "package.json": _n, ...noNode } = noPom;
  assert.equal(detect({ root: checkout(noNode), manifest }).stack, "python");
  assert.equal(detect({ root: checkout({ "main.tf": "" }), manifest }).stack, "iac");
  assert.throws(() => detect({ root: checkout({ "README.md": "" }), manifest }), /no stack detected/);
  assert.throws(() => detect({ root: checkout({ "content/a.mdx": "" }), manifest }), /no stack detected/, "MDX alone is not a blog");
});

test(".krizaka/ci.json holds values, never steps", () => {
  const config = (text) => readConfig(checkout({ ".krizaka/ci.json": text }));
  assert.deepEqual(readConfig(checkout({})), {});
  assert.equal(config('{ "postgres": "postgres:16", "env": { "A": "1" } }').postgres, "postgres:16");
  assert.throws(() => config('{ "steps": ["npm test"] }'), /unknown key "steps".*never steps/);
  assert.throws(() => config('{ "env": { "not a name": "x" } }'), /not a variable name/);
  assert.throws(() => config('{ "env": { "A": "1\\nB=2" } }'), /one-line/);
  assert.throws(() => config('{ "ignore": "(" }'), /RegExp/);
  assert.throws(() => config('{ "afterBuild": 3 }'), /must be a string/);
  assert.throws(() => config('{ "workingDirectory": "../elsewhere" }'), /inside the repository/);
  assert.throws(() => config('{ "timeoutMinutes": 0 }'), /1 to 360/);
  assert.throws(() => config("not json"), /not JSON/);
});

test("the workspace manifest: a file is read, a URL is retried, an unreadable one is an error (never guessed)", async () => {
  assert.equal((await loadManifest(join(FIXTURES, "workspace.manifest.json"))).repositories.length, 3);
  let calls = 0;
  const flaky = async () => (++calls < 2 ? { ok: false, status: 503 } : { ok: true, json: async () => manifest });
  assert.equal((await loadManifest("https://example.invalid/m.json", { fetchImpl: flaky, waitMs: 0 })).org, "krizaka");
  await assert.rejects(loadManifest("https://example.invalid/m.json", { fetchImpl: async () => ({ ok: false, status: 404 }), waitMs: 0 }), /cannot read/);
});

test("the fixtures are plain checkouts: copied elsewhere, they detect the same", () => {
  const dir = mkdtempSync(join(tmpdir(), "buildpack-copy-"));
  cpSync(join(FIXTURES, "node"), dir, { recursive: true });
  assert.equal(detect({ root: dir, manifest }).stack, "node");
});

test("pnpm: a project detected from pnpm-lock.yaml alone (no package.json, no packageManager) gets a version from its lockfile", () => {
  assert.equal(resolvePnpmVersion(null, "lockfileVersion: '9.0'"), "9");
  assert.equal(resolvePnpmVersion(undefined, ""), "10");
  const dir = checkout({ "pnpm-lock.yaml": "lockfileVersion: '6.0'\n" });
  const out = execFileSync("node", [join(ROOT, "actions", "detect", "detect.mjs"), "--pnpm-version", "--dir", dir], { encoding: "utf8" });
  assert.equal(out.trim(), "version=8");
});

test("the pack's installs come from the lockfile, run no dependency script, and call no package fetched on demand", () => {
  const install = readFileSync(join(ROOT, "actions", "setup", "install.sh"), "utf8");
  assert.match(install, /pnpm install --frozen-lockfile --ignore-scripts/);
  assert.match(install, /npm ci --ignore-scripts/);
  assert.match(install, /uv sync --locked --no-build/);
  assert.doesNotMatch(install, /--frozen\b(?!-lockfile)/);
  for (const action of ["quality", "test"]) {
    const text = readFileSync(join(ROOT, "actions", action, "action.yml"), "utf8");
    assert.match(text, /uv run --locked --no-sync --no-build bash/);
    assert.doesNotMatch(text, /uv run bash/);
  }
  const afterBuild = readFileSync(join(ROOT, "actions", "after-build", "action.yml"), "utf8");
  assert.doesNotMatch(afterBuild, /^\s*npx\b/m);
  assert.match(afterBuild, /pnpm exec playwright install/);
  assert.match(afterBuild, /npm exec --no --ignore-scripts -- playwright install/);
});

test("every sort of the pack's scripts has an explicit comparator", () => {
  for (const file of [join("actions", "detect", "detect.mjs"), join("scripts", "gen-repos.mjs"), join("scripts", "rename-repo.mjs")]) {
    assert.doesNotMatch(readFileSync(join(ROOT, file), "utf8"), /\.sort\(\)/, `${file} sorts with a comparator`);
  }
});
