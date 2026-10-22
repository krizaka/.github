#!/usr/bin/env node
/* Release notes of a product repository (krizaka/.github#184): on a push to main, the pull requests merged since the last
   release become one GitHub Release, tagged by date (`YYYY.MM.DD.N`), with an English and a French section.
   - Shown: feat, fix, perf (and any breaking `type!:`). Quiet: chore, ci, deps, docs, test, refactor, build, style.
   - A PR says its own words with `Release-note-en:` / `Release-note-fr:` lines in its description; otherwise the title's
     text is used as written, in both languages. Nothing is invented or translated here.
   - The body is read by krizaka.com (krizaka-com `parseReleaseBodies`): keep `## English` / `## Français`, one bullet per
     change, `- <type>: <text> <pull request URL>`.
   Env: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA; GITHUB_OUTPUT (optional) receives `tag`. Exit 0 with no release when
   nothing is news. */

import { appendFileSync } from "node:fs";

export const SHOWN = ["feat", "fix", "perf"];
export const SECTIONS = [
  { heading: "English", noteKey: "en", labels: { feat: "New", fix: "Fixed", perf: "Improved" }, colon: ": " },
  { heading: "Français", noteKey: "fr", labels: { feat: "Nouveautés", fix: "Corrections", perf: "Améliorations" }, colon: " : " },
];
const TITLE = /^(\w+)(?:\([^)]*\))?(!)?:\s*(.+)$/;
const MAX_ENTRIES = 30;

/** An em dash is a mark of machine prose: a colon says the same in a release line. */
export const noDash = (s) => s.replace(/\s+—\s+/g, ": ").replace(/—/g, "-");

/** `{ type, breaking, subject }` of a conventional title; a title that is not one is a plain change (`type` empty). */
export function parseTitle(title) {
  const m = TITLE.exec(title.trim().replace(/\s*\(#\d+\)\s*$/, ""));
  return m ? { type: m[1].toLowerCase(), breaking: Boolean(m[2]), subject: m[3].trim() } : { type: "", breaking: false, subject: title.trim() };
}

/** The `Release-note-<lang>:` line of a PR description, or undefined. */
export function releaseNote(body, lang) {
  const m = new RegExp(`^\\s*Release-note-${lang}\\s*:\\s*(.+?)\\s*$`, "im").exec(body ?? "");
  return m?.[1];
}

const sentence = (s) => noDash(s.replace(/^./, (c) => c.toUpperCase()).replace(/[.\s]*$/, "."));

/** The entries a release shows: one per shown PR, in merge order, each with its text in both languages. */
export function entriesFrom(prs) {
  return prs
    .map((pr) => ({ pr, ...parseTitle(pr.title) }))
    .filter((e) => e.breaking || SHOWN.includes(e.type))
    .slice(0, MAX_ENTRIES)
    .map(({ pr, type, breaking, subject }) => ({
      type: `${type}${breaking ? "!" : ""}`,
      url: pr.html_url,
      text: Object.fromEntries(SECTIONS.map(({ noteKey }) => [noteKey, sentence(releaseNote(pr.body, noteKey) ?? subject)])),
    }));
}

/** The next tag of the day: `2026.10.22.1`, then `.2`… from the tags that exist. */
export function nextTag(tags, now = new Date()) {
  const day = now.toISOString().slice(0, 10).replaceAll("-", ".");
  const same = new RegExp(`^v?${day.replaceAll(".", "\\.")}\\.(\\d+)$`);
  const taken = tags.map((t) => same.exec(t)?.[1]).filter(Boolean).map(Number);
  return `${day}.${Math.max(0, ...taken) + 1}`;
}

/** The Release's Markdown body, both languages, with a one-line count under each heading. */
export function renderBody(entries) {
  return SECTIONS.map(({ heading, noteKey, labels, colon }) => {
    const counts = Object.entries(labels)
      .map(([type, label]) => [label, entries.filter((e) => e.type.replace("!", "") === type).length])
      .filter(([, n]) => n > 0)
      .map(([label, n]) => `${label}${colon}${n}.`);
    const bullets = entries.map((e) => `- ${e.type}: ${e.text[noteKey]} ${e.url}`);
    return [`## ${heading}`, "", counts.join(" "), "", ...bullets].join("\n");
  })
    .join("\n\n")
    .concat("\n");
}

async function main() {
  const { GH_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_SHA: sha } = process.env;
  const call = async (url, init = {}) => {
    const res = await fetch(url, {
      ...init,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "krizaka-release-notes", ...(init.body ? { "content-type": "application/json" } : {}) },
    });
    if (!res.ok) throw new Error(`${init.method ?? "GET"} ${url} answered ${res.status}`);
    return res.json();
  };
  const api = (path, init) => call(`https://api.github.com/repos/${repo}${path}`, init);

  const releases = (await api("/releases?per_page=100")).filter((r) => !r.draft);
  const last = releases.find((r) => /^v?\d{4}\.\d{2}\.\d{2}\.\d+$/.test(r.tag_name));
  if (last?.target_commitish === sha) return console.log("release-notes: this commit already has its release");

  // Exactly the commits since the last release, whatever the merge order: a PR belongs to it by its merge commit.
  const inRange = last ? new Set((await api(`/compare/${last.tag_name}...${sha}?per_page=250`)).commits.map((c) => c.sha)) : null;
  const since = last ? new Date(Date.parse(last.created_at) - 24 * 3600 * 1000).toISOString().slice(0, 10) : "";
  const query = encodeURIComponent(`repo:${repo} is:pr is:merged base:main${since ? ` merged:>=${since}` : ""}`);
  const found = (await call(`https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=100`)).items ?? [];
  const prs = [];
  for (const item of found) {
    const pr = await api(`/pulls/${item.number}`);
    if (!inRange || inRange.has(pr.merge_commit_sha)) prs.push(pr);
  }
  prs.sort((a, b) => Date.parse(b.merged_at) - Date.parse(a.merged_at));

  const entries = entriesFrom(prs);
  if (!entries.length) return console.log("release-notes: nothing but housekeeping since the last release, no release");

  const tag = nextTag(releases.map((r) => r.tag_name));
  await api("/releases", { method: "POST", body: JSON.stringify({ tag_name: tag, target_commitish: sha, name: tag, body: renderBody(entries), make_latest: "true" }) });
  console.log(`release-notes: ${repo} ${tag} (${entries.length} changes)`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
