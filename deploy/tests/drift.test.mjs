import test from "node:test";
import assert from "node:assert/strict";
import { driftCommand, specDrift } from "../lib/drift.mjs";
import { GuardError } from "../lib/errors.mjs";
import { baseConfig, fakeDoctl, liveSpec } from "./helpers.mjs";

const file = () => structuredClone(liveSpec());

test("drift: a file equal to the live spec has none; a value-less variable takes the live one", async () => {
  assert.deepEqual(await specDrift(file(), liveSpec()), []);
  const f = file();
  delete f.services[0].envs[0].value;
  assert.deepEqual(await specDrift(f, liveSpec()), []);
});

test("drift: a plain value, an ingress or a component that differs is reported (the blog's captcha key was « unset » in the file)", async () => {
  const f = file();
  f.services[0].envs[0].value = "unset";
  f.ingress = { rules: [{ match: { path: { prefix: "/" } }, component: { name: "web" } }] };
  const drift = await specDrift(f, liveSpec());
  assert.ok(drift.some((d) => /NEXT_PUBLIC_MEDIA_CDN_URL is 'https:\/\/krizaka-assets.b-cdn.net' in the live app and 'unset'/.test(d)));
  assert.ok(drift.includes("ingress differs from the live app"));
});

test("drift: the command reads the live app (context default) and refuses on a difference", async () => {
  const { doctl } = fakeDoctl();
  const bad = file();
  bad.services[0].envs[2].value = "other.example";
  const run = (spec) => driftCommand(baseConfig(), { doctl, readFile: async () => JSON.stringify(spec), env: {}, argv: [], log: () => {} });
  await run(file());
  await assert.rejects(run(bad), (e) => e instanceof GuardError && e.guard === "drift" && /MAIL_DOMAIN/.test(e.message));
});

test("drift: App Platform's stored path « / » on an authority-only rule is not a difference", async () => {
  const rule = { match: { authority: { exact: "x.com" } }, redirect: { authority: "www.x.com", redirect_code: 308 } };
  const live = { ...liveSpec(), ingress: { rules: [{ ...rule, match: { ...rule.match, path: { prefix: "/" } } }] } };
  assert.deepEqual(await specDrift({ ...liveSpec(), ingress: { rules: [rule] } }, live), []);
});
