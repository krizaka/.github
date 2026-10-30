import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkAppJson, checkLive, checkNativeScreens, checkWebRoutes, expoMatches, expoRoutes, nextRoutes, normalizeRoute } from "../scripts/check-app-links.mjs";

const tree = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "applinks-"));
  for (const f of files) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), "");
  }
  return dir;
};

test("Next routes: groups and slots vanish, dynamic segments normalise, route handlers are not pages", () => {
  const dir = tree(["(home)/page.tsx", "watch/[id]/page.tsx", "api/x/route.ts", "@modal/page.tsx", "docs/[...slug]/page.tsx"]);
  assert.deepEqual(nextRoutes(dir), ["/", "/docs/[...slug]", "/watch/[id]"]);
  assert.equal(normalizeRoute("/docs/[...slug]"), "/docs/*");
  assert.equal(normalizeRoute("/watch/[id]"), "/watch/*");
});

test("rule 1: a shareable route nobody claims, and a claimed path with no route, are gaps", () => {
  const ok = checkWebRoutes({ routes: ["/", "/watch/[id]", "/auth/login"], paths: ["/watch/*"], excluded: ["/", "/auth/*"] });
  assert.deepEqual(ok.gaps, []);
  const bad = checkWebRoutes({ routes: ["/watch/[id]", "/me"], paths: ["/watch/*", "/ghost/*"], excluded: [] });
  assert.equal(bad.gaps.length, 2);
  assert.match(bad.gaps.join("\n"), /\/me is shareable/);
  assert.match(bad.gaps.join("\n"), /\/ghost\/\* matches no shareable web route/);
});

test("an exclusion written with brackets is a literal route: a locale catch-all never hides the app's own routes", () => {
  const routes = ["/[locale]/[...rest]", "/[locale]/privacy", "/app/[locale]", "/app/[locale]/talk"];
  // As a glob, "/*/*" would match every route; written as the route itself, it excludes that route only.
  const { gaps, shareable } = checkWebRoutes({ routes, paths: ["/app/*"], excluded: ["/[locale]/[...rest]", "/[locale]/privacy"] });
  assert.deepEqual(gaps, []);
  assert.deepEqual(shareable, ["/app/*", "/app/*/talk"]);
});

test("a web app without AASA: no AASA, nothing claimed -> every shareable route is a gap", () => {
  const { gaps } = checkWebRoutes({ routes: ["/dashboard", "/watch/[id]"], paths: [], excluded: [] });
  assert.equal(gaps.length, 2);
});

test("rule 3: app.json needs associatedDomains and an autoVerify filter covering every claimed path", () => {
  const cfg = { host: "dev.orazaka.com", iosBundleId: "com.krizaka.orazaka", androidPackage: "com.krizaka.orazaka", paths: ["/watch/*", "/me", "/me/*"] };
  const good = { expo: { ios: { bundleIdentifier: cfg.iosBundleId, associatedDomains: ["applinks:dev.orazaka.com"] }, android: { package: cfg.androidPackage, intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: cfg.host, pathPrefix: "/watch/" }, { scheme: "https", host: cfg.host, path: "/me" }, { scheme: "https", host: cfg.host, pathPrefix: "/me/" }], category: ["BROWSABLE", "DEFAULT"] }] } } };
  assert.deepEqual(checkAppJson(good, cfg), []);
  assert.equal(checkAppJson({ expo: { ios: { bundleIdentifier: cfg.iosBundleId }, android: { package: cfg.androidPackage } } }, cfg).length >= 3, true);
  const noAuto = structuredClone(good);
  noAuto.expo.android.intentFilters[0].autoVerify = false;
  assert.match(checkAppJson(noAuto, cfg).join("\n"), /autoVerify/);
});

test("rule 4: every claimed path opens a screen; /@handle needs +native-intent", () => {
  const dir = tree(["(tabs)/index.tsx", "(tabs)/me.tsx", "watch/[id].tsx", "me/[section].tsx", "_layout.tsx", "+native-intent.ts"]);
  const screens = expoRoutes(dir);
  assert.deepEqual(screens, ["/", "/me", "/me/[section]", "/watch/[id]"]);
  assert.equal(expoMatches("/me/[section]", "/me/x"), true);
  assert.equal(expoMatches("/me/[section]", "/me"), false);
  assert.deepEqual(checkNativeScreens({ screens, paths: ["/watch/*", "/me", "/me/*", "/@*"], nativeIntent: true }), []);
  const gaps = checkNativeScreens({ screens, paths: ["/auctions/*", "/@*"], nativeIntent: false });
  assert.equal(gaps.length, 2);
});

const FP = Array.from({ length: 32 }, () => "AB").join(":");
const reply = (status, body, type = "application/json") => ({ status, ok: status < 300, headers: { get: () => type }, json: async () => body });
test("rule 5 live: 200, json, no redirect, bundle id, fingerprints, CDNs", async () => {
  const cfg = { iosBundleId: "com.krizaka.orazaka", androidPackage: "com.krizaka.orazaka", paths: ["/watch/*"] };
  const files = {
    "/.well-known/apple-app-site-association": reply(200, { applinks: { details: [{ appIDs: ["ABCDE12345.com.krizaka.orazaka"], components: [{ "/": "/watch/*" }] }] } }),
    "/.well-known/assetlinks.json": reply(200, [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: cfg.androidPackage, sha256_cert_fingerprints: [FP] } }]),
  };
  const fetchImpl = async (url) => {
    const u = new URL(url);
    if (u.host === "app-site-association.cdn-apple.com") return reply(200, {});
    if (u.host === "digitalassetlinks.googleapis.com") return reply(200, { linked: true });
    return files[u.pathname];
  };
  assert.deepEqual(await checkLive("https://dev.orazaka.com", cfg, { fetchImpl }), []);
  const broken = async (url) => (url.includes("apple-app-site") ? reply(301, {}) : fetchImpl(url));
  assert.match((await checkLive("https://dev.orazaka.com", cfg, { fetchImpl: broken, cdn: false })).join("\n"), /redirect/);
  const wrongType = async (url) => (url.includes("assetlinks") ? reply(200, files["/.well-known/assetlinks.json"].json && [], "text/html") : fetchImpl(url));
  assert.match((await checkLive("https://dev.orazaka.com", cfg, { fetchImpl: wrongType, cdn: false })).join("\n"), /content-type/);
});
