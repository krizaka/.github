#!/usr/bin/env node
// The open-PR cap, checked instead of remembered (krizaka/.github#436; AGENT-RULES « Open PRs before new work »):
// at most `train.prCapPerLane` open pull requests per lane in one repository (policy.json, krizaka-internal#2781: 5, founder 2026-11-06;
// it was 3 per repository, all authors). The lane is the PR's `lane:<name>` label; a Dependabot PR without one counts in the lane
// « dependabot », any other unlabelled PR in « unlabelled ». A pile of PRs means the order or the direction was wrong.
//
//   node scripts/pr-cap.mjs check  --repo krizaka/<name> --pr <n>   a NEW PR fails when its lane is already at the cap in its repository
//   node scripts/pr-cap.mjs report [--org krizaka] [--issue <n>]    counts every non-archived repository, writes the tracking issue
//
// Exempt from the `check` (they land the backlog, so they must never be blocked by it): Dependabot security updates, the one
// pin PR of a repository (`deps/<label>` branch of propagate-pins) and the release PRs (« Version Packages », release-please); they
// still count. A fix-main PR (`fix(main): …` title or `fix-main` label: it unblocks the others, krizaka-internal#2226) is, when
// `train.fixMainExempt` is true, neither checked nor counted. The pure rules are exported and tested (tests/pr-cap.test.mjs).
import { pathToFileURL } from "node:url";

import { loadPolicy } from "./policy.mjs";

export const TRACKING_TITLE = "Open-PR cap: lanes over the cap";
const TRACKING_PREFIX = "Open-PR cap:";

const RELEASE_BRANCH = /^(changeset-release\/|release-please--)/;
const PIN_BRANCH = /^deps\/[^/]+$/;
const LANE_PREFIX = "lane:";
const DAY_MS = 86_400_000;

/** The rules from policy.json (validated, fails closed): { cap, fixMainExempt }. */
export function rulesFromPolicy(policy = loadPolicy()) {
  return { cap: policy.train.prCapPerLane, fixMainExempt: policy.train.fixMainExempt };
}

const labelsOf = (pr) => (pr.labels ?? []).map((l) => l.name);
const isFixMain = (pr) => (pr.title ?? "").startsWith("fix(main)") || labelsOf(pr).includes("fix-main");

/** The lane a PR counts in: its lane:<name> label, else « dependabot » for the bot, else « unlabelled ». */
export function laneOf(pr) {
  const label = labelsOf(pr).find((l) => l.startsWith(LANE_PREFIX));
  if (label) return label.slice(LANE_PREFIX.length);
  return pr.user?.login === "dependabot[bot]" ? "dependabot" : "unlabelled";
}

/** Why a PR is exempt from the check, or null. */
export function exemptReason(pr, rules) {
  const ref = pr.head?.ref ?? "";
  if (pr.user?.login === "dependabot[bot]" && labelsOf(pr).includes("security")) return "Dependabot security update";
  if (rules.fixMainExempt && isFixMain(pr)) return "fix-main PR";
  if (PIN_BRANCH.test(ref)) return "the repository's pin PR";
  if (RELEASE_BRANCH.test(ref) || /^Version Packages\b/.test(pr.title ?? "")) return "release PR";
  return null;
}

/** The PRs that count against a lane's cap: the lane's own, without the fix-main PRs when they are exempt. */
const counted = (openPrs, lane, rules) => openPrs.filter((p) => laneOf(p) === lane && !(rules.fixMainExempt && isFixMain(p)));

/** The verdict for a PR: it fails when the OTHER open PRs of its lane already fill the cap (it would be the next one over). */
export function verdict(openPrs, current, rules) {
  const lane = laneOf(current);
  const others = counted(openPrs, lane, rules).filter((p) => p.number !== current.number);
  const exempt = exemptReason(current, rules);
  const full = others.length >= rules.cap;
  let message = `${others.length} other open PR(s) in lane ${lane}, under the cap of ${rules.cap}.`;
  if (full && exempt) message = `${others.length} other open PRs in lane ${lane} (cap ${rules.cap}), but this one is exempt: ${exempt}.`;
  else if (full) message = `${others.length} other PRs of lane ${lane} are open in this repository (cap ${rules.cap} per lane). Land or close one before opening a new PR; the lane merges first.`;
  return { ok: !full || Boolean(exempt), others: others.length, lane, exempt, message };
}

const daysOpen = (pr, now) => Math.floor((now - Date.parse(pr.created_at)) / DAY_MS);

/** The (repository, lane) pairs over the cap, most loaded first, each with its oldest PRs. */
export function overCap(byRepo, rules) {
  const over = [];
  for (const [repo, prs] of Object.entries(byRepo)) {
    for (const lane of new Set(prs.map(laneOf))) {
      const inLane = counted(prs, lane, rules);
      if (inLane.length > rules.cap) over.push({ repo, lane, count: inLane.length, oldest: [...inLane].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).slice(0, 3) });
    }
  }
  return over.sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo) || a.lane.localeCompare(b.lane));
}

/** The body of the tracking issue: a table of the lanes over the cap with their oldest PRs, and every count. */
export function trackingBody(byRepo, now = Date.now(), rules = rulesFromPolicy()) {
  const over = overCap(byRepo, rules);
  const counts = Object.entries(byRepo).sort((a, b) => b[1].length - a[1].length).map(([r, p]) => `${r} ${p.length}`).join(" · ");
  const oldest = (o) => o.oldest.map((p) => `#${p.number} (${daysOpen(p, now)} d${p.draft ? ", draft" : ""})`).join(", ");
  const lines = over.length
    ? [
        `Lanes over the cap of ${rules.cap} open PRs per lane and repository (policy.json train.prCapPerLane): the lane merges first, nobody opens a new PR there.`,
        "",
        "| Repository | Lane | Open | Oldest PRs (days open) |",
        "| :--- | :--- | ---: | :--- |",
        ...over.map((o) => `| ${o.repo} | ${o.lane} | ${o.count} | ${oldest(o)} |`),
      ]
    : [`Every lane of every repository is at or under the cap of ${rules.cap} open PRs.`];
  return [...lines, "", `Counts per repository: ${counts || "none"}`, "", `Updated by .github/workflows/pr-cap.yml (${new Date(now).toISOString().slice(0, 16)}Z).`].join("\n");
}

async function api(path, { method = "GET", body } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const res = await fetch(`https://api.github.com/${path}`, {
    method,
    headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
  return res.json();
}

const openPulls = (repo) => api(`repos/${repo}/pulls?state=open&per_page=100`);
const flag = (argv, name) => argv[argv.indexOf(name) + 1];

async function check(argv) {
  const repo = flag(argv, "--repo");
  const [open, current] = await Promise.all([openPulls(repo), api(`repos/${repo}/pulls/${Number(flag(argv, "--pr"))}`)]);
  const v = verdict(open, current, rulesFromPolicy());
  console.log(v.ok ? `ok: ${v.message}` : `::error title=Open-PR cap::${v.message}`);
  if (!v.ok) process.exit(1);
}

async function report(argv) {
  const org = argv.includes("--org") ? flag(argv, "--org") : "krizaka";
  const repos = (await api(`orgs/${org}/repos?per_page=100&type=all`)).filter((r) => !r.archived);
  const byRepo = {};
  for (const r of repos) byRepo[r.name] = await openPulls(`${org}/${r.name}`);
  const rules = rulesFromPolicy();
  const body = trackingBody(byRepo, Date.now(), rules);
  console.log(body);
  const issues = argv.includes("--issue") ? [] : await api(`repos/${org}/.github/issues?state=all&per_page=100&labels=ci`);
  const number = argv.includes("--issue") ? Number(flag(argv, "--issue")) : issues.find((i) => i.title.startsWith(TRACKING_PREFIX) && !i.pull_request)?.number;
  const over = overCap(byRepo, rules).length > 0;
  if (number) await api(`repos/${org}/.github/issues/${number}`, { method: "PATCH", body: { title: TRACKING_TITLE, body, state: over ? "open" : "closed" } });
  else if (over) await api(`repos/${org}/.github/issues`, { method: "POST", body: { title: TRACKING_TITLE, body, labels: ["ci"] } });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const run = { check, report }[cmd];
  if (!run) {
    console.error("usage: pr-cap.mjs check --repo <org/repo> --pr <n> | report [--org krizaka] [--issue <n>]");
    process.exit(2);
  }
  try {
    await run(rest);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
