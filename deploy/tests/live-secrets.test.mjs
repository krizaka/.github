// P0 (krizaka/.github#167): an apply of a spec whose secrets are written `unset` wiped krizaka-blog's live DigitalOcean secrets
// (MAIL_API_KEY lost, the newsletter down). A SECRET env whose spec value is unset / empty / a placeholder keeps the live
// encrypted value; only an explicit `setSecret` (--set-secret KEY) with a value from the vault replaces it.
import test from "node:test";
import assert from "node:assert/strict";
import { mergeWithLive, isSecretPlaceholder, envEntries } from "../lib/spec.mjs";
import { secretsManagedLive, specDrift } from "../lib/drift.mjs";

const LIVE_VALUE = "EV[1:abc:live-encrypted]";
const live = () => ({
  name: "blog",
  services: [
    {
      name: "web",
      envs: [
        { key: "MAIL_API_KEY", scope: "RUN_TIME", type: "SECRET", value: LIVE_VALUE },
        { key: "APP_URL", scope: "RUN_TIME", value: "https://blog.krizaka.com" },
      ],
    },
  ],
});
const file = (value, extra = {}) => ({
  name: "blog",
  services: [
    {
      name: "web",
      envs: [
        { key: "MAIL_API_KEY", scope: "RUN_TIME", type: "SECRET", value, ...extra },
        { key: "APP_URL", scope: "RUN_TIME", value: "https://blog.krizaka.com" },
      ],
    },
  ],
});
const valueOf = (spec, key) => envEntries(spec).find((e) => e.env.key === key).env.value;

for (const placeholder of ["unset", "UNSET", "", "changeme", "REPLACE_ME", "<secret>", "__MAIL_API_KEY__", "todo", "xxx"]) {
  test(`the wipe: a SECRET written '${placeholder}' keeps the live encrypted value after the merge`, async () => {
    const merged = await mergeWithLive(file(placeholder), live(), { secret: async () => undefined });
    assert.deepEqual(merged.problems, []);
    assert.equal(valueOf(merged.spec, "MAIL_API_KEY"), LIVE_VALUE);
    assert.ok(merged.carried.some((c) => c.endsWith(":MAIL_API_KEY")));
  });
}

test("the wipe: an env without a type, 'unset' in the file, SECRET live: still kept", async () => {
  const f = file("unset");
  delete f.services[0].envs[0].type;
  const merged = await mergeWithLive(f, live(), { secret: async () => undefined });
  assert.equal(valueOf(merged.spec, "MAIL_API_KEY"), LIVE_VALUE);
});

test("the vault does not replace a live secret by itself", async () => {
  const merged = await mergeWithLive(file("unset"), live(), { secret: async () => "from-the-vault" });
  assert.equal(valueOf(merged.spec, "MAIL_API_KEY"), LIVE_VALUE);
});

test("--set-secret KEY replaces the live value with the vault's, and refuses when the vault has none", async () => {
  const set = await mergeWithLive(file("unset"), live(), { secret: async () => "from-the-vault", setSecret: ["MAIL_API_KEY"] });
  assert.equal(valueOf(set.spec, "MAIL_API_KEY"), "from-the-vault");
  assert.ok(set.resolved.some((r) => r.endsWith(":MAIL_API_KEY")));
  const none = await mergeWithLive(file("unset"), live(), { secret: async () => undefined, setSecret: ["MAIL_API_KEY"] });
  assert.equal(none.problems.length, 1);
  assert.match(none.problems[0], /MAIL_API_KEY.*--set-secret.*vault/);
  assert.doesNotMatch(none.problems[0], /EV\[/);
});

test("a real value written in the file for a SECRET is still explicit (not a placeholder)", async () => {
  const merged = await mergeWithLive(file("EV[1:def:new-encrypted]"), live(), {});
  assert.equal(valueOf(merged.spec, "MAIL_API_KEY"), "EV[1:def:new-encrypted]");
});

test("isSecretPlaceholder", () => {
  for (const v of ["unset", " Unset ", "", null, undefined, "<x>", "__K__", "changeme", "REPLACE_ME", "TODO", "xxx", "***"]) {
    assert.equal(isSecretPlaceholder(v), true, String(v));
  }
  for (const v of ["EV[1:a:b]", "a-real-value", "https://x"]) assert.equal(isSecretPlaceholder(v), false, v);
});

test("drift: a secret written 'unset' with a live secret is « managed live », not drift", async () => {
  const drift = await specDrift(file("unset"), live());
  assert.deepEqual(drift, []);
});

test("drift names the secrets managed live (keys only)", () => {
  assert.equal(secretsManagedLive(file("unset"), live()).length, 1);
  assert.equal(secretsManagedLive(file("EV[1:def:new]"), live()).length, 0);
});
