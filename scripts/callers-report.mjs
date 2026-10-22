#!/usr/bin/env node
// Who calls the org's reusable workflows, and with which release? (krizaka/.github#152)
//
//   node scripts/callers-report.mjs [--org krizaka] [--fail-on-stale]
//
// The reusable workflows live HERE and are versioned by tag (v1.x.y; `v1` moves). A caller pins the commit SHA of a release
// (`uses: krizaka/.github/.github/workflows/node-ci.yml@<sha> # v1.4.0`, the Scorecard rule). Dependabot's `github-actions`
// group moves those pins, and this report is the one place that shows the stale ones: repo, file, workflow, pinned tag.
// Read-only: the public API (an environment credential only raises the rate limit).
import { pathToFileURL } from "node:url";

const USES = /krizaka\/\.github\/\.github\/workflows\/([\w.-]+\.yml)@([0-9a-f]{40})(?:\s*#\s*(\S+))?/g;

/** Every call of a krizaka/.github reusable workflow in a workflow file: [{ workflow, sha, tag }]. */
export function callsIn(text) {
  return [...text.matchAll(USES)].map((m) => ({ workflow: m[1], sha: m[2], tag: m[3] ?? null }));
}

/** Compare dotted versions (v1.4.0 > v1.3.9). */
export function compareTags(a, b) {
  const n = (t) => t.replace(/^v/, "").split(".").map(Number);
  const [x, y] = [n(a), n(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** A call pinned to a release (`# v1.x.y`) is stale when its SHA is not the one of the latest release. Branch pins (`# main`) follow Dependabot. */
export function isStale(call, latest) {
  return /^v\d+\.\d+\.\d+$/.test(call.tag ?? "") && call.sha !== latest.sha;
}

async function api(path) {
  const auth = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: "application/vnd.github+json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function main() {
  const argv = process.argv.slice(2);
  const org = argv.includes("--org") ? argv[argv.indexOf("--org") + 1] : "krizaka";
  const tags = (await api(`/repos/${org}/.github/tags?per_page=100`)).filter((t) => /^v\d+\.\d+\.\d+$/.test(t.name));
  tags.sort((a, b) => compareTags(b.name, a.name));
  const latest = { tag: tags[0].name, sha: tags[0].commit.sha };
  console.log(`latest release: ${latest.tag} (${latest.sha.slice(0, 7)})`);
  const repos = (await api(`/orgs/${org}/repos?per_page=100&type=public`)).filter((r) => !r.archived && r.name !== ".github");
  let stale = 0;
  for (const repo of repos) {
    let files;
    try {
      files = await api(`/repos/${org}/${repo.name}/contents/.github/workflows`);
    } catch {
      continue;
    }
    for (const f of files.filter((x) => /\.ya?ml$/.test(x.name))) {
      const text = await (await fetch(f.download_url)).text();
      for (const call of callsIn(text)) {
        const old = isStale(call, latest);
        if (old) stale++;
        console.log(`${old ? "STALE" : "ok   "} ${repo.name}/${f.name} ${call.workflow} ${call.tag ?? call.sha.slice(0, 7)}`);
      }
    }
  }
  console.log(`${stale} stale call(s)`);
  if (argv.includes("--fail-on-stale") && stale) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
