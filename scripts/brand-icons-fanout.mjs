#!/usr/bin/env node
// A brand change never reaches a repository as a red test (krizaka/.github#388, krizaka-ui#393 broke eleven repositories at
// once). When krizaka-ui's `export-brand` publishes the brand files, it sends the event `brand-changed` here; this script then
// runs each repository's own `sync-brand-icons.mjs` and opens ONE pull request per repository whose committed icons drifted,
// with auto-merge on. Repositories without a sync script have no brand-icons guard and are skipped.
//
//   node scripts/brand-icons-fanout.mjs [--repos a,b,c] [--dry-run] [--work <folder>]
//
// Default repositories: the active ones of the conformance registry (scripts/conformance.mjs --repo-list), never a list kept
// by hand. Reads and writes GitHub with GH_TOKEN (the app token: the pull requests are the agents'). Run by
// .github/workflows/brand-icons-sync.yml. The sync scripts only download public CDN files: no secret is read.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Where a repository keeps its sync script (the first that exists wins). */
export const SYNC_SCRIPTS = [
  "scripts/sync-brand-icons.mjs",
  "site/scripts/sync-brand-icons.mjs",
  "apps/site/scripts/sync-brand-icons.mjs",
  "scripts/gen-favicon.mjs",
];

/** The script to run in a checkout, given the files it has; null when it has none. */
export function syncScriptOf(has) {
  return SYNC_SCRIPTS.find((p) => has(p)) ?? null;
}

/** One branch per day, so a second dispatch updates the same pull request. */
export const branchFor = (date) => `chore/brand-icons-${date.toISOString().slice(0, 10)}`;

/** The pull request of one repository; the strategy is the repository's (a merge queue refuses one), `squashArgs` is the fallback. */
export function pullRequestOf(repo, branch) {
  const mergeArgs = ["pr", "merge", "--auto", "-R", `krizaka/${repo}`, branch];
  return {
    title: "chore(brand): icons follow the CDN brand manifest",
    body: "Re-synced by krizaka/.github `scripts/brand-icons-fanout.mjs` after a brand export of krizaka-ui (event `brand-changed`), so the `brand-icons` guard never goes red on an unrelated change.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
    mergeArgs,
    squashArgs: [...mergeArgs, "--squash"],
  };
}

const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const firstLine = (e) => String(e.stderr || e.message).split("\n")[0];

function syncOne(repo, work, dry) {
  const dir = join(work, repo);
  sh("gh", ["repo", "clone", `krizaka/${repo}`, dir, "--", "--depth=1", "--quiet"]);
  const script = syncScriptOf((p) => existsSync(join(dir, p)));
  if (!script) return `${repo}: no brand-icons guard`;
  sh("node", [script], dir);
  const changed = sh("git", ["status", "--porcelain"], dir).split("\n").filter(Boolean);
  if (!changed.length) return `${repo}: in sync`;
  if (dry) return `${repo}: DRIFT (${changed.length} files)`;
  const branch = branchFor(new Date());
  const git = (...a) => sh("git", ["-C", dir, ...a]);
  const pr = pullRequestOf(repo, branch);
  git("switch", "-C", branch);
  git("add", "-A");
  git("-c", "user.name=krizaka-agents[bot]", "-c", "user.email=krizaka-agents[bot]@users.noreply.github.com", "commit", "-q", "-m", pr.title);
  git("push", "-q", "-f", "origin", branch);
  const url = sh("gh", ["pr", "create", "-R", `krizaka/${repo}`, "--head", branch, "--title", pr.title, "--body", pr.body]);
  try {
    sh("gh", pr.mergeArgs);
  } catch {
    sh("gh", pr.squashArgs);
  }
  return `${repo}: ${url}`;
}

function main(argv) {
  const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const dry = argv.includes("--dry-run");
  const list = opt("--repos") ?? sh("node", ["scripts/conformance.mjs", "--repo-list"]);
  const repos = list.split(",").filter((r) => r && r !== ".github");
  const work = opt("--work") ?? mkdtempSync(join(tmpdir(), "brand-"));
  for (const repo of repos) {
    try {
      console.log(syncOne(repo, work, dry));
    } catch (error) {
      console.error(`${repo}: ERROR ${firstLine(error)}`);
      process.exitCode = 1;
    } finally {
      rmSync(join(work, repo), { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
