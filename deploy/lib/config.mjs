// .krizaka-deploy.json — what a repository says about its deployment. Everything is explicit; nothing is guessed.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { GuardError } from "./errors.mjs";

/**
 * {
 *   "app": "akinaza-dev",                        // the App Platform app's name (spec.name)
 *   "url": "https://dev.akinaza.com",            // the live site the checks read
 *   "health": "/api/healthz",                    // path (or absolute URL) answering 2xx when the app is up
 *   "indexing": "off",                           // "on" for an indexed site, "off" for a noindex one — REQUIRED
 *   "indexingVariable": true,                    // false when the app has no APP_SEARCH_INDEXING switch (krizaka.com)
 *   "spec": "deploy/digitalocean/app.yaml",      // the spec `--apply` sends (optional without --apply)
 *   "product": "akinaza",                        // `secret.sh @<product>` fills secrets locally (optional)
 *   "seoFamily": { "script": "scripts/check-seo-family.mjs", "args": ["--organization"] },   // optional
 *   "waitMinutes": 25
 * }
 */
export function loadConfig(path) {
  const file = resolve(path);
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new GuardError("config", `cannot read ${file}: ${error.message}`);
  }
  return validateConfig(raw, dirname(file));
}

export function validateConfig(raw, root = process.cwd()) {
  const fail = (m) => {
    throw new GuardError("config", m);
  };
  if (!raw || typeof raw !== "object") fail("the configuration must be a JSON object");
  for (const key of ["app", "url", "health"]) if (typeof raw[key] !== "string" || !raw[key]) fail(`"${key}" is required`);
  if (raw.indexing !== "on" && raw.indexing !== "off") fail('"indexing" must be "on" (indexed site) or "off" (noindex site)');
  let url;
  try {
    url = new URL(raw.url);
  } catch {
    fail(`"url" is not a URL: ${raw.url}`);
  }
  if (url.protocol !== "https:") fail('"url" must be https');
  const health = new URL(raw.health, url);
  if (health.origin !== url.origin) fail('"health" must stay on the site\'s origin');
  return {
    root,
    app: raw.app,
    url: url.origin,
    health: health.href,
    indexing: raw.indexing,
    indexingVariable: raw.indexingVariable !== false,
    spec: raw.spec ?? null,
    product: raw.product ?? null,
    seoFamily: raw.seoFamily ?? null,
    waitMinutes: Number(raw.waitMinutes ?? 25),
  };
}
