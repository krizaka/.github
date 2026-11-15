// The per-merge deploy guard, on recorded doctl list-deployments JSON (krizaka-internal#3780).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verify, verdictOf } from "../lib/verify.mjs";
import { createDoctl } from "../lib/doctl.mjs";

const SHA = "a".repeat(40);
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/verify/${name}.json`, import.meta.url), "utf8"));

/** A doctl answering the fixtures in order (the last one repeats); a fake clock that moves by `interval` per sleep. */
function world(...names) {
  let polls = 0;
  let t = 0;
  const exec = async (args) => {
    const [a, b] = args.slice(2);
    if (`${a} ${b}` === "account get") return JSON.stringify([{ team: { name: "Krizaka-team" } }]);
    if (`${a} ${b}` === "apps list") return JSON.stringify([{ id: "id-verikora", spec: { name: "verikora-dev" } }]);
    if (`${a} ${b}` === "apps list-deployments") return JSON.stringify(fixture(names[Math.min(polls++, names.length - 1)]));
    throw new Error(`unscripted doctl call: ${args.slice(2).join(" ")}`);
  };
  return { doctl: createDoctl({ exec, env: {} }), now: () => t, sleep: async (ms) => { t += ms; }, polls: () => polls };
}
const run = (w, options = {}) => verify({ app: "verikora-dev", sha: SHA, graceMinutes: 10, timeoutMinutes: 25, intervalSeconds: 60, ...options }, { doctl: w.doctl, now: w.now, sleep: w.sleep, log: () => {}, env: {} });

test("verify: the deployment of the commit is ACTIVE → green", async () => {
  const r = await run(world("active"));
  assert.equal(r.ok, true);
  assert.equal(r.phase, "ACTIVE");
});

test("verify: ERROR hidden by an ACTIVE automatic rollback → red, naming app, commit, phase and the step's reason", async () => {
  const r = await run(world("error-then-rollback"));
  assert.equal(r.ok, false);
  assert.equal(r.phase, "ERROR");
  for (const part of ["verikora-dev", SHA.slice(0, 10), "ERROR", "deploy/health-check: Health checks failed"]) assert.match(r.message, new RegExp(part));
});

test("verify: CANCELED → red", async () => {
  const r = await run(world("canceled"));
  assert.equal(r.ok, false);
  assert.equal(r.phase, "CANCELED");
});

test("verify: no deployment of the commit within the grace → red « not started »", async () => {
  const w = world("none");
  const r = await run(w);
  assert.equal(r.ok, false);
  assert.match(r.message, /not started/);
  assert.ok(w.polls() > 1, "it polled during the grace before giving up");
});

test("verify: a build in progress is waited for, then green", async () => {
  const r = await run(world("none", "building", "building", "active"));
  assert.equal(r.ok, true);
});

test("verify: a build that never ends is red at the timeout, naming its phase", async () => {
  const r = await run(world("building"), { timeoutMinutes: 5 });
  assert.equal(r.ok, false);
  assert.match(r.message, /still BUILDING after 5 min/);
});

test("verify: the newest deployment of the commit decides (a retried build that passed)", () => {
  const retry = { ...fixture("active")[0], id: "dep-retry", created_at: "2026-11-15T10:30:00Z" };
  assert.equal(verdictOf([retry, ...fixture("error-then-rollback")], SHA).state, "ok");
});

test("verify: an unknown app or a short sha is refused", async () => {
  await assert.rejects(run(world("active"), { app: "nope" }), /no app named 'nope'/);
  await assert.rejects(run(world("active"), { sha: "abc" }), /not a full commit sha/);
});
