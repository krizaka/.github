// Who calls an automation. Every repository gives a corpus of "callers": its workflows and actions (parsed YAML strings), npm
// scripts (parsed package.json), hook files and configs, Makefiles, Dockerfiles, agent settings, tool configs, the other scripts
// and, for krizaka-agents, the machine's crons and hooks. A script is called by whoever's text names its path, or its file name as
// a whole word (the heuristic of the ADR: a wrong « nothing calls it » is fixed by naming the tool in its README, never by an
// exception list). Documents are kept apart: they never call, they only show that a person knows the tool.
import { GENERIC_NAMES, baseOf, extensionOf, folderOf, isHookScript, stemOf } from "./classify.mjs";
import { usesTarget } from "./workflows.mjs";

const NAME_CHARS = "_-";
const SPLITTERS = [" ", "\t", "\n", ";", "&", "|", "(", ")", '"', "'", "`", "=", ","];
const isNameChar = (c) => c !== undefined && (c.toLowerCase() !== c.toUpperCase() || (c >= "0" && c <= "9") || NAME_CHARS.includes(c));

/** The whole-word occurrences of `needle` in `text`: the characters around it are not part of a name. */
export function hasWord(text, needle, { dotAfterOk = true } = {}) {
  let at = text.indexOf(needle);
  while (at !== -1) {
    const before = text[at - 1];
    const after = text[at + needle.length];
    if (!isNameChar(before) && !isNameChar(after) && (dotAfterOk || after !== ".")) return true;
    at = text.indexOf(needle, at + 1);
  }
  return false;
}

/** Whether a text names the file at `path`: by a path of two parts or more, or by its file name as a whole word. */
export function mentions(text, path) {
  const parts = path.split("/");
  const stem = stemOf(path);
  const ext = extensionOf(path);
  const stripped = (i) => `${parts.slice(i, -1).join("/")}${parts.length - 1 > i ? "/" : ""}${stem}`;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (text.includes(parts.slice(i).join("/"))) return true;
    if (["'", '"', "`"].some((q) => text.includes(stripped(i) + q))) return true;
  }
  const identifiable = parts.length === 1 || (ext !== "" && !GENERIC_NAMES.includes(stem));
  if (identifiable && stem.length > 3 && hasWord(text, baseOf(path), { dotAfterOk: ext !== "" })) return true;
  if ((ext === ".ts" || ext === ".mts") && stem.length > 3 && !GENERIC_NAMES.includes(stem)) return text.includes(`/${stem}.js`);
  if (ext === ".py" && stem.length > 3 && !GENERIC_NAMES.includes(stem)) return text.includes(`import ${stem}`) || text.includes(`from ${stem} import`);
  return false;
}

const corpusEntry = (type, by, path, text) => ({ type, by, path, text });

function packageCallers(pkg) {
  const entries = Object.entries(pkg.json.scripts ?? {}).map(([name, cmd]) => corpusEntry("npm", `npm:${pkg.dir || "."}#${name}`, pkg.path, String(cmd)));
  const bin = pkg.json.bin;
  const bins = typeof bin === "string" ? { [stemOf(pkg.json.name ?? "bin")]: bin } : (bin ?? {});
  const targets = Object.entries(bins).map(([name, target]) => corpusEntry("npm", `bin:${name}`, pkg.path, `${pkg.dir ? `${pkg.dir}/` : ""}${String(target).replace("./", "")}`));
  return [...entries, ...targets];
}

const ROLE_TYPES = { "hook-config": "hook", make: "make", docker: "docker", "agent-settings": "agent-hook", config: "config", "git-config": "hook" };

/** Everything in the repository that can call an automation. */
export function corpusOf(model, machine = []) {
  const out = [];
  for (const w of model.workflows) out.push(corpusEntry("workflow", `workflow:${baseOf(w.path)}`, w.path, w.info.strings.join("\n")));
  for (const a of model.actions) out.push(corpusEntry("action", `action:${a.dir}`, a.path, a.info.strings.join("\n")));
  for (const t of model.templates) out.push(corpusEntry("workflow", `template:${baseOf(t.path)}`, t.path, t.info.strings.join("\n")));
  for (const p of model.packages) out.push(...packageCallers(p));
  for (const o of model.others) out.push(corpusEntry(ROLE_TYPES[o.role], `${ROLE_TYPES[o.role]}:${o.path}`, o.path, o.text));
  for (const s of model.scripts) if (!isHookScript(s.path)) out.push(corpusEntry("script", `script:${s.path}`, s.path, s.text));
  for (const s of model.scripts) if (isHookScript(s.path)) out.push(corpusEntry("hook", `hook:${s.path}`, s.path, s.text));
  return [...out, ...machine];
}

/** The callers of a script file inside its repository. */
export function callersOfScript(path, corpus) {
  const found = [];
  const folder = folderOf(path);
  for (const entry of corpus) {
    if (entry.path === path || !entry.text) continue;
    if (mentions(entry.text, path)) found.push({ type: entry.type, by: entry.by });
    else if (entry.type === "script" && folderOf(entry.path) === folder && entry.text.includes(`./${baseOf(path)}`)) found.push({ type: "script", by: entry.by });
  }
  if (isHookScript(path) || folder.endsWith("githooks")) {
    const hooks = corpus.find((e) => e.text.includes("hooksPath") && e.text.includes(baseOf(folder)));
    if (hooks) found.push({ type: "hook", by: `core.hooksPath via ${hooks.by}` });
  }
  return found;
}

const wordsOf = (text) => {
  let words = [text];
  for (const splitter of SPLITTERS) words = words.flatMap((w) => w.split(splitter));
  return words.filter(Boolean);
};

/** The callers of a custom npm script: another script, workflow, hook, Makefile or Dockerfile that runs it by name. */
export function callersOfNpm(pkg, name, corpus) {
  const own = `npm:${pkg.dir || "."}#${name}`;
  const found = [];
  for (const entry of corpus) {
    if (entry.by === own || !["npm", "workflow", "action", "hook", "make", "docker", "agent-hook"].includes(entry.type)) continue;
    const words = wordsOf(entry.text);
    const at = words.findIndex((w, i) => w === name && ["run", "run-script", "run-s", "run-p", "exec", "turbo", "yarn", "pnpm", "bun"].includes(words[i - 1] ?? ""));
    if (at !== -1) found.push({ type: entry.type, by: entry.by });
  }
  const scripts = Object.keys(pkg.json.scripts ?? {});
  if ((name.startsWith("pre") && scripts.includes(name.slice(3))) || (name.startsWith("post") && scripts.includes(name.slice(4)))) found.push({ type: "npm", by: "lifecycle" });
  return found;
}

/** The callers of a workflow or a composite action: events, or the `uses:` of other workflows (any repository). */
export function callersOfWorkflow(model, path, models) {
  const found = [];
  const own = model.workflows.find((w) => w.path === path)?.info;
  for (const event of own?.events ?? []) if (event !== "workflow_call") found.push({ type: "event", by: event });
  for (const m of models) {
    for (const user of [...m.workflows, ...m.actions]) {
      for (const uses of user.info.uses) {
        const target = usesTarget(uses, m.name);
        if (target?.kind === "workflow" && target.repo === model.name && target.path === path) found.push({ type: "workflow", by: `${m.name}:${baseOf(user.path)}` });
      }
    }
  }
  return found;
}

export function callersOfAction(model, dir, models) {
  const found = [];
  for (const m of models) {
    for (const user of [...m.workflows, ...m.actions]) {
      for (const uses of user.info.uses) {
        const target = usesTarget(uses, m.name);
        if (target?.kind === "action" && target.repo === model.name && (target.path === dir || `.github/${target.path}` === dir)) found.push({ type: "workflow", by: `${m.name}:${baseOf(user.path)}` });
      }
    }
  }
  return found;
}

/** A published bin is called wherever its name is run: Map(bin name -> { repo, path }) over all repositories. */
export function binTargets(models) {
  const map = new Map();
  for (const m of models) {
    for (const pkg of m.packages) {
      const bin = pkg.json.bin;
      const bins = typeof bin === "string" ? { [stemOf(pkg.json.name ?? "bin")]: bin } : (bin ?? {});
      for (const [name, target] of Object.entries(bins)) map.set(`${m.name}\t${pkg.dir ? `${pkg.dir}/` : ""}${String(target).replace("./", "")}`, name);
    }
  }
  return map;
}

/** The callers of a bin by name, over every repository's npm scripts, workflows, hooks and agent settings. */
export function callersOfBin(name, corpora) {
  const found = [];
  for (const [repo, corpus] of corpora) {
    for (const entry of corpus) {
      if (!["npm", "workflow", "hook", "agent-hook", "action"].includes(entry.type) || entry.by.startsWith("bin:")) continue;
      if (wordsOf(entry.text).includes(name)) found.push({ type: entry.type, by: `${repo}/${entry.by}` });
    }
  }
  return found;
}
