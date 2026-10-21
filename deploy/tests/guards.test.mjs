// Each guard refuses what it must, with doctl and HTTP mocked.
import test from "node:test";
import assert from "node:assert/strict";
import { assertContext, createDoctl } from "../lib/doctl.mjs";
import { assertIndexing, assertIngressRoutes, MAX_PATH_RULES, mergeWithLive } from "../lib/spec.mjs";
import { validateConfig } from "../lib/config.mjs";
import { deploy } from "../lib/deploy.mjs";
import { GuardError } from "../lib/errors.mjs";
import { baseConfig, fakeDoctl, fakeFetch, liveSpec } from "./helpers.mjs";

const refuses = (guard, fn) => assert.rejects(Promise.resolve().then(fn), (e) => e instanceof GuardError && e.guard === guard, `expected the '${guard}' guard`);

test("context: refuses any doctl context but default (variable and flag)", () => {
  assert.doesNotThrow(() => assertContext({ env: { DIGITALOCEAN_CONTEXT: "default" }, argv: [] }));
  assert.doesNotThrow(() => assertContext({ env: {}, argv: ["--context", "default"] }));
  assert.throws(() => assertContext({ env: { DIGITALOCEAN_CONTEXT: "erika" } }), /'erika'/);
  assert.throws(() => assertContext({ env: {}, argv: ["--context", "erika"] }), /only 'default'/);
  assert.throws(() => assertContext({ env: {}, argv: ["--context=erika"] }), /only 'default'/);
});

test("context: every doctl call carries --context default, and a caller cannot override it", async () => {
  const calls = [];
  const doctl = createDoctl({ exec: async (args) => (calls.push(args), "[]"), env: {} });
  await doctl.run(["apps", "list"]);
  assert.deepEqual(calls[0].slice(0, 2), ["--context", "default"]);
  assert.throws(() => doctl.run(["--context", "erika", "apps", "list"]), GuardError);
  assert.throws(() => doctl.run(["apps", "list", "-c", "x"]), GuardError);
});

test("team: refuses credentials of another team even in the default context", async () => {
  const { doctl } = fakeDoctl({ team: "Erika" });
  await refuses("team", () => doctl.assertTeam());
  const ok = fakeDoctl();
  assert.equal(await ok.doctl.assertTeam(), "Krizaka-team");
});

test("indexing: an indexed site refuses off, a noindex site refuses on, a missing switch is refused when the app has one", () => {
  const spec = (value) => ({ services: [{ name: "web", envs: [{ key: "APP_SEARCH_INDEXING", value }] }] });
  assert.doesNotThrow(() => assertIndexing(spec("on"), { expect: "on" }));
  assert.doesNotThrow(() => assertIndexing(spec("off"), { expect: "off" }));
  assert.throws(() => assertIndexing(spec("off"), { expect: "on" }), /'off' on services\/web.*expects 'on'/);
  assert.throws(() => assertIndexing(spec("on"), { expect: "off" }), /expects 'off'/);
  assert.throws(() => assertIndexing({ services: [{ name: "web", envs: [] }] }, { expect: "off" }), /not set/);
  // an app without the switch (krizaka.com): nothing to flip, nothing required
  assert.doesNotThrow(() => assertIndexing({ services: [{ name: "web", envs: [] }] }, { expect: "on", variable: false }));
  assert.throws(() => assertIndexing(spec("off"), { expect: "on", variable: false }), /expects 'on'/);
  assert.throws(() => assertIndexing(spec("on"), { expect: "maybe" }), /indexing: "on" or "off"/);
});

test("config: indexing is required, urls must be https, health stays on the origin", () => {
  const ok = { app: "a", url: "https://x.example", health: "/h", indexing: "off" };
  assert.equal(validateConfig(ok).health, "https://x.example/h");
  assert.throws(() => validateConfig({ ...ok, indexing: undefined }), /"indexing"/);
  assert.throws(() => validateConfig({ ...ok, url: "http://x.example" }), /https/);
  assert.throws(() => validateConfig({ ...ok, health: "https://evil.example/h" }), /origin/);
  assert.throws(() => validateConfig({ ...ok, app: "" }), /"app"/);
});

test("secrets: a variable without a value is refused when neither the live app nor the vault has it", async () => {
  const file = { services: [{ name: "web", envs: [{ key: "TOKEN", type: "SECRET" }] }] };
  const live = { services: [{ name: "web", envs: [] }] };
  const merged = await mergeWithLive(file, live, { secret: async () => undefined });
  assert.match(merged.problems.join("\n"), /TOKEN has no value/);
});

test("secrets: the live (encrypted) value is carried, the vault fills a placeholder, nothing else is touched", async () => {
  const file = {
    services: [{ name: "web", envs: [{ key: "MAIL_API_KEY", type: "SECRET" }, { key: "URL", value: "https://__HOST__/x" }, { key: "NEW", type: "SECRET" }] }],
  };
  const merged = await mergeWithLive(file, liveSpec(), {
    secret: async (k) => ({ HOST: "h.example", NEW: "vault-value" })[k],
    allowDrop: ["NEXT_PUBLIC_MEDIA_CDN_URL", "MAIL_DOMAIN"],
  });
  assert.deepEqual(merged.problems, []);
  const envs = Object.fromEntries(merged.spec.services[0].envs.map((e) => [e.key, e.value]));
  assert.equal(envs.MAIL_API_KEY, "EV[1:ciphertext-a]");
  assert.equal(envs.URL, "https://h.example/x");
  assert.equal(envs.NEW, "vault-value");
  assert.deepEqual(merged.carried, ["services/web:MAIL_API_KEY"]);
  assert.deepEqual(merged.resolved, ["services/web:NEW"]);
});

test("secrets: a live variable the file omits would be deleted — refused unless allowed", async () => {
  const file = { services: [{ name: "web", envs: [{ key: "MAIL_API_KEY", type: "SECRET" }] }] };
  const merged = await mergeWithLive(file, liveSpec(), {});
  assert.match(merged.problems.join("\n"), /MAIL_DOMAIN is set in the live app but not in the file/);
  const allowed = await mergeWithLive(file, liveSpec(), { allowDrop: ["MAIL_DOMAIN", "NEXT_PUBLIC_MEDIA_CDN_URL"] });
  assert.deepEqual(allowed.problems, []);
});

test("secrets: a placeholder with no value is a problem that names the key, never a value", async () => {
  const merged = await mergeWithLive({ services: [{ name: "web", envs: [{ key: "A", value: "__MISSING_ONE__" }] }] }, {}, {});
  assert.match(merged.problems[0], /__MISSING_ONE__/);
});

test("deploy --apply refuses a file whose indexing disagrees, before any change", async () => {
  const { doctl, calls } = fakeDoctl();
  const fetch = fakeFetch({});
  const fileSpec = "name: krizaka-com\nservices:\n  - name: web\n    envs:\n      - key: APP_SEARCH_INDEXING\n        value: 'off'\n";
  await refuses("indexing", () =>
    deploy(baseConfig(), { apply: true }, { doctl, fetch, readFile: async () => fileSpec, log: () => {}, sleep: async () => {} }),
  );
  assert.ok(!calls.some((c) => ["update", "create-deployment"].includes(c.args[1])), "nothing was changed");
});

test("deploy refuses when the live app already carries the wrong indexing", async () => {
  const wrong = { name: "x", services: [{ name: "web", envs: [{ key: "APP_SEARCH_INDEXING", value: "off" }] }] };
  const { doctl, calls } = fakeDoctl({ spec: wrong });
  await refuses("indexing", () => deploy(baseConfig({ indexingVariable: true }), {}, { doctl, fetch: fakeFetch({}), log: () => {}, sleep: async () => {} }));
  assert.ok(!calls.some((c) => c.args[1] === "create-deployment"));
});

test("deploy refuses an app that is not exactly one in the Krizaka team", async () => {
  const { doctl } = fakeDoctl({ apps: [] });
  await refuses("app", () => deploy(baseConfig(), {}, { doctl, fetch: fakeFetch({}), log: () => {}, sleep: async () => {} }));
});

test("secrets: KEY: __KEY__ (the placeholder named like its key) keeps the live value, and falls back to the vault", async () => {
  const file = { services: [{ name: "web", envs: [{ key: "MAIL_API_KEY", type: "SECRET", value: "__MAIL_API_KEY__" }, { key: "OTHER", type: "SECRET", value: "__OTHER__" }] }] };
  const merged = await mergeWithLive(file, liveSpec(), {
    secret: async (k) => ({ OTHER: "vault" })[k],
    allowDrop: ["NEXT_PUBLIC_MEDIA_CDN_URL", "MAIL_DOMAIN"],
  });
  assert.deepEqual(merged.problems, []);
  const envs = Object.fromEntries(merged.spec.services[0].envs.map((e) => [e.key, e.value]));
  assert.equal(envs.MAIL_API_KEY, "EV[1:ciphertext-a]", "the live encrypted value is kept");
  assert.equal(envs.OTHER, "vault");
});

test("values: a plain variable whose value differs from the live one is refused (the live app may be ahead), never printed for secrets", async () => {
  const file = { services: [{ name: "web", envs: [{ key: "MAIL_DOMAIN", value: "other.example" }, { key: "MAIL_API_KEY", type: "SECRET", value: "new-secret" }, { key: "NEXT_PUBLIC_MEDIA_CDN_URL", value: "https://krizaka-assets.b-cdn.net" }] }] };
  const merged = await mergeWithLive(file, liveSpec(), {});
  assert.equal(merged.problems.length, 1);
  assert.match(merged.problems[0], /MAIL_DOMAIN is 'mg\.krizaka\.com' in the live app and 'other\.example' in the file/);
  assert.doesNotMatch(merged.problems.join(), /new-secret|ciphertext/);
  const allowed = await mergeWithLive(file, liveSpec(), { allowChange: ["MAIL_DOMAIN"] });
  assert.deepEqual(allowed.problems, []);
});

test("routes: DO ingress matches are prefix/exact only, so a component may carry at most MAX_PATH_RULES path rules", () => {
  const rule = (prefix, target = { component: { name: "web" } }) => ({ match: { path: { prefix } }, ...target });
  const ok = { ingress: { rules: [rule("/api", { component: { name: "api" } }), rule("/")] } };
  assert.deepEqual(assertIngressRoutes(ok, { label: "ok" }), { web: 1, api: 1 });
  // authority-only rules (the www redirect) never count
  assert.doesNotThrow(() => assertIngressRoutes({ ingress: { rules: [{ match: { authority: { exact: "x.com" } }, redirect: { authority: "www.x.com" } }, rule("/")] } }));
  assert.equal(MAX_PATH_RULES, 3);
  // yororis' shape: one rule per path, same component
  const listed = { ingress: { rules: ["/api", "/.well-known", "/robots.txt", "/"].map((p) => rule(p)) } };
  assert.throws(() => assertIngressRoutes(listed, { label: "qa.app.yaml" }), (e) => e instanceof GuardError && e.guard === "routes" && /component 'web' has 4 path rules/.test(e.message));
  // blog's shape: hard-coded redirects
  const redirects = { ingress: { rules: ["/a", "/b", "/c", "/d"].map((p) => rule(p, { redirect: { uri: "/z", redirect_code: 308 } })) } };
  assert.throws(() => assertIngressRoutes(redirects), /redirects.*4 path rules/);
});
