// The CI door that applies a merged spec to a dev app (krizaka-internal#3879): which app a run may touch, and what the apply changes.
// The target comes from deploy/apps.json (the registry on main of krizaka/.github), never from the caller: a run applies the spec file the
// registry names, on main of the repository the registry names, to a Krizaka-team app. The diff names keys and fields, never a value.
import { GuardError } from "./errors.mjs";
import { DEFAULT_TEAM } from "./doctl.mjs";
import { byCodeUnit, same } from "./drift.mjs";

const SECTIONS = ["services", "workers", "jobs", "static_sites", "functions"];
const isSecret = (env) => env?.type === "SECRET" || String(env?.value).startsWith("EV[");

/**
 * The registry entry a spec-apply run may apply: listed in apps.json, of the Krizaka team (krizaka-prod is out of scope), and the
 * repository's .krizaka-deploy.json names the same app and the same spec file. Throws a GuardError otherwise.
 * @returns {{ app: string, repo: string, spec: string }}
 */
export function applyTarget(registry, app, config) {
  const entry = registry.apps.find((a) => a.app === app);
  if (!entry) throw new GuardError("registry", `${app} is not listed in deploy/apps.json: a spec is applied only to an app the registry lists`);
  const team = entry.team ?? DEFAULT_TEAM;
  if (team !== DEFAULT_TEAM) throw new GuardError("registry", `${app} belongs to the team ${team}: spec-apply applies to the ${DEFAULT_TEAM} dev apps only`);
  if (config.app !== app) throw new GuardError("registry", `the configuration names the app ${config.app}, not ${app}`);
  if (config.spec !== entry.spec) throw new GuardError("registry", `the configuration's spec is ${config.spec}; deploy/apps.json registers ${entry.spec} for ${app}`);
  return { app: entry.app, repo: entry.repo, spec: entry.spec };
}

/**
 * `--only section/name,…`: the spec to apply is the live one with only the listed components taken from the file — a component the
 * file adds but that waits for a founder step (a scheduled job with its own secret) is left out. The app-level fields stay live.
 */
export function scopeToComponents(fileSpec, liveSpec, only) {
  const scoped = structuredClone(liveSpec);
  for (const id of only) {
    const [given, name] = id.split("/");
    // The key comes from the constant list, never from the input (no `__proto__` can reach the assignment below).
    const section = SECTIONS.find((s) => s === given);
    const component = section ? (fileSpec[section] ?? []).find((c) => c.name === name) : undefined;
    if (!section || !component) throw new GuardError("only", `--only ${id}: the spec file has no such component (expected <${SECTIONS.join("|")}>/<name>)`);
    const list = (scoped[section] ??= []);
    const at = list.findIndex((c) => c.name === name);
    if (at >= 0) list[at] = structuredClone(component);
    else list.push(structuredClone(component));
  }
  return scoped;
}

/** One variable list against the live one: added, changed (a secret says « secret replaced »), removed. */
function envChanges(where, next = [], live = []) {
  const liveByKey = new Map(live.map((e) => [e.key, e]));
  const out = [];
  for (const env of next) {
    const before = liveByKey.get(env.key);
    if (!before) {
      out.push(`+ ${where}:${env.key} (added)`);
      continue;
    }
    if (!same(env.value, before.value)) out.push(`~ ${where}:${env.key} (${isSecret(env) || isSecret(before) ? "secret replaced" : "changed"})`);
    for (const field of fieldChanges(env, before, new Set(["key", "value"]))) out.push(`~ ${where}:${env.key}: ${field}`);
  }
  const seen = new Set(next.map((e) => e.key));
  for (const env of live) if (!seen.has(env.key)) out.push(`- ${where}:${env.key} (removed)`);
  return out;
}

/** The fields of an object that differ, `envs` and the component sections aside. */
const fieldChanges = (next = {}, live = {}, skip = new Set()) =>
  [...new Set([...Object.keys(next), ...Object.keys(live)])].filter((k) => !skip.has(k) && !same(next[k], live[k])).sort(byCodeUnit);

/**
 * What applying `next` (the merged spec) to the app whose spec is `live` changes: one line per field, component or variable — names
 * only, never a value. Empty when the apply changes nothing.
 */
export function specChanges(next, live) {
  const out = fieldChanges(next, live, new Set(["envs", ...SECTIONS])).map((k) => `~ ${k}`);
  out.push(...envChanges("app", next.envs, live.envs));
  for (const section of SECTIONS) {
    const liveByName = new Map((live[section] ?? []).map((c) => [c.name, c]));
    for (const component of next[section] ?? []) {
      const where = `${section}/${component.name}`;
      const before = liveByName.get(component.name);
      if (!before) {
        out.push(`+ ${where} (component added)`);
        continue;
      }
      out.push(...fieldChanges(component, before, new Set(["envs"])).map((k) => `~ ${where}: ${k}`));
      out.push(...envChanges(where, component.envs, before.envs));
    }
    const names = new Set((next[section] ?? []).map((c) => c.name));
    for (const name of liveByName.keys()) if (!names.has(name)) out.push(`- ${section}/${name} (component removed)`);
  }
  return out;
}
