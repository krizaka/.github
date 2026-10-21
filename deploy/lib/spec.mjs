// App Platform specs: the indexing assertion and the merge of a repository's spec with the live one.
// A spec is applied whole: a variable the file leaves without a value would be BLANKED in the app. The merge carries the
// live value over (DigitalOcean returns secrets encrypted, `EV[…]`, and accepts them back), renders `__NAME__` placeholders
// from the secret provider, and refuses what it cannot fill. Only keys are ever named in an error; never a value.
import { parse } from "yaml";
import { GuardError } from "./errors.mjs";

export const INDEXING_KEY = "APP_SEARCH_INDEXING";
const SECTIONS = ["services", "workers", "jobs", "static_sites", "functions"];

export const parseSpec = (text) => parse(text);
/**
 * What is sent to doctl: JSON, never YAML. doctl's parser reads YAML 1.1, where an unquoted `off` / `on` / `no` is a boolean:
 * a YAML dump of APP_SEARCH_INDEXING=off is refused (« cannot unmarshal bool »), or worse, turned into `false`.
 */
export const dumpSpec = (spec) => `${JSON.stringify(spec, null, 2)}\n`;

/** Every environment variable of a spec as { where, env }, `where` being « <section>/<component> » or « app ». */
export function envEntries(spec) {
  const out = [];
  for (const env of spec?.envs ?? []) out.push({ where: "app", env });
  for (const section of SECTIONS) {
    for (const component of spec?.[section] ?? []) {
      for (const env of component.envs ?? []) out.push({ where: `${section}/${component.name}`, env });
    }
  }
  return out;
}

/**
 * APP_SEARCH_INDEXING must say what this environment is: `on` for an indexed site, `off` for a noindex one.
 * - a component that declares the variable must hold exactly the expected value;
 * - with `variable: true` (default) at least one component must declare it (an app that silently defaults is how it flipped);
 * - with `variable: false` the app has no such switch (krizaka.com is always indexed): declaring the opposite is refused.
 * Returns the components that declare it.
 */
export function assertIndexing(spec, { expect, variable = true, label = "spec" }) {
  if (expect !== "on" && expect !== "off") {
    throw new GuardError("indexing", `the configuration must say indexing: "on" or "off" (got ${JSON.stringify(expect)})`);
  }
  const declared = envEntries(spec).filter(({ env }) => env.key === INDEXING_KEY);
  for (const { where, env } of declared) {
    if (String(env.value) !== expect) {
      throw new GuardError("indexing", `${label}: ${INDEXING_KEY} is '${env.value}' on ${where}, this environment expects '${expect}'`);
    }
  }
  if (variable && declared.length === 0) {
    throw new GuardError("indexing", `${label}: ${INDEXING_KEY} is not set; this environment expects '${expect}' explicitly`);
  }
  return declared.map((d) => d.where);
}

const PLACEHOLDER = /__([A-Z][A-Z0-9_]*)__/g;

/** Replaces `__NAME__` in every string of the spec; collects the names that have no value. */
async function render(node, secret, missing) {
  if (typeof node === "string") {
    const names = [...node.matchAll(PLACEHOLDER)].map((m) => m[1]);
    if (!names.length) return node;
    let out = node;
    for (const name of new Set(names)) {
      const value = await secret(name);
      if (value === undefined || value === "") missing.add(name);
      else out = out.split(`__${name}__`).join(value);
    }
    return out;
  }
  if (Array.isArray(node)) return Promise.all(node.map((n) => render(n, secret, missing)));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = await render(v, secret, missing);
    return out;
  }
  return node;
}

/**
 * The spec to apply: the repository's file, completed from the live app.
 *  - `__NAME__` placeholders come from `secret(NAME)`;
 *  - a variable without a value — or whose value is its own placeholder, `KEY: __KEY__` — takes the live one (same component,
 *    same key), else `secret(KEY)`, else it is a problem;
 *  - a live variable the file does not mention would be DELETED by the apply: a problem, unless listed in `allowDrop`;
 *  - a plain (non-secret) variable whose value differs from the live one would be CHANGED: a problem, unless listed in
 *    `allowChange` — the live app is often ahead of the file (a limit lowered by hand), and an apply must not silently revert it.
 * Returns { spec, carried, resolved, problems } — keys only, and the values of plain variables when they differ.
 */
export async function mergeWithLive(fileSpec, liveSpec, { secret = async () => undefined, allowDrop = [], allowChange = [] } = {}) {
  const missing = new Set();
  const draft = structuredClone(fileSpec);
  // `KEY: __KEY__` is a value-less variable written the Orazaka way: the live value wins, the vault is the fallback.
  for (const { env } of envEntries(draft)) if (env.value === `__${env.key}__`) delete env.value;
  const spec = await render(draft, secret, missing);
  const carried = [];
  const resolved = [];
  const problems = [];
  for (const name of missing) problems.push(`placeholder __${name}__ has no value (KRIZAKA_SECRET_${name} or the vault)`);

  const liveByWhere = new Map();
  for (const { where, env } of envEntries(liveSpec)) {
    if (!liveByWhere.has(where)) liveByWhere.set(where, new Map());
    liveByWhere.get(where).set(env.key, env);
  }
  const containers = [{ where: "app", envs: spec.envs }];
  for (const section of SECTIONS) for (const c of spec[section] ?? []) containers.push({ where: `${section}/${c.name}`, envs: c.envs });

  for (const { where, envs } of containers) {
    const live = liveByWhere.get(where) ?? new Map();
    const seen = new Set();
    for (const env of envs ?? []) {
      seen.add(env.key);
      const fromLive = live.get(env.key);
      if (env.value !== undefined && env.value !== null && env.value !== "") {
        const plain = env.type !== "SECRET" && fromLive?.type !== "SECRET" && !String(fromLive?.value).startsWith("EV[");
        if (plain && fromLive?.value !== undefined && String(fromLive.value) !== String(env.value) && !allowChange.includes(env.key) && !allowChange.includes(`${where}:${env.key}`)) {
          problems.push(`${where}: ${env.key} is '${fromLive.value}' in the live app and '${env.value}' in the file — applying would change it (fix the file, or --allow-change ${env.key})`);
        }
        continue;
      }
      if (fromLive?.value !== undefined && fromLive.value !== "") {
        env.value = fromLive.value;
        carried.push(`${where}:${env.key}`);
        continue;
      }
      const fromVault = await secret(env.key);
      if (fromVault) {
        env.value = fromVault;
        resolved.push(`${where}:${env.key}`);
        continue;
      }
      problems.push(`${where}: ${env.key} has no value in the file, none in the live app, none in the vault — applying would blank it`);
    }
    for (const key of live.keys()) {
      if (!seen.has(key) && !allowDrop.includes(key) && !allowDrop.includes(`${where}:${key}`)) {
        problems.push(`${where}: ${key} is set in the live app but not in the file — applying would delete it (add it to the file, or --allow-drop ${key})`);
      }
    }
  }
  return { spec, carried, resolved, problems };
}
