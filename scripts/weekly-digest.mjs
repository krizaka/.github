#!/usr/bin/env node
/* « Cette semaine chez Krizaka » (krizaka/.github#185): once a week, ONE issue in this repository lists the releases of
   the week, in French and English, product by product. No model, no tokens: the releases already say it.
   The base of the newsletter and of the blog. Running it twice in a week opens nothing the second time.
   Env: GH_TOKEN, GITHUB_REPOSITORY (the repository that gets the issue); DIGEST_DATE (tests, dry runs; default today). */

import { readFileSync } from "node:fs";

const WEEK_MS = 7 * 24 * 3600 * 1000;

/** ISO week label, `2026-W43`. */
export function weekLabel(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const week = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The bullets of a `## <heading>` section of a release body; a body without sections is its bullets, in both languages. */
export function bulletsOf(body, heading) {
  const sections = (body ?? "").split(/^## /m);
  const own = sections.find((s) => s.startsWith(heading));
  const text = own ?? (sections.length === 1 ? sections[0] : "");
  return text.split("\n").filter((l) => /^\s*[-*] /.test(l)).map((l) => l.trim());
}

const LANGS = [
  { heading: "Français", title: "Cette semaine chez Krizaka", none: "Aucune livraison cette semaine." },
  { heading: "English", title: "This week at Krizaka", none: "No release this week." },
];

/** The issue body from `{ product, tag, url, body }[]` (the releases of the week). */
export function renderDigest(releases) {
  if (!releases.length) return LANGS.map((l) => `## ${l.title}\n\n${l.none}`).join("\n\n");
  const byProduct = Map.groupBy(releases, (r) => r.product);
  return LANGS.map((l) => {
    const blocks = [...byProduct].map(([product, list]) => {
      const lines = list.map((r) => `**[${r.tag}](${r.url})**\n${bulletsOf(r.body, l.heading).join("\n")}`);
      return `### ${product}\n\n${lines.join("\n\n")}`;
    });
    return `## ${l.title}\n\n${blocks.join("\n\n")}`;
  }).join("\n\n");
}

async function main() {
  const { GH_TOKEN: auth, GITHUB_REPOSITORY: home } = process.env;
  const now = process.env.DIGEST_DATE ? new Date(process.env.DIGEST_DATE) : new Date();
  const call = async (url, init = {}) => {
    const res = await fetch(url, {
      ...init,
      headers: { authorization: `Bearer ${auth}`, accept: "application/vnd.github+json", "user-agent": "krizaka-weekly-digest", ...(init.body ? { "content-type": "application/json" } : {}) },
    });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return res.json();
  };
  const { products } = JSON.parse(readFileSync(new URL("../release-repos.json", import.meta.url), "utf8"));
  const org = home.split("/")[0];
  const since = now.getTime() - WEEK_MS;

  const releases = [];
  for (const { name, repos } of products) {
    for (const repo of repos) {
      const list = await call(`https://api.github.com/repos/${org}/${repo}/releases?per_page=30`).catch(() => []);
      for (const r of list) if (!r.draft && Date.parse(r.published_at) >= since) releases.push({ product: name, tag: `${repo} ${r.tag_name}`, url: r.html_url, body: r.body });
    }
  }

  const title = `Cette semaine chez Krizaka, ${weekLabel(now)}`;
  const existing = await call(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${home} is:issue in:title "${title}"`)}`);
  if (existing.total_count > 0) return console.log(`weekly-digest: "${title}" already exists (#${existing.items[0].number})`);
  const issue = await call(`https://api.github.com/repos/${home}/issues`, { method: "POST", body: JSON.stringify({ title, body: renderDigest(releases), labels: ["type:marketing", "area:growth"] }) });
  console.log(`weekly-digest: opened #${issue.number} (${releases.length} releases)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
