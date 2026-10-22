#!/usr/bin/env node
// krizaka-deploy — one way to deploy a Krizaka app to DigitalOcean App Platform (krizaka/.github#113).
//
//   krizaka-deploy deploy [--config .krizaka-deploy.json] [--dry-run] [--apply] [--expect-sha <sha>] [--skip-head-check] [--allow-drop KEY,KEY] [--allow-change KEY,KEY] [--set-secret KEY,KEY]
//   krizaka-deploy watch  [--grace 10] [--trigger] [--apps a,b]   post-merge check: a merge to main must start a deployment within the grace period (exit 1 if not)
//   krizaka-deploy routes <spec.yaml>…                            offline: fails a spec that lists routes one by one (max 3 path rules per component)
//   krizaka-deploy drift [--config …]                              the repository's spec equals the live spec (read-only; exit 1 and the differences otherwise)
//   krizaka-deploy drift-all                                       every app of the team against its repository's spec (deploy/apps.json); report only
//   krizaka-deploy check  [--config .krizaka-deploy.json]        live checks only (health, robots/noindex, SEO family)
//
// --dry-run reads everything (guards, live spec, the file's merge, the live site) and changes nothing.
// Exit codes: 0 done · 1 a guard refused or a check failed · 2 usage.
import { appendFileSync } from "node:fs";
import { loadConfig } from "../lib/config.mjs";
import { createDoctl } from "../lib/doctl.mjs";
import { createSecretProvider } from "../lib/secrets.mjs";
import { deploy, runChecks } from "../lib/deploy.mjs";
import { GuardError } from "../lib/errors.mjs";

const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith("-") ? argv.shift() : "deploy";
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return undefined;
  return argv[i].includes("=") ? argv[i].slice(name.length + 1) : argv[i + 1];
};

if (flag("--help") || !["deploy", "check", "watch", "routes", "drift", "drift-all"].includes(command)) {
  console.log("usage: krizaka-deploy [deploy|check|watch] [--config file] [--dry-run] [--apply] [--expect-sha sha] [--skip-head-check] [--allow-drop KEY,…] [--allow-change KEY,…] [--health-attempts n] [--health-delay-ms ms]");
  process.exit(["deploy", "check", "watch", "routes", "drift", "drift-all"].includes(command) ? 0 : 2);
}

if (command === "routes") {
  const { readFileSync } = await import("node:fs");
  const { parseSpec, assertIngressRoutes } = await import("../lib/spec.mjs");
  let failed = false;
  for (const file of argv.filter((a) => !a.startsWith("-"))) {
    try { console.log(`${file}: ${JSON.stringify(assertIngressRoutes(parseSpec(readFileSync(file, "utf8")), { label: file }))}`); }
    catch (e) { if (!(e instanceof GuardError)) throw e; console.error(e.message); failed = true; }
  }
  process.exit(failed ? 1 : 0);
}

if (command === "drift-all") {
  const { readFileSync } = await import("node:fs");
  const { driftAllCommand } = await import("../lib/drift-all.mjs");
  const registry = JSON.parse(readFileSync(new URL("../apps.json", import.meta.url), "utf8"));
  try {
    const report = await driftAllCommand({ registry, doctl: createDoctl() });
    process.exit(report.drift.length ? 1 : 0);
  } catch (error) {
    console.error(error instanceof GuardError ? `REFUSED ${error.message}` : `FAILED ${error.message}`);
    process.exit(1);
  }
}

import { watchCommand } from "../lib/watch-cli.mjs";
if (command === "watch") await watchCommand({ flag, value });

try {
  const config = loadConfig(value("--config") ?? ".krizaka-deploy.json");
  const doctl = createDoctl();
  const secret = createSecretProvider({ product: config.product });
  const summary = process.env.GITHUB_STEP_SUMMARY;
  const out = process.env.GITHUB_OUTPUT;
  if (command === "drift") {
    const { driftCommand } = await import("../lib/drift.mjs");
    await driftCommand(config, { doctl, argv: process.argv.slice(2) });
    process.exit(0);
  }
  if (command === "check") {
    await runChecks(config, { fetch: globalThis.fetch, step: (n, d) => console.log(`${n}${d ? `: ${d}` : ""}`), sleepFn: (ms) => new Promise((r) => setTimeout(r, ms)) });
    process.exit(0);
  }
  const report = await deploy(
    config,
    {
      dryRun: flag("--dry-run"),
      apply: flag("--apply"),
      expectSha: value("--expect-sha") || null,
      skipHeadCheck: flag("--skip-head-check"),
      allowDrop: (value("--allow-drop") ?? "").split(",").filter(Boolean),
      allowChange: (value("--allow-change") ?? "").split(",").filter(Boolean),
      setSecret: (value("--set-secret") ?? "").split(",").filter(Boolean),
      // Defaults (12 x 10 s) stay those of a real deploy; tests and local dry runs may shorten the wait.
      ...(value("--health-attempts") ? { healthAttempts: Number(value("--health-attempts")) } : {}),
      ...(value("--health-delay-ms") ? { healthDelayMs: Number(value("--health-delay-ms")) } : {}),
    },
    { doctl, secret, argv: process.argv.slice(2) },
  );
  if (out) {
    appendFileSync(out, `app-id=${report.appId}\nprevious-deployment=${report.previous?.id ?? ""}\ndeployment=${report.deployment?.id ?? ""}\n`);
  }
  if (summary) {
    appendFileSync(
      summary,
      `### krizaka-deploy ${report.app}${report.dryRun ? " (dry run)" : ""}\n\n${report.steps.map((s) => `- **${s.name}** ${s.detail}`).join("\n")}\n\n\`\`\`\n${report.rollback}\n\`\`\`\n`,
    );
  }
} catch (error) {
  console.error(error instanceof GuardError ? `REFUSED ${error.message}` : `FAILED ${error.message}`);
  process.exit(1);
}
