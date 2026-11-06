// What a file is: its language, whether it is a test, whether it is an automation script, and what KIND of automation it is
// (CI check, git hook, cron, dev tool, generator, deploy, one-off; ADR-026). Paths are cut into parts and compared as words:
// no pattern matching on text, so the rules read as the lists they are.

export const CODE_EXTENSIONS = [".mjs", ".js", ".cjs", ".ts", ".mts", ".cts", ".sh", ".bash", ".zsh", ".py"];
const SCRIPT_FOLDERS = ["scripts", "tools", "bin", ".githooks", "githooks", ".husky"];
export const HOOK_FOLDERS = [".githooks", "githooks", ".husky", "hooks"];
const NOT_AUTOMATION = ["node_modules", "fixtures", "__fixtures__", "testdata", "__snapshots__", "vendor", "src"];
const TEST_FOLDERS = ["test", "tests", "__tests__"];
const ORG_FOLDERS = ["actions", "deploy", "orchestration"];
export const STANDARD_NPM = [
  "build", "dev", "start", "test", "lint", "typecheck", "type-check", "format", "check", "clean", "prepare", "postinstall", "preinstall",
  "prepublishOnly", "prepack", "postpack", "preview", "storybook", "build-storybook", "fmt", "serve", "watch", "e2e", "coverage", "release",
  "version", "pretest", "posttest", "prebuild", "postbuild", "predev", "tsc", "android", "ios", "web", "export",
];
const STANDARD_FAMILIES = ["test", "lint", "build", "dev", "check", "format", "typecheck", "e2e", "start"];

const DEPLOY = ["deploy", "promote", "production", "release", "publish", "rollout", "purge", "pages"];
const GENERATE_PREFIX = ["gen", "generate", "build", "emit", "sync", "render", "export", "make", "compile", "subset", "registry", "bundle", "propagate", "update"];
const GENERATE_ANYWHERE = ["-gen", "-docs", "registry", "fanout", "propagate"];
const ONE_OFF = ["migrat", "rename", "codemod", "apply-", "enrich", "backfill", "import-", "oneoff", "one-off", "fix-", "bakeoff", "undo", "cleanup", "move-"];
const CHECK = ["check", "guard", "lint", "ratchet", "audit", "verify", "gate", "probe", "smoke", "conformance", "drift", "scan", "parity", "policy", "budget", "measure", "health", "doctor", "preflight", "test"];
// Names too common to identify a script from a bare mention of its name.
export const GENERIC_NAMES = ["index", "cli", "main", "run", "build", "lib", "utils", "util", "helpers", "common", "config", "setup", "install", "test", "check", "render", "registry", "publish", "report", "verify", "models", "init", "spec", "watch", "deploy", "stats", "kz"];

export const baseOf = (path) => path.slice(path.lastIndexOf("/") + 1);
export const folderOf = (path) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
export const extensionOf = (path) => {
  const base = baseOf(path);
  return base.includes(".") ? base.slice(base.lastIndexOf(".")) : "";
};
export const stemOf = (path) => {
  const base = baseOf(path);
  return base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
};

/** javascript, typescript, python, shell or other, from the extension, else from the shebang. */
export function languageOf(path, text = "") {
  const ext = extensionOf(path);
  if ([".mjs", ".js", ".cjs"].includes(ext)) return "javascript";
  if ([".ts", ".mts", ".cts"].includes(ext)) return "typescript";
  if (ext === ".py") return "python";
  if ([".sh", ".bash", ".zsh", ".command"].includes(ext)) return "shell";
  if ([".yml", ".yaml"].includes(ext)) return "yaml";
  const first = text.split("\n", 1)[0];
  if (!first.startsWith("#!")) return "other";
  if (first.includes("python")) return "python";
  return first.includes("node") ? "javascript" : "shell";
}

/** A test file: `x.test.mjs`, `x.spec.ts`, `x.selftest.mjs`, `x_test.py`, `test_x.py`, or any file under a test folder. */
export function isTestFile(path) {
  const base = baseOf(path);
  const infix = [".test.", ".spec.", ".selftest."].some((m) => base.includes(m));
  const python = base.endsWith("_test.py") || (base.startsWith("test_") && base.endsWith(".py"));
  return infix || python || folderOf(path).split("/").some((part) => TEST_FOLDERS.includes(part));
}

/** Whether a file is an automation script: code in a scripts/tools/bin/hooks folder (or the org repository's own folders). */
export function isScript(repo, path, head = "") {
  const parts = path.split("/");
  const folders = parts.slice(0, -1);
  const base = parts.at(-1);
  if (parts.some((p) => NOT_AUTOMATION.includes(p)) || base.endsWith(".d.ts") || base.includes(".config.")) return false;
  const inAutomationFolder = folders.some((f) => SCRIPT_FOLDERS.includes(f))
    || (repo === ".github" && ORG_FOLDERS.includes(parts[0]))
    || (folders.includes(".github") && folders.includes("actions"))
    || (base.startsWith("entrypoint") && base.endsWith(".sh"))
    || (folders.length === 0 && (base.endsWith(".sh") || base.endsWith(".command")));
  if (!inAutomationFolder) return false;
  const ext = extensionOf(path);
  return CODE_EXTENSIONS.includes(ext) || ext === ".command" || (ext === "" && head.startsWith("#!"));
}

export const isHookScript = (path) => folderOf(path).split("/").some((part) => HOOK_FOLDERS.includes(part)) || folderOf(path).endsWith("tools/githooks");

/** A custom npm script is one whose name is not in the standard list (nor `test:unit`, `lint:fix`… of a standard family). */
export const isStandardNpm = (name) => STANDARD_NPM.includes(name) || STANDARD_FAMILIES.includes(name.split(":")[0]);

const hasAny = (name, words) => words.some((w) => name.includes(w));
const startsWithAny = (name, words) => words.some((w) => name.startsWith(w));

/** The kind from a name alone (stem of a file, npm script name), with the order that decides ties: deploy, generator, one-off, check. */
export function kindOfName(name) {
  const lower = name.toLowerCase();
  if (hasAny(lower, DEPLOY)) return "deploy";
  if (startsWithAny(lower, GENERATE_PREFIX) || hasAny(lower, GENERATE_ANYWHERE)) return "generator";
  if (hasAny(lower, ONE_OFF)) return "one-off";
  if (hasAny(lower, CHECK)) return "CI check";
  return "dev tool";
}

/** The kind of a workflow from what starts it and what it is called. */
export function kindOfWorkflow(file, triggers) {
  const on = new Set(triggers);
  const scheduled = on.has("schedule") && [...on].every((t) => ["schedule", "workflow_dispatch"].includes(t));
  if (scheduled) return "cron";
  if (["release", "deployment", "deployment_status"].some((t) => on.has(t)) || hasAny(file.toLowerCase(), DEPLOY)) return "deploy";
  if (on.size > 0 && [...on].every((t) => t === "workflow_dispatch")) return "one-off";
  return "CI check";
}

/** The kind of a script: where it is called from decides first (hook, cron, agent hook), then its name. */
export function kindOfScript(path, calledByTypes) {
  const types = new Set(calledByTypes);
  if (isHookScript(path) || (types.has("hook") && !types.has("workflow") && !types.has("cron"))) return "git hook";
  if (folderOf(path).split("/").includes("lib") || (types.size === 1 && types.has("script"))) return "library";
  if (types.has("cron")) return "cron";
  if (types.has("agent-hook")) return "agent hook";
  const named = kindOfName(stemOf(path));
  return named === "dev tool" && (types.has("workflow") || types.has("action")) ? "CI check" : named;
}
