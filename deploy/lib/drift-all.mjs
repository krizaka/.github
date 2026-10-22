// `krizaka-deploy drift-all`: every app of the Krizaka team against the spec its repository keeps. Report only — it never applies.
import { appendFileSync } from "node:fs";
import { assertContext } from "./doctl.mjs";
import { parseSpec } from "./spec.mjs";
import { specDrift } from "./drift.mjs";

const raw = (repo, spec) => `https://raw.githubusercontent.com/${repo}/main/${spec}`;

/** @returns { ok: string[], drift: { app, differences: string[] }[] } */
export async function driftAll({ registry, doctl, fetch = globalThis.fetch, env = process.env, argv = [] }) {
  assertContext({ env, argv });
  await doctl.assertTeam();
  const live = JSON.parse((await doctl.run(["apps", "list", "-o", "json"])) || "[]");
  const byName = new Map(live.map((a) => [a?.spec?.name, a?.spec]));
  const ok = [];
  const drift = [];
  for (const { app, repo, spec } of registry.apps) {
    const liveSpec = byName.get(app);
    if (!liveSpec) {
      drift.push({ app, differences: ["listed in apps.json but not in the Krizaka team"] });
      continue;
    }
    let res;
    try {
      res = await fetch(raw(repo, spec), { signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      drift.push({ app, differences: [`cannot read ${repo}/${spec}: ${error.message}`] });
      continue;
    }
    if (res.status !== 200) {
      drift.push({ app, differences: [`cannot read ${repo}/${spec} (GitHub answered ${res.status})`] });
      continue;
    }
    let differences;
    try {
      differences = await specDrift(parseSpec(await res.text()), liveSpec);
    } catch (error) {
      differences = [`${repo}/${spec} is not a valid spec: ${String(error.message).split("\n")[0]}`];
    }
    if (differences.length) drift.push({ app, differences });
    else ok.push(app);
  }
  const listed = new Set(registry.apps.map((a) => a.app));
  for (const name of byName.keys()) if (!listed.has(name)) drift.push({ app: name, differences: ["a live app that apps.json does not list (add it, with its spec)"] });
  return { ok, drift };
}

export async function driftAllCommand({ registry, doctl, log = console.log, summary = process.env.GITHUB_STEP_SUMMARY }) {
  const report = await driftAll({ registry, doctl, argv: process.argv.slice(2) });
  log(`equal ${report.ok.length} · drifting ${report.drift.length}`);
  for (const d of report.drift) log(`DRIFT ${d.app}\n  - ${d.differences.join("\n  - ")}`);
  if (summary) {
    const rows = report.drift.map((d) => `- **${d.app}**\n${d.differences.map((x) => `  - ${x}`).join("\n")}`);
    appendFileSync(summary, `### krizaka-deploy drift-all\n\n${rows.join("\n") || "Every spec file equals its live app."}\n`);
  }
  return report;
}
