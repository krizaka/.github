// Assembles the catalogue (schema `krizaka.automation/1`) from the sources of the active repositories: models, callers, units,
// the machine's part, copies, flags, what changed since the previous catalogue, and the summary. A pure function of its inputs:
// the same files give the same catalogue (only `generatedAt` and `runUrl` come from the run).
import { createHash } from "node:crypto";
import { binTargets, callersOfBin, corpusOf } from "./callers.mjs";
import { markCopies } from "./copies.mjs";
import { FLAGS, flagsOf } from "./flags.mjs";
import { MANIFEST, machineCorpus, machineUnits } from "./machine.mjs";
import { buildModel } from "./model.mjs";
import { pythonPatterns } from "./regexes.mjs";
import { unitsOf } from "./units.mjs";

export const SCHEMA = "krizaka.automation/1";
const hash16 = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

function machineRows(text, owner) {
  return machineUnits(text).map((u) => ({
    id: `${MANIFEST.repo}:${MANIFEST.path}#${u.id}`,
    repo: MANIFEST.repo,
    path: `${MANIFEST.path}#${u.id}`,
    type: u.type,
    kind: u.type === "agent-hook" ? "agent hook" : "cron",
    language: "json",
    lines: 1,
    owner,
    what: u.what || u.command.slice(0, 160),
    header: null,
    manual: false,
    tests: { required: false, has: false },
    regex: { count: 0, longest: 0, over80: 0, long: [] },
    calledBy: [{ type: u.type === "agent-hook" ? "event" : "cron", by: u.type === "agent-hook" ? `${u.schedule}`.trim() || "agent" : u.schedule }],
    documented: true,
    machine: true,
    paused: u.paused,
    command: u.command,
    triggers: [],
    schedules: u.type === "agent-hook" ? [] : [u.schedule],
    lastRun: null,
    copies: [],
    hash: hash16(`${u.command}${u.schedule}`),
  }));
}

function changedOn(old, unit, previous, today) {
  if (old && old.hash === unit.hash) return old.changedAt ?? null;
  return previous ? today : null;
}

/** Date of the last change of each unit, observed from one daily run to the next (the tarball carries no history). */
export function withChanges(units, previous, today) {
  const before = new Map((previous?.units ?? []).map((u) => [u.id, u]));
  return units.map((u) => {
    const old = before.get(u.id);
    return { ...u, changedAt: changedOn(old, u, previous, today) };
  });
}

function countBy(units, key) {
  const out = {};
  for (const u of units) out[u[key]] = (out[u[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Counts of the catalogue: units by kind and type, flags, and per repository. */
export function summaryOf(units) {
  const flagTotals = Object.fromEntries(FLAGS.map((f) => [f, units.filter((u) => u.flags.includes(f)).length]));
  const repos = {};
  for (const u of units) {
    repos[u.repo] ??= { units: 0, ...Object.fromEntries(FLAGS.map((f) => [f, 0])) };
    repos[u.repo].units += 1;
    for (const f of u.flags) repos[u.repo][f] += 1;
  }
  return { units: units.length, byKind: countBy(units, "kind"), byType: countBy(units, "type"), byLanguage: countBy(units, "language"), flags: flagTotals, repos };
}

/**
 * @param sources   [{ name, commit, committedAt, files, runs? }]
 * @param owners    Map(repo name -> team)
 * @param options   { generatedAt, runUrl, previous }
 */
export function buildCatalogue(sources, owners, { generatedAt = new Date().toISOString(), runUrl = null, previous = null } = {}) {
  const models = sources.map(buildModel);
  const manifestText = models.find((m) => m.name === MANIFEST.repo)?.files.get(MANIFEST.path) ?? "";
  const corpora = new Map(models.map((m) => [m.name, corpusOf(m, m.name === MANIFEST.repo ? machineCorpus(manifestText) : [])]));
  const binNames = binTargets(models);
  const binCallers = (name) => callersOfBin(name, corpora);
  const texts = new Map();
  const units = [];
  for (const [i, model] of models.entries()) {
    const pyPatterns = pythonPatterns(Object.fromEntries(model.scripts.filter((s) => s.language === "python").map((s) => [s.path, s.text])));
    const ctx = { repo: model.name, owner: owners.get(model.name) ?? null, corpus: corpora.get(model.name), models, binNames, binCallers, pyPatterns, runs: sources[i].runs ?? new Map() };
    units.push(...unitsOf(model, ctx));
    for (const s of model.scripts) texts.set(`${model.name}:${s.path}`, s.text);
  }
  units.push(...machineRows(manifestText, owners.get(MANIFEST.repo) ?? null));
  markCopies(units, texts);
  const today = generatedAt.slice(0, 10);
  const done = withChanges(units, previous, today).map((u) => ({ ...u, flags: flagsOf(u) }));
  done.sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    schema: SCHEMA,
    generatedAt,
    runUrl,
    repositories: sources.map((s) => ({ name: s.name, commit: s.commit, committedAt: s.committedAt })),
    summary: summaryOf(done),
    units: done,
  };
}
