#!/usr/bin/env node
// A fix in krizaka/.github reaches every consumer without hand edits: the consumers pin the reusable workflows and
// composite actions by commit (`krizaka/.github/<path>@<sha> # main`), and Dependabot cannot move a pin that follows a
// branch. After a change under .github/workflows or actions/ lands on main, this script opens ONE pull request per
// repository that moves those pins to the new commit. Run by .github/workflows/propagate-pins.yml (token: the app's).
//
//   node scripts/propagate-pins.mjs <sha> [--repos a,b,c] [--dry-run] [--work <folder>]
//
// Default repositories: the active ones of the conformance registry (scripts/conformance.mjs --repo-list).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PIN = /(krizaka\/\.github\/[A-Za-z0-9_./-]+@)([0-9a-f]{40})/g;
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();

/** The files of a clone that can hold a pin: workflows and local composite actions. */
export function pinFiles(root) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(e.name)) out.push(p);
    }
  };
  walk(join(root, ".github"));
  walk(join(root, "actions"));
  return out;
}

/** Moves every pin of krizaka/.github to `sha`; returns the files changed. */
export function movePins(root, sha) {
  const changed = [];
  for (const file of pinFiles(root)) {
    const before = readFileSync(file, "utf8");
    const after = before.replace(PIN, (_, head) => `${head}${sha}`);
    if (after !== before) {
      writeFileSync(file, after);
      changed.push(file);
    }
  }
  return changed;
}

function main(argv) {
  const sha = argv[0];
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new Error("usage: propagate-pins.mjs <40-hex sha> [--repos a,b] [--dry-run]");
  const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const dry = argv.includes("--dry-run");
  const repos = (opt("--repos") ?? sh("node", ["scripts/conformance.mjs", "--repo-list"])).split(",").filter((r) => r && r !== ".github");
  const work = opt("--work") ?? mkdtempSync(join(tmpdir(), "pins-"));
  const branch = `deps/org-workflow-pins-${sha.slice(0, 8)}`;
  for (const repo of repos) {
    const dir = join(work, repo);
    try {
      sh("gh", ["repo", "clone", `krizaka/${repo}`, dir, "--", "--depth=1", "--quiet"]);
      const changed = movePins(dir, sha);
      if (!changed.length) {
        console.log(`${repo}: already on ${sha.slice(0, 8)}`);
        continue;
      }
      if (dry) {
        console.log(`${repo}: would move ${changed.length} file(s)`);
        continue;
      }
      const git = (...a) => sh("git", ["-C", dir, ...a]);
      git("switch", "-C", branch);
      git("add", "-A");
      git("-c", "user.name=krizaka-agents[bot]", "-c", "user.email=krizaka-agents[bot]@users.noreply.github.com", "commit", "-q", "-m", `ci(deps): the org workflow pins move to krizaka/.github@${sha.slice(0, 8)}`);
      git("push", "-q", "-f", "origin", branch);
      const url = sh("gh", ["pr", "create", "-R", `krizaka/${repo}`, "--head", branch, "--title", `ci(deps): the org workflow pins move to krizaka/.github@${sha.slice(0, 8)}`, "--body", `A fix in krizaka/.github reaches this repository (propagate-pins, krizaka/.github rule « a rule reaches every repo »). Only the \`@<sha> # main\` pins change; CI decides.`]);
      console.log(`${repo}: ${url}`);
    } catch (error) {
      console.error(`${repo}: ${error instanceof Error ? error.message.split("\n")[0] : error}`);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main(process.argv.slice(2));
