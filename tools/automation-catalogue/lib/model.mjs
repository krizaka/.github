// Sorts the tracked files of one repository into what the catalogue reads: workflows, templates and actions (parsed YAML), package
// manifests (parsed JSON), automation scripts, test files, documents, and the other files that can call an automation (hook
// configs, Makefiles, Dockerfiles, agent settings, tool configs). One job: partition, no measuring.
import { baseOf, extensionOf, folderOf, isScript, isTestFile, languageOf } from "./classify.mjs";
import { workflowInfo } from "./workflows.mjs";

const SKIPPED = new Set(["node_modules", "fixtures", "__fixtures__", "testdata", "__snapshots__", "vendor"]);
const HOOK_CONFIGS = new Set([".pre-commit-config.yaml", ".pre-commit-hooks.yaml", "lefthook.yml"]);
const MAKE_FILES = new Set(["Makefile", "justfile", "Taskfile.yml"]);
const CONFIG_FILES = new Set(["turbo.json", "vercel.json", "eas.json", "app.json", "Procfile", "release-please-config.json"]);
const WORKFLOW_FOLDER = ".github/workflows/";
const isYaml = (path) => path.endsWith(".yml") || path.endsWith(".yaml");

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const TEST_FOLDERS = new Set(["test", "tests", "__tests__"]);
const CODE_LANGUAGES = new Set(["javascript", "typescript", "python", "shell"]);

function workflowRole(repo, path, parts) {
  if (path.startsWith(WORKFLOW_FOLDER) && isYaml(path) && parts.length === 3) return "workflow";
  return repo === ".github" && path.startsWith("workflow-templates/") && isYaml(path) && parts.length === 2 ? "template" : null;
}

function namedRole(path, parts) {
  const base = baseOf(path);
  if (base === "action.yml" || base === "action.yaml") return "action";
  if (base === "package.json") return parts.some((p) => TEST_FOLDERS.has(p)) ? null : "package";
  if (path === ".claude/settings.json") return "agent-settings";
  if (HOOK_CONFIGS.has(base) || base.startsWith(".lintstagedrc")) return "hook-config";
  if (MAKE_FILES.has(base)) return "make";
  if (base.startsWith("Dockerfile") || base.startsWith("docker-compose") || base.startsWith("compose.") || path.startsWith(".do/")) return "docker";
  return base.startsWith("gitconfig") ? "git-config" : null;
}

function codeRole(repo, path, text) {
  if (isScript(repo, path, text.slice(0, 2))) return isTestFile(path) ? "test" : "script";
  return isTestFile(path) && CODE_LANGUAGES.has(languageOf(path, text)) ? "test" : null;
}

function plainRole(path, parts) {
  const base = baseOf(path);
  if (base.includes(".config.") || CONFIG_FILES.has(base) || extensionOf(base) === ".toml") return "config";
  return base.endsWith(".md") && (parts.length <= 2 || ["docs", "scripts", "tools"].includes(parts[0])) ? "docs" : null;
}

/** What a file is to the catalogue: workflow, template, action, package, script, test, hook-config, make, docker, agent-settings, config, git-config, docs, or null. */
export function roleOf(repo, path, text) {
  const parts = path.split("/");
  if (parts.includes("node_modules")) return null;
  const own = workflowRole(repo, path, parts);
  if (own || parts.some((p) => SKIPPED.has(p))) return own;
  return namedRole(path, parts) ?? codeRole(repo, path, text) ?? plainRole(path, parts);
}

/** The model of a source: its files by role, with workflows and packages already parsed. */
export function buildModel(source) {
  const model = { name: source.name, commit: source.commit, committedAt: source.committedAt, files: source.files, workflows: [], actions: [], templates: [], packages: [], scripts: [], tests: [], docs: [], others: [] };
  for (const [path, text] of [...source.files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const role = roleOf(source.name, path, text);
    if (role === "workflow") model.workflows.push({ path, text, info: workflowInfo(text) });
    else if (role === "template") model.templates.push({ path, text, info: workflowInfo(text) });
    else if (role === "action") model.actions.push({ path, text, dir: folderOf(path), info: workflowInfo(text) });
    else if (role === "package") model.packages.push({ path, dir: folderOf(path), json: parseJson(text) ?? {} });
    else if (role === "script") model.scripts.push({ path, text, language: languageOf(path, text) });
    else if (role === "test") model.tests.push({ path, text });
    else if (role === "docs") model.docs.push({ path, text });
    else if (role) model.others.push({ path, text, role });
  }
  return model;
}
