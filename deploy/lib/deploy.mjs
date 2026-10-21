// The deploy, in order: guards → (apply) → create-deployment --force-rebuild → wait for ACTIVE → live checks → rollback note.
// Every external effect is injected (`doctl`, `fetch`, `secret`, `readFile`, `spawnCheck`, `sleep`, `log`) so each guard has a unit test.
import { readFile as readFileFs } from "node:fs/promises";
import { resolve } from "node:path";
import { GuardError } from "./errors.mjs";
import { assertContext } from "./doctl.mjs";
import { assertIndexing, mergeWithLive, parseSpec, dumpSpec } from "./spec.mjs";
import { checkHealth, checkIndexing, checkSeoFamily } from "./checks.mjs";

const FAILED = new Set(["ERROR", "CANCELED", "SUPERSEDED"]);

const sleepDefault = (ms) => new Promise((r) => setTimeout(r, ms));

/** The deployment object of `doctl apps get-deployment`. */
async function deploymentOf(doctl, appId, id) {
  return doctl.json(["apps", "get-deployment", appId, id]);
}

/** Polls until the deployment is ACTIVE; throws on ERROR / CANCELED / SUPERSEDED or when the time is up. */
export async function waitActive(doctl, appId, id, { timeoutMs, pollMs = 15_000, sleep = sleepDefault, now = Date.now, log = () => {} }) {
  const deadline = now() + timeoutMs;
  let last = "";
  for (;;) {
    const deployment = await deploymentOf(doctl, appId, id);
    const phase = deployment?.phase ?? "UNKNOWN";
    if (phase !== last) log(`deployment ${id}: ${phase}`);
    last = phase;
    if (phase === "ACTIVE") return deployment;
    if (FAILED.has(phase)) throw new GuardError("deployment", `deployment ${id} ended ${phase}`);
    if (now() >= deadline) throw new GuardError("deployment", `deployment ${id} still ${phase} after ${Math.round(timeoutMs / 60_000)} min`);
    await sleep(pollMs);
  }
}

/** The commit a deployment built (one per component; they all come from the same push). */
export const commitsOf = (deployment) => [...new Set((deployment?.services ?? []).map((s) => s.source_commit_hash).filter(Boolean))];

export function rollbackNote({ app, appId, previous }) {
  if (!previous) return `Rollback: no previous ACTIVE deployment was recorded for ${app}; redeploy the last good commit.`;
  return [
    `Rollback of ${app}: previous deployment ${previous.id}${previous.commit ? ` (commit ${previous.commit})` : ""}.`,
    `  DigitalOcean has no doctl rollback: App Platform > ${app} > Activity > deployment ${previous.id} > Rollback,`,
    `  or POST https://api.digitalocean.com/v2/apps/${appId}/rollback {"deployment_id":"${previous.id}"} with the Krizaka token,`,
    `  or revert the commit and let the push redeploy.`,
  ].join("\n");
}

/**
 * @returns the report: { app, appId, dryRun, steps[], previous, deployment, rollback }
 */
export async function deploy(config, options = {}, deps) {
  const {
    doctl,
    fetch = globalThis.fetch,
    secret = async () => undefined,
    readFile = readFileFs,
    spawnCheck,
    sleep = sleepDefault,
    now = Date.now,
    log = console.log,
    env = process.env,
    argv = [],
  } = deps;
  const { dryRun = false, apply = false, expectSha = null, allowDrop = [], pollMs = 15_000, healthAttempts = 12, healthDelayMs = 10_000 } = options;
  const report = { app: config.app, dryRun, steps: [] };
  const step = (name, detail = "") => {
    report.steps.push({ name, detail });
    log(`${dryRun ? "[dry-run] " : ""}${name}${detail ? `: ${detail}` : ""}`);
  };

  // 1. Guards that need no network.
  assertContext({ env, argv });
  step("context", "default");
  const team = await doctl.assertTeam();
  step("team", team);

  // 2. The app and what runs now.
  const apps = await doctl.run(["apps", "list", "-o", "json"]).then((t) => JSON.parse(t || "[]"));
  const found = apps.filter((a) => a?.spec?.name === config.app || a?.id === config.app);
  if (found.length !== 1) throw new GuardError("app", `${found.length} apps match '${config.app}' in the Krizaka team (expected exactly one)`);
  const appId = found[0].id;
  report.appId = appId;
  const liveApp = await doctl.json(["apps", "get", appId]);
  const previousDeployment = liveApp?.active_deployment;
  report.previous = previousDeployment ? { id: previousDeployment.id, commit: commitsOf(previousDeployment)[0] ?? null } : null;
  step("previous deployment", report.previous ? `${report.previous.id}${report.previous.commit ? ` @ ${report.previous.commit.slice(0, 10)}` : ""}` : "none");
  const liveSpec = liveApp?.spec ?? parseSpec(await doctl.run(["apps", "spec", "get", appId, "--format", "yaml"]));

  // 3. The indexing flag the live app carries must be the one this environment expects, before and after.
  const indexingOptions = { expect: config.indexing, variable: config.indexingVariable };
  assertIndexing(liveSpec, { ...indexingOptions, label: "live spec" });
  step("indexing (live)", `${config.indexing}`);

  // 4. Apply the repository's spec (opt-in), with the merge that cannot blank a variable.
  if (apply) {
    if (!config.spec) throw new GuardError("config", '--apply needs "spec" in the configuration');
    const fileSpec = parseSpec(await readFile(resolve(config.root, config.spec), "utf8"));
    assertIndexing(fileSpec, { ...indexingOptions, label: config.spec });
    const merged = await mergeWithLive(fileSpec, liveSpec, { secret, allowDrop });
    if (merged.problems.length) throw new GuardError("secrets", `${config.spec} cannot be applied:\n  - ${merged.problems.join("\n  - ")}`);
    assertIndexing(merged.spec, { ...indexingOptions, label: "merged spec" });
    const text = dumpSpec(merged.spec);
    await doctl.run(["apps", "spec", "validate", "-", "--schema-only"], { input: text });
    step("spec", `valid; ${merged.carried.length} variable(s) kept from the live app, ${merged.resolved.length} filled from the vault`);
    if (dryRun) step("apply", `would update ${appId}`);
    else {
      await doctl.run(["apps", "update", appId, "--spec", "-", "--format", "ID", "--no-header"], { input: text });
      step("apply", `updated ${appId}`);
    }
  } else {
    step("apply", "skipped (the app deploys from its repository; pass --apply to send the spec)");
  }

  report.rollback = rollbackNote({ app: config.app, appId, previous: report.previous });
  try {
    // 5. Rebuild from the source, never reuse (an apply alone keeps the previous image).
    let deployment = null;
    if (dryRun) {
      step("create-deployment", "would run with --force-rebuild and wait for ACTIVE");
    } else {
      const created = await doctl.json(["apps", "create-deployment", appId, "--force-rebuild"]);
      if (!created?.id) throw new GuardError("deployment", "create-deployment returned no deployment id");
      step("create-deployment", `${created.id} (--force-rebuild)`);
      deployment = await waitActive(doctl, appId, created.id, { timeoutMs: config.waitMinutes * 60_000, pollMs, sleep, now, log: (m) => step("deployment", m) });
      report.deployment = { id: deployment.id, commit: commitsOf(deployment)[0] ?? null };
      step("ACTIVE", `${deployment.id}${report.deployment.commit ? ` @ ${report.deployment.commit.slice(0, 10)}` : ""}`);
      if (expectSha) {
        const commits = commitsOf(deployment);
        if (!commits.length || !commits.every((c) => c === expectSha)) {
          throw new GuardError("commit", `the ACTIVE deployment built ${commits.join(", ") || "an unknown commit"}, expected ${expectSha}`);
        }
        step("commit", `${expectSha.slice(0, 10)} is what runs`);
      }
      const after = await doctl.json(["apps", "get", appId]);
      assertIndexing(after?.spec ?? {}, { ...indexingOptions, label: "live spec after the deploy" });
      step("indexing (after)", config.indexing);
    }

    // 6. The live site says what it should.
    await runChecks(config, { fetch, spawnCheck, healthAttempts, healthDelayMs, sleepFn: sleep, step });
  } catch (error) {
    // Whatever failed after the first change: say where to go back to.
    log(report.rollback);
    throw error;
  }
  log(report.rollback);
  return report;
}

/** Health, robots / noindex, the SEO family contract — against `config.url`. */
export async function runChecks(config, { fetch, spawnCheck, healthAttempts = 12, healthDelayMs = 10_000, sleepFn, step = () => {} }) {
  const health = await checkHealth(config.health, { fetch, attempts: healthAttempts, delayMs: healthDelayMs, sleepFn });
  step("health", `${config.health} → ${health.status}`);
  const indexing = await checkIndexing(config.url, config.indexing, { fetch });
  step("robots", `${indexing.robots}${indexing.noindex ? `, noindex by ${indexing.noindex}` : ""}`);
  if (config.seoFamily) {
    await checkSeoFamily(config.url, { script: config.seoFamily.script, args: config.seoFamily.args ?? [], index: config.indexing, cwd: config.root, spawnCheck });
    step("seo-family", "contract met");
  }
}
