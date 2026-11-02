#!/usr/bin/env node
// The build pack's stack detection (krizaka/.github#113): which pipeline a repository needs, read from its checkout.
//
//   node detect.mjs [--dir .] [--base <project folder>] [--repository krizaka/<name>] [--manifest <file or URL>] [--timeout <minutes>] [--github-output]
//   node detect.mjs --tofu-guard <dir>       # refuse a `tofu test` whose run blocks may apply
//
// Order (the first that matches wins):
//   workspace  the repository is listed in krizaka/orazaka's orazaka.workspace.json (component.yml's flow)
//   maven      pom.xml
//   blog       package.json (or pnpm-workspace.yaml) and an MDX `content/` folder: the Node pipeline, labelled blog
//   node       pnpm-workspace.yaml or package.json
//   python     pyproject.toml
//   iac        *.tf (OpenTofu: fmt, validate, test; never apply, never plan against real state)
//
// The repository may keep `.krizaka/ci.json` (values only, never steps): see CONFIG_KEYS. Nothing is guessed: no stack
// is an error, an unknown key is an error, and a membership that cannot be read is an error.
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const MANIFEST_URL = "https://raw.githubusercontent.com/krizaka/orazaka/main/orazaka.workspace.json";

/** The values `.krizaka/ci.json` may hold, with their type. It never lists steps. */
export const CONFIG_KEYS = {
  workingDirectory: "string",
  postgres: "string",
  postgresName: "string",
  env: "object",
  ignore: "string",
  relevant: "string",
  afterBuild: "string",
  playwright: "string",
  rewrite: "boolean",
  nodeVersion: "string",
  javaVersion: "string",
  pythonVersion: "string",
  timeoutMinutes: "number",
};

/** The changes.yml `ignore` of each stack: the one its former reusable workflow had, so a migrated caller skips the same files. */
export const DEFAULT_IGNORE = {
  // node-ci.yml (and the blog: content/ is read by its build, so it is never ignored)
  node: "^\\.changeset/|^(LICENSE|SECURITY|CODE_OF_CONDUCT|SUPPORT)(\\.md)?$|^\\.github/(ISSUE_TEMPLATE/|pull_request_template\\.md$|FUNDING\\.yml$|dependabot\\.yml$)",
  // java-ci.yml and python-ci.yml
  maven: "^[^/]+\\.md$|^docs/|^\\.changeset/|^(LICENSE|NOTICE)$|^\\.github/(ISSUE_TEMPLATE/|pull_request_template\\.md$|FUNDING\\.yml$|dependabot\\.yml$)",
  // krizaka/orazaka component.yml (the governance rules read AGENTS.md, docs and READMEs)
  workspace: "^\\.changeset/|^(LICENSE|NOTICE|SECURITY|CODE_OF_CONDUCT|SUPPORT)(\\.md)?$|^\\.github/(ISSUE_TEMPLATE/|pull_request_template\\.md$|FUNDING\\.yml$|dependabot\\.yml$)",
};
DEFAULT_IGNORE.blog = DEFAULT_IGNORE.node;
DEFAULT_IGNORE.iac = DEFAULT_IGNORE.node;
DEFAULT_IGNORE.python = DEFAULT_IGNORE.maven;

/** The verify job's timeout of each stack (minutes): the former workflow's. */
export const DEFAULT_TIMEOUT = { workspace: 60, maven: 45, node: 25, blog: 25, python: 20, iac: 15 };

/** package.json scripts run by the quality step when they exist (the ratchets, depcruise, ast-grep). */
export const QUALITY_SCRIPTS = ["depcruise", "ast-grep", "ratchet", "ratchets"];

const SKIP_DIRS = new Set([".git", "node_modules", ".terraform", ".venv", "venv", "target", "dist", ".next"]);
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** The pnpm release declared by the project, or one compatible with its lockfile. */
export function resolvePnpmVersion(pkg, lockfile = "") {
  pkg ??= {}; // a project detected from pnpm-lock.yaml alone has no package.json
  const declared = String(pkg.packageManager ?? "").match(/^pnpm@([^+]+)/)?.[1];
  if (declared) return declared;
  const engine = pkg.devEngines?.packageManager;
  if (engine?.name === "pnpm" && typeof engine.version === "string" && engine.version) return engine.version;
  const lockVersion = lockfile.match(/^lockfileVersion:\s*["']?([\d.]+)/m)?.[1];
  if (!lockVersion) return "10";
  if (lockVersion.startsWith("9.")) return "9";
  if (lockVersion.startsWith("6.")) return "8";
  if (lockVersion.startsWith("5.4")) return "7";
  if (lockVersion.startsWith("5.3")) return "6";
  if (lockVersion.startsWith("5.2")) return "5";
  if (lockVersion.startsWith("5.1")) return "4";
  if (lockVersion.startsWith("5.")) return "3";
  return "10";
}

/** Files of `dir` (relative paths) down to `depth` levels, skipping dependency and build folders. */
function walk(dir, depth, base = dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0 && !SKIP_DIRS.has(e.name)) walk(path, depth - 1, base, out);
    } else out.push(relative(base, path));
  }
  return out;
}

/** The default order of a sort (UTF-16 code units), written out. */
const byCodePoint = (a, b) => {
  if (a < b) return -1;
  return a > b ? 1 : 0;
};
const has = (dir, name) => existsSync(join(dir, name));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const lines = (list) => list.filter(Boolean).join("\n");

const CONFIG_FILE = ".krizaka/ci.json";
const fail = (message) => new Error(`${CONFIG_FILE}: ${message}`);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** One key of the configuration: known, of its type, on one line when it is a string. */
function checkEntry(key, value) {
  if (!(key in CONFIG_KEYS)) {
    throw fail(`unknown key "${key}" (it holds values, never steps; known: ${Object.keys(CONFIG_KEYS).join(", ")})`);
  }
  const type = CONFIG_KEYS[key];
  if (type === "object" ? !isPlainObject(value) : typeof value !== type) throw fail(`"${key}" must be a ${type}`);
  if (type === "string" && /[\r\n]/.test(value)) throw fail(`"${key}" must be one line`);
}

/** The `env` values: variable names and one-line strings. */
function checkEnv(env = {}) {
  for (const [name, value] of Object.entries(env)) {
    if (!KEY.test(name)) throw fail(`env key "${name}" is not a variable name`);
    if (typeof value !== "string" || /[\r\n]/.test(value)) throw fail(`env "${name}" must be a one-line string`);
  }
}

/** `ignore` and `relevant` are JavaScript regular expressions. */
function checkPatterns(config) {
  for (const key of ["ignore", "relevant"]) {
    if (config[key] === undefined) continue;
    try {
      new RegExp(config[key]);
    } catch (error) {
      throw fail(`"${key}" is not a JavaScript RegExp: ${error.message}`);
    }
  }
}

/** The working directory stays in the repository; the timeout is a sane number of minutes. */
function checkLimits({ workingDirectory, timeoutMinutes }) {
  if (workingDirectory !== undefined && (workingDirectory.startsWith("/") || workingDirectory.split("/").includes(".."))) {
    throw fail('"workingDirectory" must stay inside the repository');
  }
  if (timeoutMinutes !== undefined && !(Number.isInteger(timeoutMinutes) && timeoutMinutes > 0 && timeoutMinutes <= 360)) {
    throw fail('"timeoutMinutes" must be an integer from 1 to 360');
  }
}

/** Read and validate `.krizaka/ci.json` of a checkout; `{}` when there is none. */
export function readConfig(root) {
  const path = join(root, ".krizaka", "ci.json");
  if (!existsSync(path)) return {};
  let config;
  try {
    config = readJson(path);
  } catch (error) {
    throw fail(`is not JSON: ${error.message}`);
  }
  if (!isPlainObject(config)) throw new Error(".krizaka/ci.json must be an object");
  for (const [key, value] of Object.entries(config)) {
    if (!key.startsWith("$") && key !== "_") checkEntry(key, value); // `$…` and `_` are comments
  }
  checkEnv(config.env);
  checkPatterns(config);
  checkLimits(config);
  return config;
}

/** The index after the comment (`#`, `//` or a block comment) that starts at `i`. */
function skipComment(text, i) {
  if (text.startsWith("/*", i)) {
    const end = text.indexOf("*/", i + 2);
    return end < 0 ? text.length : end + 2;
  }
  const end = text.indexOf("\n", i);
  return end < 0 ? text.length : end;
}

/** A heredoc (`<<EOT` … `EOT`) that starts at `i`: its lexeme and the index after it, or null when `<<` is not a heredoc. */
function readHeredoc(text, i) {
  const name = text.slice(i + 2).match(/^-?[ \t]*([A-Za-z_][A-Za-z0-9_]*)/);
  const headerEnd = name ? text.indexOf("\n", i) : -1;
  if (!name || headerEnd < 0) return null;
  let next = headerEnd + 1;
  while (next < text.length) {
    const end = text.indexOf("\n", next);
    const line = text.slice(next, end < 0 ? text.length : end).replace(/\r$/, "");
    next = end < 0 ? text.length : end + 1;
    if (line.trim() === name[1]) break;
  }
  return { lexeme: { type: "string", value: "" }, next };
}

/** A quoted string that starts at `i`: its lexeme and the index after it. */
function readQuoted(text, i) {
  let value = "";
  let next = i + 1;
  while (next < text.length && text[next] !== '"') {
    if (text[next] === "\\" && next + 1 < text.length) {
      value += text[next + 1];
      next += 2;
    } else value += text[next++];
  }
  if (text[next] === '"') next++;
  return { lexeme: { type: "string", value }, next };
}

/** The lexeme that starts at `i` (not a space or a comment) and the index after it. */
function readLexeme(text, i) {
  if (text.startsWith("<<", i)) {
    const heredoc = readHeredoc(text, i);
    if (heredoc) return heredoc;
  }
  if (text[i] === '"') return readQuoted(text, i);
  if (/[A-Za-z_]/.test(text[i])) {
    const value = text.slice(i).match(/^[A-Za-z_][A-Za-z0-9_-]*/)[0];
    return { lexeme: { type: "identifier", value }, next: i + value.length };
  }
  return { lexeme: { type: "symbol", value: text[i] }, next: i + 1 };
}

/** Tokenize enough HCL syntax to ignore comments, quoted strings and heredocs while inspecting run blocks. */
function hclTokens(text) {
  const tokens = [];
  for (let i = 0; i < text.length;) {
    if (/\s/.test(text[i])) i++;
    else if (text[i] === "#" || text.startsWith("//", i) || text.startsWith("/*", i)) i = skipComment(text, i);
    else {
      const { lexeme, next } = readLexeme(text, i);
      tokens.push(lexeme);
      i = next;
    }
  }
  return tokens;
}

/** Run blocks without an active top-level `command = plan` (they would apply): ["file: run \"x\""]. */
export function unsafeTofuTests(files) {
  const unsafe = [];
  for (const { path, text } of files) {
    const tokens = hclTokens(text);
    const isRun = (i) => tokens[i].type === "identifier" && tokens[i].value === "run" &&
      tokens[i + 1].type === "string" && tokens[i + 2].value === "{";
    // The end of the block that opens at `start` (the token after its closing brace) and whether it plans at its top level.
    const scan = (start) => {
      let depth = 1;
      let safe = false;
      let end = start;
      for (; end < tokens.length && depth; end++) {
        const token = tokens[end];
        if (token.value === "{") depth++;
        else if (token.value === "}") depth--;
        else if (depth === 1 && token.type === "identifier" && token.value === "command" &&
                 tokens[end + 1]?.value === "=" && tokens[end + 2]?.type === "identifier" &&
                 tokens[end + 2].value === "plan") safe = true;
      }
      return { end, safe };
    };
    let next = 0;
    for (let i = 0; i < tokens.length - 2; i += 1) {
      if (i < next || !isRun(i)) continue;
      const { end, safe } = scan(i + 3);
      if (!safe) unsafe.push(`${path}: run "${tokens[i + 1].value}"`);
      next = end;
    }
  }
  return unsafe;
}

/** The OpenTofu test files of one root module (`*.tftest.hcl` beside it and in its `tests/`). */
function tofuTestFiles(dir) {
  const out = [];
  for (const sub of [".", "tests"]) {
    const d = join(dir, sub);
    if (!existsSync(d) || !statSync(d).isDirectory()) continue;
    for (const name of readdirSync(d)) if (name.endsWith(".tftest.hcl")) out.push(join(d, name));
  }
  return out;
}

/** The plan before any stack is known: every field at its default, from the configuration. */
function basePlan(config, workingDirectory) {
  return {
    stack: "",
    workingDirectory,
    component: "",
    packageManager: "",
    pnpmVersion: "",
    nodeVersion: config.nodeVersion ?? "22",
    lint: "",
    typecheck: "",
    test: "",
    build: "",
    quality: "",
    duplication: false,
    javaVersion: config.javaVersion ?? "21",
    spotless: false,
    rewrite: false,
    pythonVersion: config.pythonVersion ?? "3.12",
    pythonManager: "",
    requirements: "",
    pythonLint: "",
    pythonTest: "",
    pythonExtras: "",
    tfDirs: "",
    container: false,
    containerContext: workingDirectory,
    containerDockerfile: "",
    postgresImage: config.postgres ?? "",
    postgresName: config.postgresName ?? "ci",
    env: lines(Object.entries(config.env ?? {}).map(([k, v]) => `${k}=${v}`)),
    afterBuild: config.afterBuild ?? "",
    playwright: config.playwright ?? "",
    ignore: "",
    relevant: config.relevant ?? ".",
    timeout: 0,
  };
}

/** A component of the Orazaka workspace: `workspace.mjs ci` is the whole pipeline. */
function detectWorkspace(plan, config, name) {
  plan.stack = "workspace";
  plan.component = name;
  plan.rewrite = config.rewrite ?? false; // component.yml: opt-in, turned on in the pull request that applies rewrite:run
  // The component is verified inside the workspace: `workspace.mjs ci` is the whole pipeline.
  if (config.afterBuild) throw new Error('.krizaka/ci.json: "afterBuild" does not apply to an Orazaka workspace component (workspace.mjs ci runs everything)');
}

/** A Maven project: Spotless and OpenRewrite come from the pom itself or from the parents that declare them. */
function detectMaven(plan, dir, config) {
  plan.stack = "maven";
  const pom = readFileSync(join(dir, "pom.xml"), "utf8");
  const inherits = /<artifactId>\s*(krizaka-parent|orazaka-build|orazaka-parent)\s*<\/artifactId>/.test(pom);
  plan.spotless = inherits || /spotless-maven-plugin/.test(pom);
  plan.rewrite = (inherits || /rewrite-maven-plugin/.test(pom)) && (config.rewrite ?? true);
}

/** A Node project (a blog when it has MDX content): the package manager, its version and the scripts it has. */
function detectNode(plan, dir, pkg, mdx) {
  plan.stack = mdx ? "blog" : "node";
  const pm = String(pkg?.packageManager ?? "");
  plan.packageManager = pm.startsWith("pnpm") || has(dir, "pnpm-lock.yaml") || has(dir, "pnpm-workspace.yaml") ? "pnpm" : "npm";
  if (plan.packageManager === "pnpm") {
    const lockfile = has(dir, "pnpm-lock.yaml") ? readFileSync(join(dir, "pnpm-lock.yaml"), "utf8") : "";
    plan.pnpmVersion = resolvePnpmVersion(pkg, lockfile);
  }
  const scripts = pkg?.scripts ?? {};
  for (const key of ["lint", "typecheck", "test", "build"]) plan[key] = scripts[key] ? key : "";
  plan.quality = lines(QUALITY_SCRIPTS.filter((s) => scripts[s]));
  plan.duplication = has(dir, "dup-ratchet.json");
}

/** A Python project: uv or pip, ruff and pytest when the project has them. */
function detectPython(plan, dir, files) {
  plan.stack = "python";
  const pyproject = readFileSync(join(dir, "pyproject.toml"), "utf8");
  plan.pythonManager = has(dir, "uv.lock") ? "uv" : "pip";
  const reqs = ["requirements.txt", "requirements-dev.txt", "requirements-test.txt"].filter((f) => has(dir, f));
  plan.requirements = lines(reqs.map((f) => posix.join(plan.workingDirectory, f)));
  const installable = /^\[(project|build-system)\]/m.test(pyproject);
  const ruff = /^\[tool\.ruff/m.test(pyproject) || has(dir, "ruff.toml") || has(dir, ".ruff.toml");
  const tests = /^\[tool\.pytest/m.test(pyproject) || files.some((f) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(f));
  plan.pythonLint = ruff ? "ruff check ." : "";
  plan.pythonTest = pytestCommand(tests, plan.pythonManager);
  if (plan.pythonManager === "pip") {
    plan.pythonExtras = [installable ? "-e ." : "", tests ? "pytest-xdist" : "", ruff ? "ruff" : ""].filter(Boolean).join(" ");
  }
}

/** The pytest command: parallel under pip, plain under uv, none without tests. */
function pytestCommand(tests, manager) {
  if (!tests) return "";
  return manager === "pip" ? "pytest -n auto" : "pytest";
}

/** An infrastructure project: every folder that holds a `.tf` file. */
function detectIac(plan, files) {
  plan.stack = "iac";
  const dirs = [...new Set(files.filter((f) => f.endsWith(".tf")).map((f) => f.split("/").slice(0, -1).join("/") || "."))].sort(byCodePoint);
  plan.tfDirs = lines(dirs);
}

/**
 * The stack and the plan of one checkout.
 * `base` is the project's folder in the checkout (default: its root); every path of the plan is relative to the checkout.
 * @param {{ root: string, base?: string, repository?: string, manifest?: { repositories: { name: string }[] } | null, timeout?: number }} options
 */
export function detect({ root, base = ".", repository = "", manifest = null, timeout = 0 }) {
  const config = readConfig(join(root, base));
  const workingDirectory = posix.normalize(posix.join(base, config.workingDirectory ?? "."));
  const dir = join(root, workingDirectory);
  if (!existsSync(dir)) throw new Error(`working directory not found: ${workingDirectory}`);
  const name = repository.split("/").pop();
  const files = walk(dir, 4);
  const plan = basePlan(config, workingDirectory);

  const members = manifest?.repositories?.map((r) => r.name) ?? [];
  const pkg = has(dir, "package.json") ? readJson(join(dir, "package.json")) : null;
  const mdx = files.some((f) => /^content\/.*\.mdx$/.test(f));
  if (name && members.includes(name)) detectWorkspace(plan, config, name);
  else if (has(dir, "pom.xml")) detectMaven(plan, dir, config);
  else if (pkg || has(dir, "pnpm-workspace.yaml")) detectNode(plan, dir, pkg, mdx);
  else if (has(dir, "pyproject.toml")) detectPython(plan, dir, files);
  else if (files.some((f) => f.endsWith(".tf"))) detectIac(plan, files);
  else {
    throw new Error("no stack detected: no orazaka.workspace.json membership, pom.xml, package.json, pnpm-workspace.yaml, pyproject.toml or *.tf");
  }

  if (plan.stack !== "workspace" && has(dir, "Dockerfile")) {
    plan.container = true;
    plan.containerDockerfile = posix.join(workingDirectory, "Dockerfile");
  }
  plan.ignore = config.ignore ?? DEFAULT_IGNORE[plan.stack];
  plan.timeout = config.timeoutMinutes ?? (timeout > 0 ? timeout : DEFAULT_TIMEOUT[plan.stack]);
  return plan;
}

/** Read the workspace manifest from a file or a URL (three tries: a membership is never guessed). */
export async function loadManifest(source, { fetchImpl = fetch, waitMs = 1000 } = {}) {
  if (!/^https?:\/\//.test(source)) return readJson(source);
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchImpl(source, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (error) {
      last = error;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * waitMs));
    }
  }
  throw new Error(`cannot read the Orazaka workspace manifest (${source}): ${last.message}`);
}

function arg(argv, name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--pnpm-version")) {
    const root = arg(argv, "--dir", ".");
    const pkg = has(root, "package.json") ? readJson(join(root, "package.json")) : {};
    const lockfilePath = join(root, "pnpm-lock.yaml");
    const lockfile = existsSync(lockfilePath) ? readFileSync(lockfilePath, "utf8") : "";
    console.log(`version=${resolvePnpmVersion(pkg, lockfile)}`);
    return;
  }
  if (argv.includes("--tofu-guard")) {
    const dir = arg(argv, "--tofu-guard", ".");
    const unsafe = unsafeTofuTests(tofuTestFiles(dir).map((path) => ({ path, text: readFileSync(path, "utf8") })));
    if (unsafe.length) {
      for (const u of unsafe) console.log(`::error::${u} has no \`command = plan\`: a tofu test may never apply`);
      process.exit(1);
    }
    console.log(`${dir}: ${tofuTestFiles(dir).length} test file(s), every run block plans only`);
    return;
  }
  const root = arg(argv, "--dir", ".");
  const repository = arg(argv, "--repository", process.env.GITHUB_REPOSITORY ?? "");
  const manifest = await loadManifest(arg(argv, "--manifest", MANIFEST_URL));
  const base = arg(argv, "--base", "") || ".";
  if (base.startsWith("/") || base.split("/").includes("..")) throw new Error("--base must stay inside the checkout");
  const plan = detect({ root, base, repository, manifest, timeout: Number(arg(argv, "--timeout", "0")) });
  const component = plan.component ? ` (component ${plan.component})` : "";
  console.log(`stack: ${plan.stack}${component}`);
  console.log(JSON.stringify(plan, null, 2));
  if (argv.includes("--github-output") && process.env.GITHUB_OUTPUT) {
    const out = { stack: plan.stack, plan: JSON.stringify(plan), ignore: plan.ignore, relevant: plan.relevant, timeout: String(plan.timeout) };
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}\n`).join(""));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.log(`::error::${error.message}`);
    process.exit(1);
  }
}
