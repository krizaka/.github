// Post-deploy checks, against the live site. `fetch` and `spawnCheck` are injected so every check is unit-tested.
import { spawn } from "node:child_process";
import { GuardError } from "./errors.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The Disallow lines under `User-agent: *`. */
export function wildcardDisallows(robots) {
  const out = [];
  let applies = false;
  let inGroupStart = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const name = field.trim().toLowerCase();
    if (name === "user-agent") {
      if (!inGroupStart) applies = false;
      inGroupStart = true;
      if (value === "*") applies = true;
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

/**
 * robots.txt says what the environment is: `on` — no blanket `Disallow: /` for everyone (and a Sitemap line);
 * `off` — `Disallow: /` for everyone, and the home carries noindex (X-Robots-Tag or <meta name="robots">).
 */
export async function checkIndexing(baseUrl, expect, { fetch = globalThis.fetch } = {}) {
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
  const home = await fetch(new URL("/", baseUrl), { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  const header = home.headers.get("x-robots-tag") ?? "";
  const html = await home.text();
  const meta = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html);
  if (!/noindex/i.test(header) && !meta) throw new GuardError("robots", `${baseUrl}/ carries no noindex (header or meta) but this site must stay out of the index`);
  return { robots: "disallows", noindex: header ? "header" : "meta" };
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

/** The family SEO contract (krizaka-com scripts/check-seo-family.mjs, identical in every site). */
export async function checkSeoFamily(baseUrl, { script, args = [], index, cwd = process.cwd(), spawnCheck = spawnNode }) {
  // The script takes the site's intent from --index; the configuration's `indexing` is the one source of it.
  const intent = index && !args.includes("--index") ? ["--index", index] : [];
  const { code, log } = await spawnCheck([script, "--base", baseUrl, "--host", baseUrl, ...intent, ...args], { cwd });
  if (code !== 0) throw new GuardError("seo-family", `${script} failed (exit ${code}):\n${log.split("\n").slice(-15).join("\n")}`);
  return { exit: 0 };
}
