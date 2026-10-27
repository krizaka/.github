#!/usr/bin/env node
// The Krizaka repository layout guard (docs/standards/repo-layout.md, krizaka/.github).
//
//   node scripts/check-repo-layout.mjs [--root <dir>] [--kind <kind>] [--json]
//
// Reads `git ls-files` of the repository and fails on:
//   root-entry     a root file or folder the repository kind does not declare;
//   root-file      a root file that belongs in a folder (a note, a test, a script, a medium, a query) or has an odd name;
//   generated      a tracked generated or local path (target/, var/, data/, node_modules, dist, .env, captures…);
//   licence        two licence files saying the same thing (LICENSE and LICENSE.md);
//   config         a bad or stale `.repo-layout.json` entry.
//
// A justified extra goes in `.repo-layout.json` at the root, each with a « why »:
//   { "kind": "maven",
//     "allow":        [{ "path": "archunit_store", "why": "ArchUnit freeze store, read by the tests" }],
//     "allowTracked": [{ "path": "tests/fixtures/dist/**", "why": "a fixture that models a build output" }] }
// `allow` lists root entries (a name, or a glob with `*`); `allowTracked` lists tracked paths (globs with `*`, `**`).
//
// Dependency-free, identical in every repository that copies it (keep the copies identical; its unit test is
// tests/check-repo-layout.test.mjs). The shared CI runs it through the `quality` action.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CONFIG_FILE = ".repo-layout.json";

/** Glob (`*`, `**`) to an anchored RegExp. */
export function globToRegExp(glob) {
  const DEEP = "@@deep@@"; // `**/`: any folders, or none
  const ANY = "@@any@@"; // `**`: anything
  const body = glob
    .replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll(/\*\*\/?/g, (m) => (m.endsWith("/") ? DEEP : ANY))
    .replaceAll("*", "[^/]*")
    .replaceAll(DEEP, "(?:.*/)?")
    .replaceAll(ANY, ".*");
  return new RegExp(`^${body}$`);
}
const matchesAny = (name, globs) => globs.some((g) => globToRegExp(g).test(name));

// ---- what every repository may hold at its root ------------------------------------------------------------------

const COMMON_FILES = [
  "README.md", "README", "LICENSE", "LICENSE.md", "LICENSE-APACHE", "NOTICE", "SECURITY.md", "AGENTS.md", "CLAUDE.md",
  "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "CHANGELOG.md", "SUPPORT.md", "TRADEMARKS.md", "CODEOWNERS",
  ".gitignore", ".gitattributes", ".gitmodules", ".editorconfig", ".dockerignore", ".agentignore", ".env.example",
  ".nvmrc", ".node-version", ".tool-versions", ".python-version", ".npmrc", ".npmignore", ".prettierignore", ".mailmap",
  ".release-please-manifest.json", "release-please-config.json", ".krizaka-deploy.json", "dev-preview.json",
  ".repo-layout.json", ".gitleaks.toml", ".pre-commit-config.yaml", "sonar-project.properties", ".sonarcloud.properties", "*-ratchet.json", "app-links.json", "app-links.routes.json", "sgconfig.yml", ".dependency-cruiser.cjs", "renovate.json", "Makefile",
  "Dockerfile", "Dockerfile.*", "docker-compose.yml", "docker-compose.*.yml", "compose.yml",
  ".prettierrc", ".prettierrc.*", ".lintstagedrc", ".lintstagedrc.*", ".commitlintrc.*", ".checkov.yml",
];
const COMMON_DIRS = ["docs", "scripts", "tests", "test", ".github", ".githooks", ".husky", ".do", "deploy", "infra"];

const NODE_FILES = [
  "package.json", "package-lock.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "yarn.lock", "turbo.json",
  "tsconfig.json", "tsconfig.*.json", "eslint.config.*", ".eslintrc", ".eslintrc.*", ".eslintignore",
  "postcss.config.*", "tailwind.config.*", "next.config.*", "vitest.config.*", "vitest.workspace.*", "jest.config.*",
  "playwright.config.*", "proxy.ts", "middleware.ts", "instrumentation.ts", "instrumentation-client.ts",
  "babel.config.js", "metro.config.js", "app.config.js", "app.json", "eas.json", "expo-env.d.ts", "jest.setup.*",
];

const KINDS = {
  "next-app": { files: NODE_FILES, dirs: ["app", "lib", "src", "content", "messages", "public", "e2e", "rules", "rule-tests", "db", "functions", "types"] },
  "node-cli": { files: NODE_FILES, dirs: ["src", "e2e", "rules", "rule-tests", "alias", "bin", "lib"] },
  expo: { files: NODE_FILES, dirs: ["src", "app", "assets", "plugins", ".maestro", "e2e", "rules", "rule-tests"] },
  "ts-monorepo": { files: NODE_FILES, dirs: ["apps", "packages", "tools", "site", "renovate", ".changeset", "rules", "rule-tests", "e2e"] },
  maven: { files: ["pom.xml", "mvnw", "mvnw.cmd"], dirs: ["src", ".mvn", "examples", "starters"], moduleMarkers: ["pom.xml"] },
  workspace: { files: ["pom.xml", "mvnw", "mvnw.cmd", "*.workspace.json"], dirs: ["src", ".mvn", "apps", "contracts"], moduleMarkers: ["pom.xml"] },
  python: { files: ["pyproject.toml", "requirements*.txt", "setup.cfg", "setup.py", "uv.lock", "poetry.lock", "pytest.ini", "tox.ini", "ruff.toml", "conftest.py"], dirs: ["app", "src", "models"] },
  iac: { files: ["*.tf", "*.tfvars", ".terraform.lock.hcl", ".tflint.hcl"], dirs: ["modules", "providers", "stacks"] },
  packs: { files: NODE_FILES.concat(["pack.schema.json"]), dirs: [], moduleMarkers: ["pack.yaml"] },
  org: { files: [".pre-commit-hooks.yaml", "AGENTS.template.md", "LABELS.md", "ROADMAP.md", "repos.json", "release-repos.json"], dirs: ["actions", "orchestration", "profile", "workflow-templates"] },
};

/** The kind, from what the root holds (a `.repo-layout.json` `kind` wins). */
export function detectKind(files) {
  const root = new Set(files.filter((f) => !f.includes("/")));
  const has = (re) => [...root].some((f) => re.test(f));
  if (has(/\.workspace\.json$/)) return "workspace";
  if (root.has("pom.xml")) return "maven";
  if (root.has("pack.schema.json")) return "packs";
  if (root.has("eas.json")) return "expo";
  if (has(/^next\.config\./)) return "next-app";
  if (root.has("pnpm-workspace.yaml") || root.has("turbo.json")) return "ts-monorepo";
  if (root.has("pyproject.toml")) return "python";
  if (has(/\.tf$/) || files.some((f) => f.startsWith("stacks/") || f.startsWith("modules/"))) return "iac";
  if (root.has("repos.json")) return "org";
  if (root.has("package.json")) return "node-cli";
  return "org";
}

// ---- tracked generated or local paths ----------------------------------------------------------------------------

const GENERATED_SEGMENTS = new Set([
  "node_modules", "__pycache__", ".venv", "venv", ".next", ".turbo", ".gradle", "target", ".pytest_cache", ".scannerwork",
  ".terraform", ".idea", "dist", "coverage", ".expo", ".nx", ".parcel-cache", ".ruff_cache", ".mypy_cache",
]);
const GENERATED_ROOT_DIRS = new Set([
  "build", "out", "var", "data", "tmp", "temp", "log", "logs", "captures", "screenshots", "pr-assets", ".cache", ".tmp",
]);
const GENERATED_PREFIXES = ["docs/screenshots/", ".github/pr-assets/", ".github/screenshots/"];
const GENERATED_FILES = [
  /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /\.pyc$/, /\.log$/, /\.tsbuildinfo$/, /\.iml$/, /\.sw[po]$/,
  /(^|\/)\.env$/, /(^|\/)\.env\.(?!example$|sample$|template$|defaults$)[\w.-]+$/,
];

/** Why a tracked path is generated or local, or null. */
export function generatedReason(path) {
  const parts = path.split("/");
  const dirs = parts.slice(0, -1);
  const seg = dirs.find((d) => GENERATED_SEGMENTS.has(d));
  if (seg) return `\`${seg}/\` is build or local output`;
  if (dirs.length && GENERATED_ROOT_DIRS.has(dirs[0])) return `\`${dirs[0]}/\` at the root is generated or local`;
  const prefix = GENERATED_PREFIXES.find((p) => path.startsWith(p));
  if (prefix) return `\`${prefix}\` holds captures (they go to Bunny: AGENTS §5.1)`;
  if (GENERATED_FILES.some((re) => re.test(path))) return "a local or generated file";
  return null;
}

// ---- root files that belong in a folder ---------------------------------------------------------------------------

const MISPLACED = [
  [/(^|[._-])env([._-]|$)/i, (n) => `odd name for an environment template: rename it \`.env.example\` (and update every reference)`],
  [/\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|mp3|wav)$/i, () => "a medium: it belongs in the folder that uses it, or on Bunny (AGENTS §5.2)"],
  [/\.(zip|tgz|tar|tar\.gz|jar|war|dmp|sqlite|db|bak|orig|rej|tmp)$/i, () => "a local artefact: not tracked"],
  [/(^test[_-].*\.py$|_test\.py$|\.(test|spec)\.[cm]?[jt]sx?$)/, () => "a test: move it to `tests/`"],
  [/\.(sql)$/i, () => "a query: move it to `infra/` (migrations) or `scripts/`"],
  [/\.(sh|bash|mjs|cjs|py|rb|ps1)$/i, () => "a script: move it to `scripts/`"],
  [/\.(md|mdx|txt|pdf|docx?)$/i, () => "a document: move it to `docs/`"],
];

/** Misplaced-file message for a root file, or null. Only called for a file no list declares. */
export function misplacedReason(name) {
  for (const [re, why] of MISPLACED) if (re.test(name)) return why(name);
  return null;
}

// ---- the check ---------------------------------------------------------------------------------------------------

/** Config entries need a `path` and a « why » of a real sentence. */
function configProblems(config, add) {
  for (const [list, entries] of [["allow", config.allow ?? []], ["allowTracked", config.allowTracked ?? []]]) {
    for (const e of entries) {
      if (!e || typeof e.path !== "string" || typeof e.why !== "string" || e.why.trim().length < 8) {
        add("config", CONFIG_FILE, `\`${list}\` entry ${JSON.stringify(e)} needs a \`path\` and a « why » of a real sentence`);
      }
    }
  }
}

/** The root, as entries: a folder when a tracked path goes below it. @returns {Map<string, {dir: boolean, markers: Set<string>}>} */
function rootEntries(files) {
  const entries = new Map();
  for (const f of files) {
    const i = f.indexOf("/");
    const name = i < 0 ? f : f.slice(0, i);
    const e = entries.get(name) ?? { dir: false, markers: new Set() };
    if (i >= 0) {
      e.dir = true;
      const rest = f.slice(i + 1);
      if (!rest.includes("/")) e.markers.add(rest);
    }
    entries.set(name, e);
  }
  return entries;
}

/** One root entry against the kind: nothing when it is allowed. */
function rootEntryProblem(name, e, kind, spec) {
  if (e.dir) {
    const known = new Set([...COMMON_DIRS, ...spec.dirs]);
    if (known.has(name) || (spec.moduleMarkers ?? []).some((m) => e.markers.has(m))) return null;
    return ["root-entry", `${name}/`, `folder \`${name}/\` is not declared for a \`${kind}\` repository: move it under \`docs/\`, \`scripts/\` or \`src/\`, or declare it in ${CONFIG_FILE} with a « why »`];
  }
  if (matchesAny(name, [...COMMON_FILES, ...spec.files])) return null;
  const misplaced = misplacedReason(name);
  if (misplaced) return ["root-file", name, `\`${name}\`: ${misplaced}`];
  return ["root-entry", name, `file \`${name}\` is not declared for a \`${kind}\` repository: move it into a folder, or declare it in ${CONFIG_FILE} with a « why »`];
}

/** One licence file per licence: LICENSE and LICENSE.md together say the same thing twice. */
function licenceProblem(entries, allow) {
  const rootFiles = new Set([...entries].filter(([, e]) => !e.dir).map(([n]) => n));
  if (!rootFiles.has("LICENSE") || !rootFiles.has("LICENSE.md")) return null;
  if (allow.some((a) => a.path === "LICENSE.md" || a.path === "LICENSE")) return null;
  return "both `LICENSE` and `LICENSE.md` are tracked: keep one (FSL in `LICENSE.md` with the Apache text in `LICENSE-APACHE`, or a single `LICENSE`)";
}

/** Every root entry against the kind; an entry the config allows is marked used. */
function rootProblems(entries, allow, kind, spec, used, add) {
  for (const [name, e] of entries) {
    const allowed = allow.find((a) => typeof a.path === "string" && matchesAny(name, [a.path]));
    if (allowed) {
      used.add(allowed);
      continue;
    }
    const problem = rootEntryProblem(name, e, kind, spec);
    if (problem) add(...problem);
  }
}

/** Tracked generated or local paths. */
function generatedProblems(files, allowTracked, used, add) {
  for (const f of files) {
    const reason = generatedReason(f);
    if (!reason) continue;
    const ok = allowTracked.find((a) => typeof a.path === "string" && globToRegExp(a.path).test(f));
    if (ok) used.add(ok);
    else add("generated", f, `tracked, but ${reason}: \`git rm\` it and fix .gitignore`);
  }
}

/** A stale justification is clutter too. */
function staleProblems(entries, used, add) {
  for (const e of entries) {
    if (e && typeof e.path === "string" && !used.has(e)) {
      add("config", CONFIG_FILE, `\`${e.path}\` matches nothing any more: remove the entry`);
    }
  }
}

/**
 * @param {string[]} files  tracked paths (`git ls-files`)
 * @param {{kind?: string, allow?: {path: string, why: string}[], allowTracked?: {path: string, why: string}[]}} [config]
 * @returns {{kind: string, violations: {rule: string, path: string, message: string}[]}}
 */
export function checkLayout(files, config = {}) {
  const violations = [];
  const add = (rule, path, message) => violations.push({ rule, path, message });
  const allow = config.allow ?? [];
  const allowTracked = config.allowTracked ?? [];

  const kind = config.kind ?? detectKind(files);
  const spec = KINDS[kind];
  if (!spec) {
    add("config", CONFIG_FILE, `unknown kind \`${kind}\` (one of ${Object.keys(KINDS).join(", ")})`);
    return { kind, violations };
  }
  configProblems(config, add);

  const entries = rootEntries(files);
  const used = new Set();
  rootProblems(entries, allow, kind, spec, used, add);
  generatedProblems(files, allowTracked, used, add);
  const licence = licenceProblem(entries, allow);
  if (licence) add("licence", "LICENSE.md", licence);
  staleProblems([...allow, ...allowTracked], used, add);
  return { kind, violations };
}

// ---- command line -------------------------------------------------------------------------------------------------

export function trackedFiles(root) {
  return execFileSync("/usr/bin/git", ["-C", root, "ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\0").filter(Boolean);
}

export function readConfig(root) {
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}

function main(argv) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const root = resolve(arg("--root") ?? ".");
  let config;
  try { config = readConfig(root); } catch (error) {
    console.error(`${CONFIG_FILE} is not valid JSON: ${error.message}`);
    return 1;
  }
  if (arg("--kind")) config.kind = arg("--kind");
  const { kind, violations } = checkLayout(trackedFiles(root), config);
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ kind, violations }, null, 2));
  } else if (violations.length === 0) {
    console.log(`repo-layout: clean (${kind})`);
  } else {
    const gha = process.env.GITHUB_ACTIONS === "true";
    for (const v of violations) {
      console.error(gha ? `::error file=${v.path},title=repo-layout ${v.rule}::${v.message}` : `[${v.rule}] ${v.path}: ${v.message}`);
    }
    console.error(`repo-layout: ${violations.length} problem(s) for a \`${kind}\` repository. Standard: https://github.com/krizaka/.github/blob/main/docs/standards/repo-layout.md`);
  }
  return violations.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
