// `krizaka-deploy drift-all`: every app of the team doctl is authenticated for against the spec its repository keeps. Report only — it never
// applies. apps.json holds the apps of every team (`team`, default the Krizaka team): a run reads only the apps of its own team, so the
// production team (krizaka-prod) is checked with its own token (KRIZAKA_DO_TEAM=krizaka-prod and DIGITALOCEAN_ACCESS_TOKEN set).
import { appendFileSync } from "node:fs";
import { assertContext, DEFAULT_TEAM } from "./doctl.mjs";
import { parseSpec } from "./spec.mjs";
import { specDrift } from "./drift.mjs";

const raw = (repo, spec) => `https://raw.githubusercontent.com/${repo}/main/${spec}`;

/** A private repository's spec (kridoc) answers 404 to an anonymous read: the token is sent when the run has one. */
const readHeaders = (env) => {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  return { "user-agent": "krizaka-deploy", ...(token ? { authorization: `Bearer ${token}` } : {}) };
};

/** The one command that makes a dev app equal its merged spec again: the deploy-spec-apply workflow of krizaka/.github. */
export const applyFix = (app) => `run deploy-spec-apply for ${app}: gh workflow run deploy-spec-apply.yml -R krizaka/.github -f app=${app}`;

/** @returns { ok: string[], drift: { app, differences: string[], fix?: string }[] } */
export async function driftAll({ registry, doctl, fetch = globalThis.fetch, env = process.env, argv = [] }) {
  assertContext({ env, argv });
  const team = await doctl.assertTeam();
  const apps = registry.apps.filter((a) => (a.team ?? DEFAULT_TEAM) === team);
  const live = JSON.parse((await doctl.run(["apps", "list", "-o", "json"])) || "[]");
  const byName = new Map(live.map((a) => [a?.spec?.name, a?.spec]));
  const ok = [];
  const drift = [];
  for (const { app, repo, spec } of apps) {
    const liveSpec = byName.get(app);
    if (!liveSpec) {
      drift.push({ app, differences: [`listed in apps.json but not in the team ${team}`] });
      continue;
    }
    let res;
    try {
      res = await fetch(raw(repo, spec), { headers: readHeaders(env), signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      drift.push({ app, differences: [`cannot read ${repo}/${spec}: ${error.message}`] });
      continue;
    }
    if (res.status !== 200) {
      drift.push({ app, differences: [`cannot read ${repo}/${spec} (GitHub answered ${res.status})`] });
      continue;
    }
    let differences;
    let parsed = true;
    try {
      differences = await specDrift(parseSpec(await res.text()), liveSpec);
    } catch (error) {
      parsed = false;
      differences = [`${repo}/${spec} is not a valid spec: ${String(error.message).split("\n")[0]}`];
    }
    // A Krizaka-team app whose spec file reads is fixed by the CI door (krizaka-internal#3879); krizaka-prod has no door yet.
    if (differences.length) drift.push({ app, differences, ...(parsed && team === DEFAULT_TEAM ? { fix: applyFix(app) } : {}) });
    else ok.push(app);
  }
  const listed = new Set(apps.map((a) => a.app));
  for (const name of byName.keys()) if (!listed.has(name)) drift.push({ app: name, differences: ["a live app that apps.json does not list (add it, with its spec)"] });
  return { ok, drift };
}

export async function driftAllCommand({ registry, doctl, log = console.log, summary = process.env.GITHUB_STEP_SUMMARY }) {
  const report = await driftAll({ registry, doctl, argv: process.argv.slice(2) });
  log(`equal ${report.ok.length} · drifting ${report.drift.length}`);
  const fixLine = (d, prefix) => (d.fix ? `\n${prefix}` + d.fix : "");
  for (const d of report.drift) log(`DRIFT ${d.app}\n  - ${d.differences.join("\n  - ")}${fixLine(d, "  fix: ")}`);
  if (summary) {
    const rows = report.drift.map((d) => `- **${d.app}**\n${d.differences.map((x) => "  - " + x).join("\n")}${fixLine(d, "  - fix: ")}`);
    appendFileSync(summary, `### krizaka-deploy drift-all\n\n${rows.join("\n") || "Every spec file equals its live app."}\n`);
  }
  return report;
}
