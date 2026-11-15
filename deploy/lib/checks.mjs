// Post-deploy checks, against the live site. `fetch` and `spawnCheck` are injected so every check is unit-tested.
import { spawn } from "node:child_process";
import { GuardError } from "./errors.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A robots.txt line as [name, value], or null for a blank or comment-only line. */
function robotsField(raw) {
  const line = raw.replace(/#.*/, "").trim();
  if (!line) return null;
  const [field, ...rest] = line.split(":");
  return [field.trim().toLowerCase(), rest.join(":").trim()];
}

/** The Disallow lines under `User-agent: *`. */
export function wildcardDisallows(robots) {
  const out = [];
  let applies = false;
  let inGroupStart = false;
  for (const parsed of robots.split(/\r?\n/).map(robotsField)) {
    if (!parsed) continue;
    const [name, value] = parsed;
    if (name === "user-agent") {
      applies = (inGroupStart ? applies : false) || value === "*";
      inGroupStart = true;
    } else {
      inGroupStart = false;
      if (applies && name === "disallow") out.push(value);
    }
  }
  return out;
}

/** GET until 2xx, `attempts` times, `delayMs` apart. Resolves with { status }. */
export async function checkHealth(url, { fetch = globalThis.fetch, attempts = 12, delayMs = 10_000, sleepFn = sleep } = {}) {
  let last = "no answer";
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
      if (res.status >= 200 && res.status < 300) return { status: res.status, attempts: i };
      last = `HTTP ${res.status}`;
    } catch (error) {
      last = error.message;
    }
    if (i < attempts) await sleepFn(delayMs);
  }
  throw new GuardError("health", `${url} did not answer 2xx after ${attempts} attempts (${last})`);
}

const NOINDEX = /noindex/i;

/** The public (www) address of a development host: dev.<product>.com → www.<product>.com. */
export const wwwHostOf = (host) => host.replace(/^dev\./, "www.");

/** The `href` of the first <link rel="<rel>"> of a page, or null. */
function linkHrefs(html, rel) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (new RegExp(`\\brel=["']${rel}["']`, "i").test(tag)) out.push(/\bhref=["']([^"']*)["']/i.exec(tag)?.[1] ?? "");
  }
  return out;
}

/** The development contract (`dev`): the host serves its pages, never indexed, and says the public page is on www. */
async function checkDevPages(baseUrl, fetch) {
  const www = wwwHostOf(new URL(baseUrl).hostname);
  let url = new URL("/", baseUrl);
  let res;
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const next = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !next) break;
    url = new URL(next, url);
    if (url.hostname !== new URL(baseUrl).hostname) {
      throw new GuardError("robots", `${baseUrl}/ redirects to ${url.href}: a development host serves its pages, it does not send them to another host`);
    }
  }
  if (res.status !== 200) throw new GuardError("robots", `${url.href} answers ${res.status}: a development host serves its pages (200)`);
  const html = await res.text();
  const robotsMeta = /<meta\b[^>]*\bname=["']robots["'][^>]*>/i.exec(html)?.[0] ?? "";
  if (!NOINDEX.test(res.headers.get("x-robots-tag") ?? "") && !NOINDEX.test(robotsMeta)) {
    throw new GuardError("robots", `${url.href} carries no noindex (X-Robots-Tag or <meta name="robots">): a development host is never indexed`);
  }
  const canonical = linkHrefs(html, "canonical")[0];
  if (!canonical) throw new GuardError("robots", `${url.href} has no canonical: it must point to https://${www}`);
  if (new URL(canonical, url).hostname !== www) throw new GuardError("robots", `${url.href} canonical ${canonical} is not on ${www}`);
  for (const href of linkHrefs(html, "alternate")) {
    if (new URL(href, url).hostname !== www) throw new GuardError("robots", `${url.href} alternate ${href} is not on ${www}`);
  }
  return { canonical, status: res.status };
}

/**
 * robots.txt says what the environment is.
 * `on` — no blanket `Disallow: /` for everyone, and a Sitemap line.
 * `off` — never indexed: robots.txt answers 200 with `Disallow: /` for everyone and `X-Robots-Tag: noindex`; the machine
 *   endpoints (`healthUrl`: /api/*, /healthz) stay with noindex.
 * `dev` — `off`, and a development host (dev.<product>.com) that serves its pages (journeys, demo, videos): `/` answers 200
 *   (same-host redirects such as /→/fr followed), noindex by header or meta, canonical and hreflang on www.<product>.com.
 *   It does not redirect to www.
 */
export async function checkIndexing(baseUrl, expect, { fetch = globalThis.fetch, healthUrl = null } = {}) {
  const robotsRes = await fetch(new URL("/robots.txt", baseUrl), { signal: AbortSignal.timeout(15_000) });
  if (robotsRes.status !== 200) throw new GuardError("robots", `${baseUrl}/robots.txt answers ${robotsRes.status}`);
  const robots = await robotsRes.text();
  const blanket = wildcardDisallows(robots).includes("/");
  if (expect === "on") {
    if (blanket) throw new GuardError("robots", `${baseUrl}/robots.txt disallows everything (Disallow: /) but this site is indexed`);
    if (!/^sitemap:/im.test(robots)) throw new GuardError("robots", `${baseUrl}/robots.txt has no Sitemap line`);
    return { robots: "allows", sitemap: true };
  }
  if (!blanket) throw new GuardError("robots", `${baseUrl}/robots.txt does not say Disallow: / but this site must stay out of the index`);
  if (!NOINDEX.test(robotsRes.headers.get("x-robots-tag") ?? "")) {
    throw new GuardError("robots", `${baseUrl}/robots.txt is served without X-Robots-Tag: noindex (a development host keeps it on robots.txt)`);
  }
  if (healthUrl) {
    const res = await fetch(healthUrl, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    if (!NOINDEX.test(res.headers.get("x-robots-tag") ?? "")) {
      throw new GuardError("robots", `${healthUrl} is served without X-Robots-Tag: noindex (the machine endpoints of a development host keep it)`);
    }
  }
  if (expect === "dev") return { robots: "disallows", noindex: "header", ...(await checkDevPages(baseUrl, fetch)) };
  return { robots: "disallows", noindex: "header" };
}

/** Runs `node <script> --base <url> --host <url> …args` in `cwd`; resolves with the exit code and a log tail. */
export function spawnNode(args, { cwd }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stdout.on("data", (d) => (log += d));
    child.stderr.on("data", (d) => (log += d));
    child.on("error", (e) => resolve({ code: 127, log: e.message }));
    child.on("close", (code) => resolve({ code, log }));
  });
}

/** The family SEO contract (the `krizaka-seo-family` bin of @krizaka/config; `script` is the path a site's config gives, krizaka-internal#3709). */
export async function checkSeoFamily(baseUrl, { script, args = [], index, cwd = process.cwd(), spawnCheck = spawnNode }) {
  // The script takes the site's intent from --index; the configuration's `indexing` is the one source of it.
  // The `dev` contract is `--index off` plus the development-host mode of the script (pages served, canonical on www).
  const intent = !index || args.includes("--index") ? [] : index === "dev" ? ["--index", "off", "--dev-host"] : ["--index", index];
  const { code, log } = await spawnCheck([script, "--base", baseUrl, "--host", baseUrl, ...intent, ...args], { cwd });
  if (code !== 0) throw new GuardError("seo-family", `${script} failed (exit ${code}):\n${log.split("\n").slice(-15).join("\n")}`);
  return { exit: 0 };
}
