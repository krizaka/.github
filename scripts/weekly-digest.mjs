#!/usr/bin/env node
/* « Cette semaine chez Krizaka » (krizaka-internal#747): once a week, opens a draft PR in krizaka-blog
   with the week's releases in French and English. No model, no tokens. Idempotent: one draft per ISO week.
   Env: GH_TOKEN (must have contents:write + pull-requests:write on BLOG_REPO), BLOG_REPO (default krizaka/krizaka-blog),
        DIGEST_DATE (tests, dry runs; default today). */

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
  const { GH_TOKEN: auth } = process.env;
  const blogRepo = process.env.BLOG_REPO ?? "krizaka/krizaka-blog";
  const org = blogRepo.split("/")[0];
  const now = process.env.DIGEST_DATE ? new Date(process.env.DIGEST_DATE) : new Date();

  const headers = { authorization: `Bearer ${auth}`, accept: "application/vnd.github+json", "user-agent": "krizaka-weekly-digest" };
  const call = async (url, init = {}) => {
    const res = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init.body ? { "content-type": "application/json" } : {}) },
    });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return res.json();
  };

  const { products } = JSON.parse(readFileSync(new URL("../release-repos.json", import.meta.url), "utf8"));
  const since = now.getTime() - WEEK_MS;

  const releases = [];
  for (const { name, repos } of products) {
    for (const repo of repos) {
      const list = await call(`https://api.github.com/repos/${org}/${repo}/releases?per_page=30`).catch(() => []);
      for (const r of list) if (!r.draft && Date.parse(r.published_at) >= since) releases.push({ product: name, tag: `${repo} ${r.tag_name}`, url: r.html_url, body: r.body });
    }
  }

  const week = weekLabel(now);
  const title = `Cette semaine chez Krizaka, ${week}`;
  const slug = `cette-semaine-${week.toLowerCase()}`;
  const branch = `draft/digest-${week.toLowerCase()}`;

  // idempotent: one draft per ISO week
  const branchCheck = await fetch(`https://api.github.com/repos/${blogRepo}/git/refs/heads/${branch}`, { headers });
  if (branchCheck.ok) return console.log(`weekly-digest: branch already exists for ${week}`);

  // github.com/krizaka/… links in release notes → repo: format for the blog's link resolver
  const body = renderDigest(releases).replace(
    /https:\/\/github\.com\/krizaka\/([\w-]+)(\/[^\s)"']*)?/g,
    (_, repo, rest = "") => `[${repo}${rest}](repo:${repo}${rest})`,
  );

  const dateStr = now.toISOString().slice(0, 10);
  const mdx = `---\ntitle: "${title}"\ndescription: "Les livraisons de la semaine."\ndate: ${dateStr}\nauthor: krizaka\ndraft: true\n---\n\n${body}\n`;

  const ref = await call(`https://api.github.com/repos/${blogRepo}/git/refs/heads/main`);
  await call(`https://api.github.com/repos/${blogRepo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
  });
  await call(`https://api.github.com/repos/${blogRepo}/contents/content/posts/${slug}.fr.mdx`, {
    method: "PUT",
    body: JSON.stringify({ message: `draft: ${title}`, content: Buffer.from(mdx).toString("base64"), branch }),
  });
  const pr = await call(`https://api.github.com/repos/${blogRepo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title,
      body: `Weekly digest auto-generated for ${week}. Remove \`draft: true\` and add a cover to publish.`,
      head: branch,
      base: "main",
      draft: true,
    }),
  });
  console.log("weekly-digest: draft PR #%d opened in %s (%d releases)", Number(pr.number), blogRepo, releases.length);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
