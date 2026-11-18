#!/usr/bin/env node
// WHY  The family says the same thing everywhere (krizaka-internal#3910, #4008): the 12 rendered footers equal `footerFor(id)` of @krizaka/org,
//      the org profile README carries the family's own promises, a member link never answers 404. A guard of the source (the org package) is not
//      enough: the bug of #4008 lived in what the sites RENDER. This one reads the rendered pages and the public profile.
// WHAT The readers (`readFooter`, `readHome`, `readProfile`) and the rules (`checkFooter`, `checkHome`, `checkProfile`, `checkSiteLive`, `checkRegistry`)
//      are pure and tested on recorded HTML (tests/family-drift.test.mjs); `runGuard` wires them to a fetch; the network part is at the bottom.
// HOW  node scripts/family-drift.mjs --org-dir <dir with node_modules/@krizaka/org> [--issues] [--report file.md]
//      It REPORTS: the sites change on their own pace, so it never blocks a site's CI. Without --issues the exit code is 1 on any drift;
//      with --issues each drift becomes one issue (opened, or commented when open) and the run stays green. The registry is
//      docs/standards/family-surfaces.json (docs/standards/family-surfaces.md says the contract).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REGISTRY = "docs/standards/family-surfaces.json";
const REPOS = "repos.json";
const ISSUE_REPO = "krizaka/krizaka-internal";
const MAX_ISSUES = 80;
const NOTES = /release notes|notes de version|\/releases/i;
const VERSION = /\d+\.\d+\.\d+/;

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&middot;": "·", "&nbsp;": " " };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|middot|nbsp);/g, (e) => ENTITIES[e]);
const strip = (s) => decode(s.replace(/<(script|style)\b.*?<\/\1>/gis, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const squash = (s) => strip(s).toLowerCase().replace(/[*_`]/g, "");
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find((v) => v !== undefined);

/** A URL without its fragment, its trailing slash and the case of its host; a relative one stays as it is. */
export const norm = (u) => {
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return u;
  }
};
const hostOf = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
};

/** The LAST `<footer>` of a page: its links (the accessible name of an icon link is its `aria-label`) and its text; null when there is none. */
export function readFooter(html) {
  const start = html.toLowerCase().lastIndexOf("<footer");
  if (start < 0) return null;
  const end = html.toLowerCase().indexOf("</footer>", start);
  const body = html.slice(start, end < 0 ? undefined : end);
  const links = [...body.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gis)]
    .map(([, tag, inner]) => ({ href: attr(tag, "href") ?? "", text: attr(tag, "aria-label") ?? strip(inner) }))
    .filter((l) => l.href);
  return { links, text: strip(body) };
}

/** What a home says of itself: its h1, the `data-slot` it carries (the render contract of `SiteHome`) and its primary buttons (`data-primary`). */
export function readHome(html) {
  const h1 = html.match(/<h1\b[^>]*>(.*?)<\/h1>/is);
  return {
    h1: h1 ? strip(h1[1]) : "",
    slots: [...new Set([...html.matchAll(/\bdata-slot\s*=\s*"([^"]+)"/g)].map((m) => m[1]))],
    primary: [...html.matchAll(/<[^>]*\bdata-primary(?:\s*=\s*"true")?[\s>\/][^>]*>/g)].length,
  };
}

/** The org profile README: every link, its text without markup and the names it puts in bold (a member it names). */
export function readProfile(markdown) {
  return {
    links: [...markdown.matchAll(/(?<!!)\[([^\]]*)\]\((\S+?)\)/g)].map(([, text, href]) => ({ href, text })),
    text: squash(markdown),
    bold: new Set([...markdown.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim().toLowerCase())),
  };
}

const drift = (rule, subject, detail) => ({ rule, subject, detail });

/** One drift per rule and per site: the several differences of one rule are lines of its detail. */
const collapse = (id, drifts) =>
  [...Map.groupBy(drifts, (d) => d.rule)].map(([rule, same]) => (same.length === 1 ? same[0] : drift(rule, id, same.map((d) => d.detail).join("; "))));

/** Rows A–E of the footer of `id` (`footerFor(id)`) against the rendered one. */
export function checkFooter({ id, expected, read, familyHosts = [] }) {
  if (!read) return [drift("footer-absent", id, "the page has no <footer>")];
  const out = [];
  const hrefs = new Set(read.links.map((l) => norm(l.href)));
  const entries = expected.groups.flatMap((g) => g.entries);
  for (const e of entries) {
    if (!hrefs.has(norm(e.url))) out.push(drift("footer-family-missing", `${id}:${e.id}`, `the family link to ${e.url} (${e.name}) is not in the footer`));
  }
  const expectedHosts = new Set(entries.map((e) => hostOf(e.url)));
  for (const l of read.links) {
    const host = hostOf(l.href);
    if (host && familyHosts.includes(host) && !expectedHosts.has(host)) {
      out.push(drift("footer-unexpected-link", `${id}:${host}`, `the footer links ${l.href} (${l.text}), a family address the org does not list for this site`));
    }
  }
  for (const s of expected.social) {
    if (!hrefs.has(norm(s.url))) out.push(drift("footer-social", `${id}:${s.id}`, `the ${s.label} link ${s.url} is not in the footer`));
  }
  for (const l of expected.legal) {
    if (!hrefs.has(norm(l.url.fr)) && !hrefs.has(norm(l.url.en))) out.push(drift("footer-legal", `${id}:${l.id}`, `the ${l.label.en} page ${l.url.en} is not linked`));
  }
  const text = squash(read.text);
  if (!text.includes(squash(expected.line.fr)) && !text.includes(squash(expected.line.en))) {
    out.push(drift("footer-line", id, `the line « ${expected.line.en} » is not in the footer`));
  }
  if (expected.source && !hrefs.has(norm(expected.source))) out.push(drift("footer-source", id, `the source link ${expected.source} is not in the footer`));
  if (expected.license && !text.includes(squash(expected.license))) out.push(drift("footer-licence", id, `the licence ${expected.license} is not in the footer`));
  if (expected.version) {
    if (!VERSION.test(read.text)) out.push(drift("footer-version", id, "the footer shows no version"));
    if (!read.links.some((l) => NOTES.test(l.text) || NOTES.test(l.href))) out.push(drift("footer-release-notes", id, "the footer has no release notes link"));
  }
  return collapse(id, out);
}

/** The home: the promise is `words.line`, the slots of its kind are there, exactly one primary button. `home` null (not read) checks nothing. */
export function checkHome({ id, kind, kinds, line, home }) {
  if (!home) return [];
  const out = [];
  const h1 = squash(home.h1);
  if (h1 !== squash(line.fr) && h1 !== squash(line.en)) out.push(drift("home-promise", id, `the h1 « ${home.h1} » is not words.line « ${line.en} »`));
  const spec = kinds[kind];
  const missing = (spec?.required ?? []).filter((s) => !home.slots.includes(s));
  if (missing.length) out.push(drift("home-slot", id, `the ${kind} home lacks the slots: ${missing.join(", ")}`));
  if (home.primary !== 1) out.push(drift("home-primary", id, `the home has ${home.primary} primary buttons, exactly one is required`));
  return out;
}

/** The org profile: no link to a family address that is not public and live, and the promise of a member it names is its `words.line`. */
export function checkProfile({ read, members, familyHosts, publicHosts }) {
  const out = [];
  for (const l of read.links) {
    const host = hostOf(l.href);
    if (host && familyHosts.includes(host) && !publicHosts.has(host)) out.push(drift("profile-unexpected-link", l.href, `the org profile links ${l.href}, a family address that is not a public live member`));
  }
  for (const m of members.filter((x) => x.visibility === "public")) {
    if (read.bold.has(m.name.toLowerCase()) && !read.text.includes(squash(m.words.line.en))) {
      out.push(drift("profile-promise", m.id, `the org profile names ${m.name} without its promise « ${m.words.line.en} »`));
    }
  }
  return out;
}

const answers = (status) => status >= 200 && status < 400;

/** `siteLive` both ways: true and silent, false and answering. */
export function checkSiteLive(member, { status }) {
  if (!member.urls.site) return [];
  if (member.urls.siteLive && !answers(status)) return [drift("site-silent", member.id, `siteLive is true and ${member.urls.site} answers ${status || "nothing"}`)];
  if (!member.urls.siteLive && answers(status)) return [drift("site-answering", member.id, `siteLive is false and ${member.urls.site} answers ${status}`)];
  return [];
}

/** The registry (docs/standards/family-surfaces.json) against the org members and the repository registry (repos.json). */
export function checkRegistry({ registry, members, repos }) {
  const out = [];
  const ids = new Set(registry.sites.map((s) => s.id));
  const registered = new Set(registry.sites.map((s) => s.repo));
  const known = new Set(repos.map((r) => r.name));
  const byId = new Map(members.map((m) => [m.id, m]));
  for (const m of members.filter((x) => x.visibility === "public" && x.urls.site && x.kind !== "github" && !ids.has(x.id))) {
    out.push(drift("registry-site-missing", m.id, `the member ${m.id} (${m.urls.site}) has no line in ${REGISTRY}`));
  }
  for (const s of registry.sites.filter((x) => x.public !== false)) {
    if (!byId.has(s.id)) out.push(drift("registry-member-unknown", s.id, `${REGISTRY} has a line for ${s.id}, the org has no such public member`));
    if (!known.has(s.repo)) out.push(drift("registry-repo-unknown", s.repo, `${REGISTRY} names the repository ${s.repo}, ${REPOS} does not list it`));
  }
  for (const r of repos.filter((x) => x.kind === "site" && !x.archived && !registered.has(x.name))) {
    out.push(drift("registry-repo-missing", r.name, `the site repository ${r.name} has no line in ${REGISTRY}`));
  }
  return out;
}

/** One issue per drift: the title is stable, so a second run comments instead of opening another. */
export const issueFor = (d) => ({
  title: `.github · fix(family): ${d.rule}: ${d.subject}`,
  body: `The family-drift guard found a difference from the org.\n\n- rule: \`${d.rule}\`\n- subject: \`${d.subject}\`\n- ${d.detail}\n\nThe rules are in \`docs/standards/family-surfaces.md\`. The guard re-checks every day and comments here while the drift lasts.`,
});

const hostsOf = (urls) => [...new Set(urls.map(hostOf).filter(Boolean))];

/** Everything: read the live pages and the profile, apply the rules, return every drift. `fetchPage(url)` answers `{status, body}` (status 0 when nothing answers). */
export async function runGuard({ registry, org, footerFor, repos, fetchPage }) {
  const cache = new Map();
  const get = (url) => cache.get(url) ?? cache.set(url, fetchPage(url)).get(url);
  const members = org.members;
  const byId = new Map(members.map((m) => [m.id, m]));
  const familyHosts = hostsOf([
    ...members.map((m) => m.urls.site).filter(Boolean),
    ...registry.sites.filter((s) => s.host).map((s) => `https://${s.host}`),
    ...(registry.retiredHosts ?? []).map((h) => `https://${h}`),
  ]);
  const publicHosts = new Set(hostsOf(members.filter((m) => m.visibility === "public" && m.urls.siteLive).map((m) => m.urls.site)));
  const drifts = [...checkRegistry({ registry, members, repos })];
  const links = new Map();

  for (const site of registry.sites.filter((s) => s.public !== false)) {
    const member = byId.get(site.id);
    if (!member?.urls.site) continue;
    const page = await get(member.urls.site);
    drifts.push(...checkSiteLive(member, page));
    if (!answers(page.status)) continue;
    let expected;
    try {
      expected = footerFor(site.id);
    } catch (e) {
      drifts.push(drift("footer-selection-missing", site.id, e.message));
    }
    if (expected) {
      drifts.push(...checkFooter({ id: site.id, expected, read: readFooter(page.body), familyHosts }));
      for (const e of expected.groups.flatMap((g) => g.entries)) links.set(e.url, [...(links.get(e.url) ?? []), `the footer of ${site.id}`]);
    }
    drifts.push(...checkHome({ id: site.id, kind: site.kind, kinds: registry.kinds, line: member.words.line, home: readHome(page.body) }));
  }

  const profile = await get(registry.profile);
  if (answers(profile.status)) {
    const read = readProfile(profile.body);
    drifts.push(...checkProfile({ read, members, familyHosts, publicHosts }));
    for (const l of read.links.filter((x) => familyHosts.includes(hostOf(x.href)))) links.set(l.href, [...(links.get(l.href) ?? []), "the org profile"]);
  } else {
    drifts.push(drift("profile-unreadable", registry.profile, `the org profile README answers ${profile.status || "nothing"}`));
  }

  for (const [url, seen] of links) {
    if ((registry.unprobed ?? []).some((prefix) => url.startsWith(prefix))) continue;
    const { status } = await get(url);
    if (!answers(status)) drifts.push(drift("link-dead", url, `${url} answers ${status || "nothing"}, linked from ${[...new Set(seen)].join(", ")}`));
  }
  return { drifts };
}

/** The markdown report of a run. */
export const report = (drifts) =>
  drifts.length === 0
    ? "No drift: the rendered footers, homes and the org profile equal the org.\n"
    : [`${drifts.length} drift(s) from the org:\n`, "| rule | subject | detail |", "| :--- | :--- | :--- |", ...drifts.map((d) => `| \`${d.rule}\` | \`${d.subject}\` | ${d.detail.replace(/\|/g, "\\|")} |`), ""].join("\n");

/** Opens an issue per drift, or comments on the open one with the same title; `gh(args, input?)` runs the GitHub CLI. */
export function upsertIssues(drifts, gh) {
  for (const d of drifts.slice(0, MAX_ISSUES)) {
    const { title, body } = issueFor(d);
    const found = JSON.parse(gh(["issue", "list", "--repo", ISSUE_REPO, "--state", "open", "--search", `"${title}" in:title`, "--json", "number,title"]) || "[]").find((i) => i.title === title);
    if (found) gh(["issue", "comment", String(found.number), "--repo", ISSUE_REPO, "--body-file", "-"], body);
    else gh(["issue", "create", "--repo", ISSUE_REPO, "--title", title, "--body-file", "-", "--label", "repo:.github", "--label", "lane:platform", "--label", "type:fix"], body);
  }
  return Math.max(0, drifts.length - MAX_ISSUES);
}

const fetchLive = async (url) => {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "krizaka-family-drift" } });
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 0, body: "" };
  }
};

const arg = (name) => process.argv[process.argv.indexOf(name) + 1];

async function main() {
  const dir = arg("--org-dir");
  if (!dir || dir.startsWith("--")) throw new Error("--org-dir <directory with node_modules/@krizaka/org> is required");
  const { org, footerFor } = await import(pathToFileURL(join(dir, "node_modules/@krizaka/org/dist/index.js")).href);
  const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
  const repos = JSON.parse(readFileSync(REPOS, "utf8")).repositories;
  const { drifts } = await runGuard({ registry, org, footerFor, repos, fetchPage: fetchLive });
  const text = report(drifts);
  console.log(text);
  const out = process.argv.includes("--report") ? arg("--report") : null;
  if (out) writeFileSync(out, text);
  if (process.argv.includes("--issues")) {
    const gh = (args, input) => execFileSync("gh", args, { encoding: "utf8", input });
    const left = upsertIssues(drifts, gh);
    if (left) console.log(`${left} more drift(s) not turned into issues (cap ${MAX_ISSUES} per run).`);
    return;
  }
  if (drifts.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
