// « The spec file equals the live spec »: what `deploy --apply` would CHANGE, read-only. Plain (non-secret) variable values, and the
// structure around them (domains, ingress, component names), must match the live app; a secret's value is never compared.
import { readFile as readFileFs } from "node:fs/promises";
import { resolve } from "node:path";
import { GuardError } from "./errors.mjs";
import { assertContext } from "./doctl.mjs";
import { envEntries, mergeWithLive, parseSpec } from "./spec.mjs";

const SECTIONS = ["services", "workers", "jobs", "static_sites", "functions"];
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
const same = (a, b) => JSON.stringify(sortKeys(a ?? null)) === JSON.stringify(sortKeys(b ?? null));

/** App Platform stores every ingress match with a path (an authority-only rule gets `path: { prefix: "/" }`): compare like with like. */
const normalizedIngress = (ingress) =>
  ingress ? { ...ingress, rules: (ingress.rules ?? []).map((r) => ({ ...r, match: { ...r.match, path: r.match?.path ?? { prefix: "/" } } })) } : ingress;

/** Differences between a file spec and the live one: strings, empty when they agree. */
export async function specDrift(fileSpec, liveSpec) {
  const out = [];
  if (!same(normalizedIngress(fileSpec.ingress), normalizedIngress(liveSpec.ingress))) out.push("ingress differs from the live app");
  if (!same(fileSpec.domains, liveSpec.domains)) out.push("domains differ from the live app");
  for (const section of SECTIONS) {
    const names = (s) => (s?.[section] ?? []).map((c) => c.name).sort().join(",");
    if (names(fileSpec) !== names(liveSpec)) out.push(`${section}: components differ (file: ${names(fileSpec) || "none"}; live: ${names(liveSpec) || "none"})`);
  }
  // A value that embeds `__NAME__` (a host the vault supplies at apply time, e.g. jdbc:postgresql://__DATABASE_HOST__:25061/db) is a
  // template: it equals the live value when the live one fits the pattern around the placeholder.
  const liveEnvs = new Map(envEntries(liveSpec).map(({ where, env }) => [`${where}:${env.key}`, env]));
  for (const { where, env } of envEntries(fileSpec)) {
    const v = env.value;
    if (typeof v !== "string" || v === `__${env.key}__` || !/__[A-Z0-9_]+__/.test(v)) continue;
    const liveValue = liveEnvs.get(`${where}:${env.key}`)?.value;
    if (typeof liveValue !== "string") continue;
    const pattern = v.split(/__[A-Z0-9_]+__/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/:]+");
    if (new RegExp(`^${pattern}$`).test(liveValue)) env.value = liveValue;
  }
  // Plain values that differ, variables missing either way; a value-less variable takes the live one (not a drift).
  const merged = await mergeWithLive(fileSpec, liveSpec, { secret: async () => "x" });
  out.push(...merged.problems);
  return out;
}

/** `krizaka-deploy drift`: throws a GuardError when the repository's spec is not the live one. */
export async function driftCommand(config, { doctl, readFile = readFileFs, env = process.env, argv = [], log = console.log }) {
  assertContext({ env, argv });
  await doctl.assertTeam();
  const apps = await doctl.run(["apps", "list", "-o", "json"]).then((t) => JSON.parse(t || "[]"));
  const found = apps.filter((a) => a?.spec?.name === config.app || a?.id === config.app);
  if (found.length !== 1) throw new GuardError("app", `${found.length} apps match '${config.app}' in the Krizaka team (expected exactly one)`);
  const live = (await doctl.json(["apps", "get", found[0].id]))?.spec;
  const file = parseSpec(await readFile(resolve(config.root, config.spec), "utf8"));
  const drift = await specDrift(file, live);
  if (drift.length) throw new GuardError("drift", `${config.spec} is not the live spec of ${config.app}:\n  - ${drift.join("\n  - ")}`);
  log(`${config.spec} equals the live spec of ${config.app}`);
}
