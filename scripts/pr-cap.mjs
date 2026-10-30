#!/usr/bin/env node
// The open-PR cap, checked instead of remembered (krizaka/.github#436; AGENT-RULES « Open PRs before new work »):
// at most 5 open pull requests per repository, Dependabot included. A pile of PRs means the order or the direction was wrong.
//
//   node scripts/pr-cap.mjs check  --repo krizaka/<name> --pr <n>   a NEW PR fails when its repository is already at the cap
//   node scripts/pr-cap.mjs report [--org krizaka] [--issue <n>]    counts every non-archived repository, writes the tracking issue
//
// Exempt from the `check` (they land the backlog, so they must never be blocked by it): Dependabot security updates, the one
// pin PR of a repository (`deps/<label>` branch of propagate-pins), the release PRs (« Version Packages », release-please).
// They still count in the cap. The pure rules are exported and tested (tests/pr-cap.test.mjs); the network part is below.
import { pathToFileURL } from "node:url";

// @fixed: the org rule, founder 2026-10-30 (AGENT-RULES « Open PRs before new work »)
export const CAP = 5;
export const TRACKING_TITLE = "Open-PR cap: repositories over 5 open PRs";

const RELEASE_BRANCH = /^(changeset-release\/|release-please--)/;
const PIN_BRANCH = /^deps\/[^/]+$/;
const DAY_MS = 86_400_000;

/** Why a PR is exempt from the check, or null. */
export function exemptReason(pr) {
  const labels = (pr.labels ?? []).map((l) => l.name);
  const ref = pr.head?.ref ?? "";
  if (pr.user?.login === "dependabot[bot]" && labels.includes("security")) return "Dependabot security update";
  if (PIN_BRANCH.test(ref)) return "the repository's pin PR";
  if (RELEASE_BRANCH.test(ref) || /^Version Packages\b/.test(pr.title ?? "")) return "release PR";
  return null;
}

/** The verdict for a PR: it fails when the OTHER open PRs already fill the cap (it would be the next one over). */
export function verdict(openPrs, current, cap = CAP) {
  const others = openPrs.filter((p) => p.number !== current.number);
  const exempt = exemptReason(current);
  const full = others.length >= cap;
  let message = `${others.length} other open PR(s), under the cap of ${cap}.`;
  if (full && exempt) message = `${others.length} other open PRs (cap ${cap}), but this one is exempt: ${exempt}.`;
  else if (full) message = `${others.length} other PRs are open in this repository (cap ${cap}). Land or close one before opening a new PR; the lane merges first.`;
  return { ok: !full || Boolean(exempt), others: others.length, exempt, message };
}

const daysOpen = (pr, now) => Math.floor((now - Date.parse(pr.created_at)) / DAY_MS);

/** The repositories over the cap, most loaded first, each with its oldest PRs. */
export function overCap(byRepo, cap = CAP) {
  return Object.entries(byRepo)
    .filter(([, prs]) => prs.length > cap)
    .map(([repo, prs]) => ({ repo, count: prs.length, oldest: [...prs].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).slice(0, 3) }))
    .sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo));
}

/** The body of the tracking issue: a table of the repositories over the cap with their oldest PRs, and every count. */
export function trackingBody(byRepo, now = Date.now(), cap = CAP) {
  const over = overCap(byRepo, cap);
  const counts = Object.entries(byRepo).sort((a, b) => b[1].length - a[1].length).map(([r, p]) => `${r} ${p.length}`).join(" · ");
  const oldest = (o) => o.oldest.map((p) => `#${p.number} (${daysOpen(p, now)} d${p.draft ? ", draft" : ""})`).join(", ");
  const lines = over.length
    ? [
        `Repositories over the cap of ${cap} open PRs (founder, 2026-10-30): the lane merges first, nobody opens a new PR there.`,
        "",
        "| Repository | Open | Oldest PRs (days open) |",
        "| :--- | ---: | :--- |",
        ...over.map((o) => `| ${o.repo} | ${o.count} | ${oldest(o)} |`),
      ]
    : [`Every repository is at or under the cap of ${cap} open PRs.`];
  return [...lines, "", `Counts: ${counts || "none"}`, "", `Updated by .github/workflows/pr-cap.yml (${new Date(now).toISOString().slice(0, 16)}Z).`].join("\n");
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
  const v = verdict(open, current);
  console.log(v.ok ? `ok: ${v.message}` : `::error title=Open-PR cap::${v.message}`);
  if (!v.ok) process.exit(1);
}

async function report(argv) {
  const org = argv.includes("--org") ? flag(argv, "--org") : "krizaka";
  const repos = (await api(`orgs/${org}/repos?per_page=100&type=all`)).filter((r) => !r.archived);
  const byRepo = {};
  for (const r of repos) byRepo[r.name] = await openPulls(`${org}/${r.name}`);
  const body = trackingBody(byRepo);
  console.log(body);
  const issues = argv.includes("--issue") ? [] : await api(`repos/${org}/.github/issues?state=all&per_page=100&labels=ci`);
  const number = argv.includes("--issue") ? Number(flag(argv, "--issue")) : issues.find((i) => i.title === TRACKING_TITLE && !i.pull_request)?.number;
  const over = overCap(byRepo).length > 0;
  if (number) await api(`repos/${org}/.github/issues/${number}`, { method: "PATCH", body: { body, state: over ? "open" : "closed" } });
  else if (over) await api(`repos/${org}/.github/issues`, { method: "POST", body: { title: TRACKING_TITLE, body, labels: ["ci"] } });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const run = { check, report }[cmd];
  if (!run) {
    console.error("usage: pr-cap.mjs check --repo <org/repo> --pr <n> | report [--org krizaka] [--issue <n>]");
    process.exit(2);
  }
  run(rest).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
