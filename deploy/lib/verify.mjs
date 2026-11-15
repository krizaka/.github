// The per-merge deploy guard (krizaka-internal#3780): did the App Platform deployment caused by THIS commit reach ACTIVE?
// An automatic rollback that is ACTIVE after an ERROR is not a pass: the commit did not deploy.
import { GuardError } from "./errors.mjs";
import { assertContext } from "./doctl.mjs";
import { causedBy, failureReason, isRollback } from "./watch.mjs";

const PASSED = new Set(["ACTIVE", "SUPERSEDED"]); // SUPERSEDED: it was live, a newer deployment replaced it
const FAILED = new Set(["ERROR", "CANCELED"]);
const byNewest = (a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0);

/** The verdict on `sha`: { state: "ok" | "failed" | "pending" | "none", deployment?, phase?, reason? }. The newest deployment of the commit decides. */
export function verdictOf(deployments, sha) {
  const mine = deployments.filter((d) => !isRollback(d) && causedBy(d, sha)).sort(byNewest)[0];
  if (!mine) return { state: "none" };
  const base = { deployment: mine.id, phase: mine.phase };
  if (PASSED.has(mine.phase)) return { state: "ok", ...base };
  if (FAILED.has(mine.phase)) return { state: "failed", ...base, reason: failureReason(mine) };
  return { state: "pending", ...base };
}

/**
 * Polls the deployments of `app` until the commit's one reaches a final phase.
 * @returns { ok, app, sha, phase, message, deployment? } — `message` names app, commit, phase and reason.
 */
export async function verify(options, deps) {
  const { app, sha, graceMinutes = 10, timeoutMinutes = 25, intervalSeconds = 20 } = options;
  const { doctl, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now, log = console.log, env = process.env, argv = [] } = deps;
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new GuardError("commit", `'${sha}' is not a full commit sha`);
  assertContext({ env, argv });
  await doctl.assertTeam();
  const found = JSON.parse((await doctl.run(["apps", "list", "-o", "json"])) || "[]").find((a) => a?.spec?.name === app);
  if (!found) throw new GuardError("app", `no app named '${app}' in the team`);
  const short = sha.slice(0, 10);
  const started = now();
  for (;;) {
    const deployments = JSON.parse((await doctl.run(["apps", "list-deployments", found.id, "-o", "json"])) || "[]");
    const v = verdictOf(deployments, sha);
    const minutes = (now() - started) / 60_000;
    log(`${app} ${short}: ${v.state}${v.phase ? ` (${v.phase})` : ""} after ${minutes.toFixed(1)} min`);
    if (v.state === "ok") return { ok: true, app, sha, ...v, message: `${app}: commit ${short} is deployed (${v.phase}, deployment ${v.deployment})` };
    if (v.state === "failed") return { ok: false, app, sha, ...v, message: `${app}: commit ${short} did not deploy: deployment ${v.deployment} ended ${v.phase}: ${v.reason}` };
    if (v.state === "none" && minutes >= graceMinutes) return { ok: false, app, sha, phase: "NOT_STARTED", message: `${app}: commit ${short} not started: no deployment of it within ${graceMinutes} min` };
    if (v.state === "pending" && minutes >= timeoutMinutes) return { ok: false, app, sha, ...v, message: `${app}: commit ${short} still ${v.phase} after ${timeoutMinutes} min (deployment ${v.deployment})` };
    await sleep(intervalSeconds * 1000);
  }
}
