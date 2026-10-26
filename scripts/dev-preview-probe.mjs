#!/usr/bin/env node
/* Probe what can be checked from outside for the Dev preview bar (docs/standards/dev-preview.md).
   Usage: node scripts/dev-preview-probe.mjs <product|all> [--seo <path/to/check-seo-family.mjs>] [--json]
   Needs Node 20+ and an authenticated `gh` (alerts, CI). Prints no secret: it never reads credentials. */
import { execFileSync } from "node:child_process";
import { checkLive } from "./check-app-links.mjs";

// The products in focus. Kachizaka, Orochia, Yasakia and Yororis are paused (2026-10-25): their environments are deleted.
export const PRODUCTS = {
  orazaka: { host: "dev.orazaka.com", admin: "admin.orazaka.com", health: ["/api/healthz", "/api/health"], signup: ["/api/auth/register"], mobile: true, repos: ["orazaka", "orazaka-web-client", "orazaka-ui-kit", "orazaka-mobile-client", "orazaka-packs", "orazaka-studio", "orazaka-edge", "orazaka-ai-engine", "orazaka-worker-media", "orazaka-job-service", "orazaka-conversation-service", "orazaka-knowledge-service", "orazaka-automation-service", "krizaka-users", "krizaka-billing", "krizaka-notifications"], ci: "orazaka" },
  yomizaka: { host: "dev.yomizaka.com", admin: "admin.yomizaka.com", health: ["/api/healthz"], signup: ["/api/auth/sign-up"], repos: ["yomizaka"], ci: "yomizaka" },
  akinaza: { host: "dev.akinaza.com", admin: "admin.akinaza.com", health: ["/api/healthz"], signup: ["/api/auth/sign-up"], repos: ["akinaza"], ci: "akinaza" },
};

/** Count the alerts that block `security.alerts`: CodeQL high/critical, Dependabot high/critical, any secret alert. */
export function blockingAlerts({ codeql = [], dependabot = [], secrets = [] }) {
  const hi = (s) => s === "high" || s === "critical";
  return {
    codeql: codeql.filter((a) => a.tool?.name === "CodeQL" && hi(a.rule?.security_severity_level)).length,
    dependabot: dependabot.filter((a) => hi(a.security_advisory?.severity)).length,
    secrets: secrets.length,
  };
}

/** GET a GitHub API list (paginated) with the authenticated `gh`; [] when the endpoint is closed to us. */
const gh = (path, jq = ".[]", paginate = true) => {
  try {
    const out = execFileSync("gh", ["api", ...(paginate ? ["--paginate"] : []), path, "--jq", jq], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};

async function status(url, init) {
  try {
    return (await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000), ...init })).status;
  } catch {
    return 0;
  }
}

export async function probe(id, { seo } = {}) {
  const p = PRODUCTS[id];
  const r = {};
  const base = `https://${p.host}`;
  const home = await fetch(base + "/", { redirect: "follow", signal: AbortSignal.timeout(20000) }).catch(() => null);
  const html = home ? await home.text() : "";
  const health = (await Promise.all(p.health.map((h) => status(base + h)))).some((s) => s === 200);
  r["site.healthy"] = { ok: Boolean(home?.ok) && health && /v\d+\.\d+\.\d+/.test(html), note: `home ${home?.status}, health ${health}, version ${/v\d+\.\d+\.\d+[^<"\s]*/.exec(html)?.[0] ?? "none"}` };
  r["ui.krizaka-ui (one footer)"] = { ok: (html.match(/<footer/g) ?? []).length === 1, note: `${(html.match(/<footer/g) ?? []).length} <footer>` };
  if (p.signup.length) {
    const codes = await Promise.all(p.signup.map((s) => status(base + s, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "probe@example.invalid", password: "Aa1!probeprobe", username: "probe" }) })));
    r["site.signup-closed"] = { ok: codes.every((c) => c === 403), note: `POST ${p.signup.join(",")} -> ${codes.join(",")}` };
  } else if (p.signupTest) {
    // A passwordless product has no sign-up endpoint to POST to (the code flow answers the same 200 for anyone): the proof is its end-to-end test.
    const seen = await status(p.signupTest);
    r["site.signup-closed"] = { ok: seen === 200, note: `proved by a test: ${p.signupTest} -> ${seen}` };
  } else r["site.signup-closed"] = { ok: false, note: "no sign-up endpoint known: prove it by a test" };
  if (p.admin) {
    const robots = await (await fetch(`https://${p.admin}/robots.txt`, { signal: AbortSignal.timeout(20000) }).catch(() => null))?.text();
    const head = await fetch(`https://${p.admin}/`, { redirect: "manual", signal: AbortSignal.timeout(20000) }).catch(() => null);
    r["admin.noindex"] = { ok: /Disallow:\s*\/\s*$/m.test(robots ?? "") && /noindex/.test(head?.headers.get("x-robots-tag") ?? ""), note: "robots Disallow / and X-Robots-Tag" };
  }
  const alerts = { codeql: [], dependabot: [], secrets: [] };
  for (const repo of p.repos) {
    alerts.codeql.push(...gh(`repos/krizaka/${repo}/code-scanning/alerts?state=open&per_page=100`));
    alerts.dependabot.push(...gh(`repos/krizaka/${repo}/dependabot/alerts?state=open&per_page=100`));
    alerts.secrets.push(...gh(`repos/krizaka/${repo}/secret-scanning/alerts?state=open`));
  }
  const b = blockingAlerts(alerts);
  r["security.alerts"] = { ok: b.codeql + b.dependabot + b.secrets === 0, note: `codeql high ${b.codeql}, dependabot high ${b.dependabot}, secrets ${b.secrets} over ${p.repos.length} repos` };
  const runs = gh(`repos/krizaka/${p.ci}/actions/runs?branch=main&per_page=40`, ".workflow_runs[]|{name,conclusion}", false).filter((x) => x.conclusion && /^(CI|Continuous Integration)$/.test(x.name));
  r["quality.ci-green"] = { ok: runs[0]?.conclusion === "success", note: `latest ${runs[0]?.conclusion ?? "none"}` };
  if (p.appLinks || p.mobile) {
    // mobile.app-links: the live files, Apple's CDN and Google's API (check-app-links.mjs, rule 5).
    const gaps = p.appLinks ? await checkLive(base, p.appLinks) : ["no app-links config for this product yet"];
    r["mobile.app-links"] = { ok: gaps.length === 0, note: gaps.length ? gaps.slice(0, 3).join("; ") : "AASA + assetlinks served, CDNs agree" };
  }
  if (seo) {
    try {
      execFileSync("node", [seo, "--base", base, "--host", base, "--index", "off"], { stdio: "ignore" });
      r["seo.family"] = { ok: true, note: "check-seo-family --index off passes" };
    } catch {
      r["seo.family"] = { ok: false, note: "check-seo-family --index off fails (run it for the list)" };
    }
  }
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--")) ?? "all";
  const seo = args.includes("--seo") ? args[args.indexOf("--seo") + 1] : undefined;
  const ids = target === "all" ? Object.keys(PRODUCTS) : [target];
  const all = {};
  for (const id of ids) {
    if (!PRODUCTS[id]) throw new Error(`unknown product ${id}`);
    all[id] = await probe(id, { seo });
  }
  if (args.includes("--json")) console.log(JSON.stringify(all, null, 2));
  else for (const [id, r] of Object.entries(all)) for (const [k, v] of Object.entries(r)) console.log(`${v.ok ? "ok " : "GAP"} ${id} ${k} — ${v.note}`);
}
