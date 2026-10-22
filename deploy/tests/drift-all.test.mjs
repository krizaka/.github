import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stringify } from "yaml";
import { driftAll } from "../lib/drift-all.mjs";
import { fakeDoctl, liveSpec } from "./helpers.mjs";

const registry = { apps: [{ app: "krizaka-com", repo: "krizaka/krizaka-com", spec: "deploy/digitalocean/app.yaml" }] };
const URL_OF = "https://raw.githubusercontent.com/krizaka/krizaka-com/main/deploy/digitalocean/app.yaml";
const serve = (spec, status = 200) => async (url) => {
  assert.equal(String(url), URL_OF);
  return new Response(status === 200 ? stringify(spec) : "no", { status });
};
const team = () => fakeDoctl({ apps: [{ id: "1", spec: liveSpec() }] }).doctl;

test("drift-all: a spec equal to its live app is ok", async () => {
  const r = await driftAll({ registry, doctl: team(), fetch: serve(liveSpec()), env: {} });
  assert.deepEqual(r, { ok: ["krizaka-com"], drift: [] });
});

test("drift-all: a different plain value, an unreadable spec, a missing app and an unlisted live app are all reported (never applied)", async () => {
  const f = liveSpec();
  f.services[0].envs[2].value = "other.example";
  const r1 = await driftAll({ registry, doctl: team(), fetch: serve(f), env: {} });
  assert.match(r1.drift[0].differences.join(), /MAIL_DOMAIN/);
  const r2 = await driftAll({ registry, doctl: team(), fetch: serve(f, 404), env: {} });
  assert.match(r2.drift[0].differences[0], /GitHub answered 404/);
  const r3 = await driftAll({ registry: { apps: [{ ...registry.apps[0], app: "ghost" }] }, doctl: team(), fetch: serve(f), env: {} });
  assert.deepEqual(r3.drift.map((d) => d.app), ["ghost", "krizaka-com"]);
  const { calls } = fakeDoctl();
  assert.ok(!calls.some((c) => c.args[1] === "update"));
});

test("drift-all: a spec file that does not parse (a duplicate key) is reported, it does not stop the run", async () => {
  const bad = async () => new Response("a: 1\na: 2\n", { status: 200 });
  const r = await driftAll({ registry, doctl: team(), fetch: bad, env: {} });
  assert.match(r.drift[0].differences[0], /not a valid spec/);
});

test("drift-all: apps.json lists every app once, with a repo and a spec path", () => {
  const { apps } = JSON.parse(readFileSync(new URL("../apps.json", import.meta.url), "utf8"));
  assert.equal(new Set(apps.map((a) => a.app)).size, apps.length);
  for (const a of apps) assert.match(`${a.repo} ${a.spec}`, /^krizaka\/[\w.-]+ [\w./-]+\.ya?ml$/);
});
