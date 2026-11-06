// Builds the rows of one repository: for each automation (script, workflow, template, composite action, custom npm script, hook
// configuration, agent hook, Dockerfile entrypoint) its kind, language, size, header, tests, regexes and callers. Facts are read
// from the files, never typed; the only guesses are the ones the ADR names (callers by name and path, kind by name).
import { createHash } from "node:crypto";
import { baseOf, isStandardNpm, kindOfName, kindOfScript, kindOfWorkflow, stemOf } from "./classify.mjs";
import { callersOfAction, callersOfNpm, callersOfScript, callersOfWorkflow, mentions } from "./callers.mjs";
import { headerOf } from "./header.mjs";
import { jsPatterns, measureOf, patternsOf } from "./regexes.mjs";
import { shellPatterns } from "./shell-patterns.mjs";

const TESTED_KINDS = new Set(["CI check", "generator", "deploy", "cron", "git hook"]);
const SCRIPT_EXTENSIONS = [".sh", ".py", ".mjs", ".js", ".cjs", ".ts"];
const HOOK_TOOLS = ["pre-commit install", "pre-commit run", "lefthook", "lint-staged", "husky"];
const linesOf = (text) => (text === "" ? 0 : text.split("\n").length - Number(text.endsWith("\n")));
export const hashOf = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

function base(repo, path, type, text, owner) {
  return { id: `${repo}:${path}`, repo, path, type, owner, lines: linesOf(text), hash: hashOf(text), machine: false, triggers: [], schedules: [], lastRun: null, copies: [] };
}

function testStem(path) {
  let stem = stemOf(path);
  for (const mark of [".test", ".spec", ".selftest"]) if (stem.endsWith(mark)) stem = stem.slice(0, -mark.length);
  if (stem.startsWith("test_")) stem = stem.slice(5);
  if (stem.endsWith("_test")) stem = stem.slice(0, -5);
  return stem.replaceAll("_", "-");
}

/** Whether a test file exists for a script: same name, or a test that names it. */
export function hasTest(path, tests) {
  const stem = stemOf(path).replaceAll("_", "-");
  return tests.some((t) => testStem(t.path) === stem || mentions(t.text, path));
}

function scriptUnit(model, script, ctx) {
  const { repo, owner, corpus, binNames, pyPatterns } = ctx;
  const header = headerOf(script.text, script.language);
  const calledBy = callersOfScript(script.path, corpus);
  const bin = binNames.get(`${repo}\t${script.path}`);
  if (bin) calledBy.push(...ctx.binCallers(bin));
  const kind = kindOfScript(script.path, calledBy.map((c) => c.type));
  const patterns = script.language === "python" ? (pyPatterns[script.path] ?? []) : patternsOf(script.text, script.language, script.path);
  return {
    ...base(repo, script.path, "script", script.text, owner),
    kind,
    language: script.language,
    what: header.what,
    header: header.present,
    manual: header.manual,
    tests: { required: TESTED_KINDS.has(kind), has: hasTest(script.path, model.tests) },
    regex: measureOf(patterns),
    calledBy,
    documented: model.docs.some((d) => mentions(d.text, script.path)),
  };
}

function workflowCallers(model, file, type, models) {
  if (type === "template") return [{ type: "template", by: "conformance fan-out" }];
  return type === "action" ? callersOfAction(model, file.dir, models) : callersOfWorkflow(model, file.path, models);
}

function workflowUnit(model, file, type, ctx) {
  const { repo, owner, models, runs } = ctx;
  const header = headerOf(file.text, "yaml");
  const triggers = file.info.events;
  const calledBy = workflowCallers(model, file, type, models);
  const patterns = [...file.info.runs.flatMap(shellPatterns), ...file.info.scripts.flatMap((s) => jsPatterns(s, "inline.js"))];
  const kind = type === "action" ? kindOfName(file.dir.split("/").at(-1)) : kindOfWorkflow(baseOf(file.path), triggers);
  return {
    ...base(repo, file.path, type, file.text, owner),
    kind: type === "action" && kind === "dev tool" ? "CI check" : kind,
    language: "yaml",
    what: header.what || file.info.name || "",
    header: header.present,
    manual: header.manual,
    tests: { required: false, has: false },
    regex: measureOf(patterns),
    calledBy,
    documented: false,
    triggers,
    schedules: file.info.schedules,
    lastRun: runs.get(file.path) ?? null,
    parseError: file.info.error ?? null,
  };
}

function npmUnits(model, ctx) {
  const { repo, owner, corpus } = ctx;
  const out = [];
  for (const pkg of model.packages) {
    for (const [name, cmd] of Object.entries(pkg.json.scripts ?? {})) {
      if (isStandardNpm(name)) continue;
      const command = String(cmd);
      out.push({
        ...base(repo, `${pkg.path}#${name}`, "npm-script", command, owner),
        kind: kindOfName(name),
        language: "npm",
        what: command.slice(0, 160),
        header: null,
        manual: false,
        tests: { required: false, has: false },
        regex: measureOf(shellPatterns(command)),
        calledBy: callersOfNpm(pkg, name, corpus),
        documented: model.docs.some((d) => d.text.includes(`npm run ${name}`)),
      });
    }
  }
  return out;
}

function hookConfigUnits(model, ctx) {
  const active = ctx.corpus.some((e) => e.type !== "script" && HOOK_TOOLS.some((tool) => e.text.includes(tool)));
  return model.others.filter((o) => o.role === "hook-config").map((o) => ({
    ...base(ctx.repo, o.path, "hook-config", o.text, ctx.owner),
    kind: "git hook",
    language: "yaml",
    what: headerOf(o.text, "yaml").what,
    header: headerOf(o.text, "yaml").present,
    manual: false,
    tests: { required: false, has: false },
    regex: measureOf(shellPatterns(o.text)),
    calledBy: active ? [{ type: "hook", by: "a hook framework" }] : [],
    documented: false,
  }));
}

function agentHookUnits(model, ctx) {
  const settings = model.others.find((o) => o.role === "agent-settings");
  if (!settings) return [];
  let hooks = {};
  try {
    hooks = JSON.parse(settings.text).hooks ?? {};
  } catch {
    return [];
  }
  return Object.entries(hooks).flatMap(([event, groups]) => (groups ?? []).flatMap((group, i) => (group.hooks ?? []).map((hook, j) => ({
    ...base(ctx.repo, `${settings.path}#${event}[${i}.${j}]`, "agent-hook", String(hook.command ?? ""), ctx.owner),
    kind: "agent hook",
    language: "json",
    what: String(hook.command ?? "").slice(0, 160),
    header: null,
    manual: false,
    tests: { required: false, has: false },
    regex: measureOf(shellPatterns(String(hook.command ?? ""))),
    calledBy: [{ type: "event", by: `${event} ${group.matcher ?? ""}`.trim() }],
    documented: false,
  }))));
}

function entrypointUnits(model, ctx) {
  return model.others.filter((o) => o.role === "docker" && baseOf(o.path).startsWith("Dockerfile")).flatMap((o) => {
    const lines = o.text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("ENTRYPOINT") || l.startsWith("CMD"));
    const runs = lines.find((l) => SCRIPT_EXTENSIONS.some((ext) => l.includes(ext)));
    if (!runs) return [];
    return [{
      ...base(ctx.repo, o.path, "entrypoint", o.text, ctx.owner),
      kind: "deploy",
      language: "dockerfile",
      what: runs.slice(0, 160),
      header: null,
      manual: false,
      tests: { required: false, has: false },
      regex: measureOf([]),
      calledBy: [{ type: "docker", by: "the image" }],
      documented: false,
    }];
  });
}

/** Every unit of one repository. `ctx` carries the repository's owner, corpus, the other models and the Python patterns. */
export function unitsOf(model, ctx) {
  return [
    ...model.scripts.map((s) => scriptUnit(model, s, ctx)),
    ...model.workflows.map((w) => workflowUnit(model, w, "workflow", ctx)),
    ...model.templates.map((w) => workflowUnit(model, w, "template", ctx)),
    ...model.actions.map((a) => workflowUnit(model, a, "action", ctx)),
    ...npmUnits(model, ctx),
    ...hookConfigUnits(model, ctx),
    ...agentHookUnits(model, ctx),
    ...entrypointUnits(model, ctx),
  ];
}
