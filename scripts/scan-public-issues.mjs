#!/usr/bin/env node
/* Public issues that should be internal (security lane, 2026-10-30 — « la sécurité prime »).
   GitHub issues share their repository's visibility. Agents open issues in krizaka/krizaka-internal by default; a public
   repository gets only public-facing work. This scan reads the issues OUR APPS opened in the org's public repositories in
   the last SCAN_DAYS days, flags those that look internal (security, fraud, pricing, infra, legal, founder — the criteria of
   krizaka-internal's README) and keeps ONE tracking issue in krizaka/krizaka-internal listing them. It cannot transfer
   (that needs admin): the CTO transfers with `gh issue transfer`. An issue labelled `public` was reviewed and stays.
   The logs of this repository are public: the script prints counts only, never a title.
   Env: GH_TOKEN (read the public repos, write issues in krizaka-internal); SCAN_DAYS (default 7); SCAN_DRY_RUN=1 (no write). */

export const ORG = "krizaka";
export const INTERNAL = "krizaka-internal";
export const APPS = new Set(["krizaka-agents[bot]", "orazaka[bot]"]);
export const REPORT_LABEL = "scan-report";

/** Title patterns per category (strong signals), then body patterns that need `min` hits. */
export const RULES = {
  security: {
    title: new RegExp(
      [
        String.raw`bug\(security\)|^security\b|(?<!\d )vulnerab|\bCVE\b|\bleak`,
        String.raw`exposed|unauthenticated|not verified server|faille|\bsecrets?\b|bypass`,
        String.raw`static analysis findings \(\d+ bugs?, [1-9]\d* vulnerab`,
      ].join("|"),
      "i",
    ),
    body: /vulnerab|exploit|bypass|unauthenticated|not verified|\bIDOR\b|\bSSRF\b|\bXSS\b|\bCSRF\b|to rotate|was exposed/gi,
    min: 3,
  },
  fraud: {
    title: /fraud|tamper|forensic|screening|tampered corpus|\brecall\b|false.positive|faux.positif|risk engine|anti.?abuse|authenticity signal/i,
    body: /\brecall\b|false.positive|faux.positif|\boverlay|pasted image|jpeg edit|evasion|tampered corpus/gi,
    min: 2,
  },
  pricing: {
    title: [/\bpric|\bprix\b|tarif|\boffers?\b|\boffre|\$|\bcosts?\b|coût|budget|competit/i, /concurren|comparison|margin|marge|sponsor|commercial|strategy|stratég|finops|revenue|service levels/i],
    body: /\d ?\$|\$ ?\d|competitor|concurrent|\bmargin|\bmarge\b|\bMRR\b|USD a month|\/month/gi,
    min: 3,
  },
  infra: {
    title: /\bDNS\b|bucket|digitalocean|droplet|account (?:api )?key|connection budget|trusted sources|object.storage|porkbun|\bVPC\b|firewall|pgbouncer/i,
    body: /\b(?:\d{1,3}\.){3}\d{1,3}\b|droplet|doctl|\btor1\b|\bnyc\d\b|storage zone|kubeconfig|\bssh\s|secret name|_API_KEY\b/gi,
    min: 3,
  },
  legal: {
    title: /\blegal\b|lawyer|avocat|law ?25|loi ?25|\bEFVP\b|privacy impact|\bISMS\b|\bPIMS\b|claim \(held\)|counsel|civil code/i,
    body: /lawyer|avocat|legal risk|risque (?:juridique|légal)|liabilit|privacy impact|\bEFVP\b/gi,
    min: 2,
  },
  founder: {
    title: /oussama|founder|fondateur|\bNEQ\b|\bbank\b|banque|insurance|assurance|invoice|sign the contract|approve the/i,
    body: /bank account|compte bancaire|\bNEQ\b|insurance|contract with|signed contract|payout account/gi,
    min: 2,
  },
};
export const LABEL_HINTS = {
  "area:security": "security",
  "area:legal": "legal",
  "area:compliance": "legal",
  "oussama-action": "founder",
  "owner:oussama": "founder",
};

/** The categories an issue `{ title, body, labels: string[] }` looks like, with the reason for each. */
export function classify(issue) {
  const found = {};
  const body = issue.body ?? "";
  for (const [cat, r] of Object.entries(RULES)) {
    const titles = Array.isArray(r.title) ? r.title : [r.title];
    if (titles.some((t) => t.test(issue.title ?? ""))) found[cat] = "title";
    else {
      const hits = body.match(r.body)?.length ?? 0;
      if (hits >= r.min) found[cat] = `body ×${hits}`;
    }
  }
  for (const l of issue.labels ?? []) if (LABEL_HINTS[l] && !found[LABEL_HINTS[l]]) found[LABEL_HINTS[l]] = `label ${l}`;
  return found;
}

/** Whether the scan looks at this issue at all: opened by one of our apps, not a PR, not marked `public`, recent. */
export function inScope(issue, sinceMs) {
  if (issue.pull_request) return false;
  if (!APPS.has(issue.user?.login)) return false;
  if ((issue.labels ?? []).some((l) => (l.name ?? l) === "public")) return false;
  return Date.parse(issue.created_at) >= sinceMs;
}

/** The tracking issue's body from `{ repo, number, url, categories }[]`. */
export function renderReport(suspects, now = new Date()) {
  const head = `Issues opened by our apps in **public** repositories that look internal (criteria: README). Transfer each with\n\`gh issue transfer <n> krizaka/${INTERNAL} -R krizaka/<repo>\`, or label it \`public\` once reviewed. Updated ${now.toISOString().slice(0, 10)} by krizaka/.github « Public issues scan ».`;
  if (!suspects.length) return `${head}\n\nNo suspect issue.`;
  const why = (categories) => Object.entries(categories).map(([c, reason]) => "`" + c + "` (" + reason + ")").join(", ");
  const rows = suspects.map((s) => `- [ ] ${s.url} — ${why(s.categories)}`);
  return `${head}\n\n**${suspects.length} suspect issue(s):**\n\n${rows.join("\n")}`;
}

/** Only paths of the GitHub REST API under this org, made of safe characters (names come from the API, encoded below). */
export const SAFE_PATH = /^(?:orgs\/krizaka\/repos|repos\/krizaka\/[\w.-]+\/issues(?:\/\d+)?)(?:\?[\w=&%.:-]*)?$/;

async function gh(path, init = {}) {
  if (!SAFE_PATH.test(path) || path.includes("..")) throw new Error("refused API path");
  const url = new URL(path, "https://api.github.com/");
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function all(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

async function main() {
  const days = Number(process.env.SCAN_DAYS ?? 7);
  const sinceMs = Date.now() - days * 24 * 3600 * 1000;
  const since = encodeURIComponent(new Date(sinceMs).toISOString());
  const repos = (await all(`orgs/${ORG}/repos?type=public`)).filter((r) => !r.archived && !r.private);
  const suspects = [];
  let scanned = 0;
  for (const r of repos) {
    const issues = (await all(`repos/${ORG}/${encodeURIComponent(r.name)}/issues?state=open&since=${since}`)).filter((i) => inScope(i, sinceMs));
    scanned += issues.length;
    for (const i of issues) {
      const categories = classify({ title: i.title, body: i.body, labels: i.labels.map((l) => l.name) });
      if (Object.keys(categories).length) suspects.push({ repo: r.name, number: i.number, url: i.html_url, categories });
    }
  }
  console.log(`public repos: ${repos.length}, app issues in the last ${days} days: ${scanned}, suspects: ${suspects.length}`);
  if (process.env.SCAN_DRY_RUN === "1") return;
  const body = renderReport(suspects);
  const open = await gh(`repos/${ORG}/${INTERNAL}/issues?state=open&labels=${REPORT_LABEL}&per_page=1`);
  if (open.length) await gh(`repos/${ORG}/${INTERNAL}/issues/${open[0].number}`, { method: "PATCH", body: JSON.stringify({ body }) });
  else if (suspects.length)
    await gh(`repos/${ORG}/${INTERNAL}/issues`, { method: "POST", body: JSON.stringify({ title: "Public issues that look internal (scan)", body, labels: [REPORT_LABEL, "lane:security"] }) });
  let outcome = "nothing to report";
  if (open.length) outcome = "tracking issue updated";
  else if (suspects.length) outcome = "tracking issue opened";
  console.log(outcome);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
