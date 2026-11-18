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
const VERSION = /\d{1,6}\.\d{1,6}\.\d{1,6}/;

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&middot;": "·", "&nbsp;": " " };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|middot|nbsp);/g, (e) => ENTITIES[e]);
const isSpace = (c) => c === " " || c === "\n" || c === "\t" || c === "\r" || c === "\f";

/** The index of the `>` that closes the tag opened at `from`, quotes respected (a class like `[&>svg]` holds a `>`); -1 when it never closes. */
function tagEnd(html, from) {
  let quote = "";
  for (let i = from + 1; i < html.length; i++) {
    const c = html[i];
    if (quote) quote = c === quote ? "" : quote;
    else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return i;
  }
  return -1;
}

const skipWhile = (raw, from, test) => {
  let i = from;
  while (i < raw.length && test(raw[i])) i++;
  return i;
};

/** The value after the `=` at `raw[at]`: quoted or bare; returns it and where the next attribute starts. */
function valueAt(raw, at) {
  const from = skipWhile(raw, at + 1, isSpace);
  const quote = raw[from] === '"' || raw[from] === "'" ? raw[from] : "";
  if (!quote) {
    const end = skipWhile(raw, from, (c) => !isSpace(c));
    return { value: raw.slice(from, end), next: end };
  }
  const close = raw.indexOf(quote, from + 1);
  const end = close < 0 ? raw.length : close;
  return { value: raw.slice(from + 1, end), next: end + 1 };
}

/** The attributes of the inside of a tag (`a href="x" data-primary`), names in lower case, values decoded. A small state machine: no regex to backtrack. */
function attrsOf(raw) {
  const out = {};
  let i = skipWhile(raw, 0, (c) => !isSpace(c));
  while (i < raw.length) {
    i = skipWhile(raw, i, (c) => isSpace(c) || c === "/");
    const nameEnd = skipWhile(raw, i, (c) => !isSpace(c) && c !== "=" && c !== "/");
    const key = raw.slice(i, nameEnd).toLowerCase();
    const at = skipWhile(raw, nameEnd, isSpace);
    const { value, next } = raw[at] === "=" ? valueAt(raw, at) : { value: "", next: at };
    if (key) out[key] = decode(value);
    i = next > i ? next : i + 1;
  }
  return out;
}

/** One tag from its inside (`/a`, `a href="x"`): lower-case name (`/name` when closing) and attributes. */
function parseTag(raw) {
  const closing = raw.startsWith("/");
  const body = closing ? raw.slice(1) : raw;
  const name = body.slice(0, skipWhile(body, 0, (c) => !isSpace(c) && c !== "/"));
  return { name: (closing ? "/" : "") + name.toLowerCase(), attrs: closing ? {} : attrsOf(body) };
}

const RAW_TEXT = new Set(["script", "style"]);

/** The tags of a page in order: `name` (lower case, `/name` when closing), `attrs`, and where it starts and ends in the text. The inside of a script or a style is text, never tags. */
function tagsOf(html) {
  const out = [];
  const lower = html.toLowerCase();
  let i = html.indexOf("<");
  while (i >= 0) {
    const end = tagEnd(html, i);
    if (end < 0) break;
    const tag = { ...parseTag(html.slice(i + 1, end)), start: i, end: end + 1 };
    out.push(tag);
    i = RAW_TEXT.has(tag.name) ? lower.indexOf(`</${tag.name}`, tag.end) : tag.end;
    if (i >= 0) i = html.indexOf("<", i);
  }
  return out;
}

/** The text of a piece of HTML (or of a Markdown that carries some): tags and the content of scripts and styles gone, entities decoded, spaces squeezed. */
function strip(html) {
  let text = "";
  let last = 0;
  let until = "";
  for (const t of tagsOf(html)) {
    if (until) {
      if (t.name === until) {
        until = "";
        last = t.end;
      }
      continue;
    }
    text += `${html.slice(last, t.start)} `;
    last = t.end;
    if (t.name === "script" || t.name === "style") until = `/${t.name}`;
  }
  if (!until) text += html.slice(last);
  return decode(text).replace(/\s+/g, " ").trim();
}

const squash = (s) => strip(s).toLowerCase().replace(/[*_`]/g, "");

/** A URL without its fragment, its trailing slash and the case of its host; a relative one stays as it is. */
export const norm = (u) => {
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, "")}${url.search}`;
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

/** The links of a list of tags: `href`, and the accessible name (`aria-label`, else the text inside the `<a>`). */
function linksOf(html, tags) {
  const out = [];
  tags.forEach((t, i) => {
    if (t.name !== "a" || !t.attrs.href) return;
    const close = tags.slice(i + 1).find((x) => x.name === "/a");
    const inner = close ? html.slice(t.end, close.start) : "";
    out.push({ href: t.attrs.href, text: t.attrs["aria-label"] ?? strip(inner) });
  });
  return out;
}

/** The LAST `<footer>` of a page: its links (the accessible name of an icon link is its `aria-label`) and its text; null when there is none. */
export function readFooter(html) {
  const all = tagsOf(html);
  const open = all.findLastIndex((t) => t.name === "footer");
  if (open < 0) return null;
  const close = all.findIndex((t, i) => i > open && t.name === "/footer");
  const inside = all.slice(open + 1, close < 0 ? all.length : close);
  const endAt = all[close]?.start ?? html.length;
  return { links: linksOf(html, inside), text: strip(html.slice(all[open].end, endAt)) };
}

/** What a home says of itself: its h1, the `data-slot` it carries (the render contract of `SiteHome`) and its primary buttons (`data-primary`). */
export function readHome(html) {
  const all = tagsOf(html);
  const h1 = all.findIndex((t) => t.name === "h1");
  const h1End = all.findIndex((t, i) => i > h1 && t.name === "/h1");
  return {
    h1: h1 < 0 || h1End < 0 ? "" : strip(html.slice(all[h1].end, all[h1End].start)),
    slots: [...new Set(all.map((t) => t.attrs["data-slot"]).filter(Boolean))],
    primary: all.filter((t) => t.attrs["data-primary"] !== undefined).length,
  };
}

/** The `[text](href)` links of a Markdown, an image (`![alt](src)`) excepted; the text of a badge that is a link is empty. */
function markdownLinks(markdown) {
  const out = [];
  let at = 0;
  while ((at = markdown.indexOf("](", at)) >= 0) {
    const open = markdown.lastIndexOf("[", at);
    const close = markdown.indexOf(")", at);
    const wrapsImage = markdown[at - 1] === ")";
    const isImage = open > 0 && markdown[open - 1] === "!" && !wrapsImage;
    if (open >= 0 && close > at && !isImage) {
      out.push({ href: markdown.slice(at + 2, close).split(/\s/, 1)[0], text: wrapsImage ? "" : markdown.slice(open + 1, at) });
    }
    at += 2;
  }
  return out;
}

/** The org profile README: every link, its text without markup and the names it puts in bold (a member it names). */
export function readProfile(markdown) {
  return {
    links: markdownLinks(markdown),
    text: squash(markdown),
    bold: new Set([...markdown.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim().toLowerCase())),
  };
}

const drift = (rule, subject, detail) => ({ rule, subject, detail });

/** One drift per rule and per site: the several differences of one rule are lines of its detail. */
const collapse = (id, drifts) =>
  [...Map.groupBy(drifts, (d) => d.rule)].map(([rule, same]) => (same.length === 1 ? same[0] : drift(rule, id, same.map((d) => d.detail).join("; "))));

const familyDrifts = (id, expected, read, hrefs, familyHosts) => {
  const entries = expected.groups.flatMap((g) => g.entries);
  const expectedHosts = new Set(entries.map((e) => hostOf(e.url)));
  const missing = entries.filter((e) => !hrefs.has(norm(e.url))).map((e) => drift("footer-family-missing", `${id}:${e.id}`, `the family link to ${e.url} (${e.name}) is not in the footer`));
  const unexpected = read.links
    .filter((l) => familyHosts.includes(hostOf(l.href)) && !expectedHosts.has(hostOf(l.href)))
    .map((l) => drift("footer-unexpected-link", `${id}:${hostOf(l.href)}`, `the footer links ${l.href} (${l.text}), a family address the org does not list for this site`));
  return [...missing, ...unexpected];
};

const rowsBDDrifts = (id, expected, hrefs, text) => {
  const social = expected.social.filter((s) => !hrefs.has(norm(s.url))).map((s) => drift("footer-social", `${id}:${s.id}`, `the ${s.label} link ${s.url} is not in the footer`));
  const legal = expected.legal
    .filter((l) => !hrefs.has(norm(l.url.fr)) && !hrefs.has(norm(l.url.en)))
    .map((l) => drift("footer-legal", `${id}:${l.id}`, `the ${l.label.en} page ${l.url.en} is not linked`));
  const lineThere = text.includes(squash(expected.line.fr)) || text.includes(squash(expected.line.en));
  return [...social, ...legal, ...(lineThere ? [] : [drift("footer-line", id, `the line « ${expected.line.en} » is not in the footer`)])];
};

const rowCDrifts = (id, expected, read, hrefs, text) => {
  const out = [];
  if (expected.source && !hrefs.has(norm(expected.source))) out.push(drift("footer-source", id, `the source link ${expected.source} is not in the footer`));
  if (expected.license && !text.includes(squash(expected.license))) out.push(drift("footer-licence", id, `the licence ${expected.license} is not in the footer`));
  if (!expected.version) return out;
  if (!VERSION.test(read.text)) out.push(drift("footer-version", id, "the footer shows no version"));
  if (!read.links.some((l) => NOTES.test(l.text) || NOTES.test(l.href))) out.push(drift("footer-release-notes", id, "the footer has no release notes link"));
  return out;
};

/** Rows A–E of the footer of `id` (`footerFor(id)`) against the rendered one. */
export function checkFooter({ id, expected, read, familyHosts = [] }) {
  if (!read) return [drift("footer-absent", id, "the page has no <footer>")];
  const hrefs = new Set(read.links.map((l) => norm(l.href)));
  const text = squash(read.text);
  return collapse(id, [...familyDrifts(id, expected, read, hrefs, familyHosts), ...rowsBDDrifts(id, expected, hrefs, text), ...rowCDrifts(id, expected, read, hrefs, text)]);
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

/** One site: its liveness, then (when it answers) its footer and its home. Returns its drifts and the family links its footer carries. */
function checkSite({ site, member, page, footerFor, registry, familyHosts }) {
  const drifts = [...checkSiteLive(member, page)];
  const links = [];
  if (!answers(page.status)) return { drifts, links };
  let expected;
  try {
    expected = footerFor(site.id);
  } catch (e) {
    drifts.push(drift("footer-selection-missing", site.id, e.message));
  }
  if (expected) {
    drifts.push(...checkFooter({ id: site.id, expected, read: readFooter(page.body), familyHosts }));
    links.push(...expected.groups.flatMap((g) => g.entries).map((e) => [e.url, `the footer of ${site.id}`]));
  }
  drifts.push(...checkHome({ id: site.id, kind: site.kind, kinds: registry.kinds, line: member.words.line, home: readHome(page.body) }));
  return { drifts, links };
}

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
  const see = (url, from) => links.set(url, [...(links.get(url) ?? []), from]);

  for (const site of registry.sites.filter((s) => s.public !== false)) {
    const member = byId.get(site.id);
    if (!member?.urls.site) continue;
    const one = checkSite({ site, member, page: await get(member.urls.site), footerFor, registry, familyHosts });
    drifts.push(...one.drifts);
    one.links.forEach(([url, from]) => see(url, from));
  }

  const profile = await get(registry.profile);
  if (answers(profile.status)) {
    const read = readProfile(profile.body);
    drifts.push(...checkProfile({ read, members, familyHosts, publicHosts }));
    read.links.filter((x) => familyHosts.includes(hostOf(x.href))).forEach((l) => see(l.href, "the org profile"));
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
    : [`${drifts.length} drift(s) from the org:\n`, "| rule | subject | detail |", "| :--- | :--- | :--- |", ...drifts.map((d) => `| \`${d.rule}\` | \`${d.subject}\` | ${d.detail.replace(/[\\|]/g, "\\$&")} |`), ""].join("\n");

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

export const fetchLive = async (url) => {
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
    const gh = (args, input) => execFileSync(process.env.GH_BIN ?? "/usr/bin/gh", args, { encoding: "utf8", input });
    const left = upsertIssues(drifts, gh);
    if (left) console.log(`${left} more drift(s) not turned into issues (cap ${MAX_ISSUES} per run).`);
    return;
  }
  if (drifts.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
