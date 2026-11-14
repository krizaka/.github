#!/usr/bin/env node
// SonarCloud against the policy (krizaka-internal#3553): the default quality gate and the visibility of the projects are declared in
// policy.json (`sonar`) and checked, not remembered. Founder decision 9 was applied in SonarCloud then rolled back by hand, and two
// private repositories (kridoc, krizaka-infra) had public projects: nothing noticed.
//
//   node scripts/sonar-drift.mjs      SONAR_TOKEN and GH_TOKEN in the environment; prints « no drift » or each difference, exit 1 on any
//
// The rules are pure functions over the API answers; the HTTP port is injected, so the tests need no network. A project is matched
// to its repository by its name, else by its key (`krizaka_<repo>`); a project that matches no repository is listed as a note, never a
// failure (renamed repositories keep an old key), and a repository without a project is fine.
import { pathToFileURL } from "node:url";

import { loadPolicy } from "./policy.mjs";

const SONAR = "https://sonarcloud.io";
const GITHUB = "https://api.github.com";
const ORG = "krizaka";
const KEY_PREFIX = `${ORG}_`;

const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ");
const show = (c) => `${c.op} ${c.error}`;

/** The default gate of `api/qualitygates/list`, as `{ name, conditions: { metric: { op, error } } }`; null when there is none. */
export function defaultGate(list) {
  const gate = (list?.qualitygates ?? []).find((g) => g.isDefault);
  if (!gate) return null;
  return { name: gate.name, conditions: Object.fromEntries((gate.conditions ?? []).map((c) => [c.metric, { op: c.op, error: c.error }])) };
}

/** Every difference between the declared gate and SonarCloud's default gate, one readable line each. */
export function gateDrift(declared, actual) {
  if (!actual) return ["quality gate: SonarCloud has no default gate"];
  const out = [];
  if (declared.name !== actual.name) out.push(`quality gate: the default gate is « ${oneLine(actual.name)} », the policy says « ${declared.name} »`);
  for (const [metric, want] of Object.entries(declared.conditions)) {
    const got = actual.conditions[metric];
    if (!got) out.push(`quality gate: condition ${metric} (${show(want)}) is missing in SonarCloud`);
    else if (got.op !== want.op || got.error !== want.error) out.push(`quality gate: condition ${metric} is ${oneLine(show(got))} in SonarCloud, ${show(want)} in the policy`);
  }
  for (const [metric, got] of Object.entries(actual.conditions)) {
    if (!(metric in declared.conditions)) out.push(`quality gate: condition ${oneLine(metric)} (${oneLine(show(got))}) is in SonarCloud, not in the policy`);
  }
  return out;
}

/** The repository a project belongs to: its name, else its key without the org prefix; undefined when none. */
export function repoOf(project, repos) {
  const byName = new Map(repos.map((r) => [r.name, r]));
  return byName.get(project.name) ?? byName.get(String(project.key).replace(KEY_PREFIX, ""));
}

/** The visibility drift: a private repository's project that is not private (`rule` is `sonar.privateRepositoryProject`), and the notes. */
export function visibilityDrift(rule, projects, repos) {
  const problems = [];
  const notes = [];
  for (const p of projects) {
    const repo = repoOf(p, repos);
    if (!repo) notes.push(`project ${oneLine(p.key)} matches no repository`);
    else if (repo.visibility === "private" && p.visibility !== rule) problems.push(`visibility: project ${oneLine(p.key)} is ${oneLine(p.visibility)} but its repository ${repo.name} is private`);
  }
  return { problems, notes };
}

/** All the drift: the problems (fail) and the notes (printed). */
export function drift(policy, { gates, projects, repos }) {
  const { qualityGate, privateRepositoryProject } = policy.sonar;
  const vis = visibilityDrift(privateRepositoryProject, projects, repos);
  return { problems: [...gateDrift(qualityGate, defaultGate(gates)), ...vis.problems], notes: vis.notes };
}

async function pages(http, url, headers, field, size) {
  const all = [];
  for (let page = 1; ; page++) {
    const body = await http(`${url}${url.includes("?") ? "&" : "?"}p=${page}&page=${page}`, { headers });
    const items = field ? body[field] : body;
    all.push(...items);
    if (items.length < size) return all;
  }
}

/** Reads the three answers through the injected port `http(url, { headers }) -> parsed JSON`. */
export async function fetchState(http, { sonarToken, ghToken }) {
  const sonar = { authorization: `Bearer ${sonarToken}` };
  const gh = { authorization: `Bearer ${ghToken}`, accept: "application/vnd.github+json" };
  const gates = await http(`${SONAR}/api/qualitygates/list?organization=${ORG}`, { headers: sonar });
  const projects = await pages(http, `${SONAR}/api/projects/search?organization=${ORG}&ps=500`, sonar, "components", 500);
  const repos = await pages(http, `${GITHUB}/orgs/${ORG}/repos?type=all&per_page=100`, gh, null, 100);
  return { gates, projects, repos };
}

const realHttp = async (url, { headers }) => {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${new URL(url).host}${new URL(url).pathname}: ${res.status}`);
  return res.json();
};

export async function main(env = process.env, http = realHttp, log = console) {
  if (!env.SONAR_TOKEN || !env.GH_TOKEN) throw new Error("sonar-drift: SONAR_TOKEN and GH_TOKEN are required");
  const state = await fetchState(http, { sonarToken: env.SONAR_TOKEN, ghToken: env.GH_TOKEN });
  const { problems, notes } = drift(loadPolicy(), state);
  for (const n of notes) log.log(`note: ${n}`);
  if (!problems.length) {
    log.log("no drift");
    return 0;
  }
  for (const p of problems) log.log(`DRIFT ${p}`);
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main();
  } catch (e) {
    console.error(oneLine(e.message));
    process.exitCode = 2;
  }
}
