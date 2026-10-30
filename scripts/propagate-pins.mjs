#!/usr/bin/env node
// A fix in krizaka/.github reaches every consumer without hand edits: the consumers pin the reusable workflows and
// composite actions by commit (`krizaka/.github/<path>@<sha> # main`), and Dependabot cannot move a pin that follows a
// branch. After a change under .github/workflows or actions/ lands on main, this script opens ONE pull request per
// repository that moves those pins to the new commit. Run by .github/workflows/propagate-pins.yml (token: the app's).
//
//   node scripts/propagate-pins.mjs <sha> [--repos a,b,c] [--dry-run] [--work <folder>]
//
// Default repositories: the active ones of the conformance registry (scripts/conformance.mjs --repo-list).
//
// `--source <repo>` moves the pins of another repository's reusable workflows instead (default `.github`). The one
// that exists today is `orazaka`: every orazaka-* repository calls krizaka/orazaka/.github/workflows/component.yml@<sha>,
// and a change to it reaches them with `node scripts/propagate-pins.mjs <orazaka main sha> --source orazaka`
// (default repositories: the active orazaka-* ones of the org). The pull request is opened by the app, one per repository.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The pins of one source repository's workflows and actions: `krizaka/<source>/<path>@<sha>`. */
export function pinPattern(source = ".github") {
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(krizaka/${escaped}/[A-Za-z0-9_./-]+@)([0-9a-f]{40})`, "g");
}
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();

/** `git push` of a clone: the app's token reaches git through `gh` (the clone keeps a plain https remote, and a runner has no credential helper). */
export function pushArgs(dir, branch) {
  return ["-C", dir, "-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "push", "-q", "-f", "origin", branch];
}

/** The reason a command failed: its first line and the first line of what it printed on stderr (execFileSync hides it from `message`). */
export function failure(error) {
  const first = (text) => String(text ?? "").trim().split("\n")[0];
  const stderr = first(error?.stderr);
  return [first(error instanceof Error ? error.message : error), stderr].filter(Boolean).join(" — ");
}

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
export function movePins(root, sha, source = ".github") {
  const pin = pinPattern(source);
  const changed = [];
  for (const file of pinFiles(root)) {
    const before = readFileSync(file, "utf8");
    const after = before.replace(pin, (_, head) => `${head}${sha}`);
    if (after !== before) {
      writeFileSync(file, after);
      changed.push(file);
    }
  }
  return changed;
}

/** Where the pins live: the conformance registry for the org's own workflows, the `<source>-*` repositories otherwise. */
export function defaultRepos(source) {
  if (source === ".github") return sh("node", ["scripts/conformance.mjs", "--repo-list"]);
  const rows = sh("gh", ["repo", "list", "krizaka", "-L", "200", "--json", "name,isArchived", "-q", ".[]|select(.isArchived|not)|.name"]);
  return rows.split("\n").filter((n) => n.startsWith(`${source}-`)).join(",");
}

/** One stable branch per source: the pin PR of a repository is updated in place, not duplicated at every merge. */
export function pinBranch(label) {
  return `deps/${label.replace(/ /g, "-")}`;
}

/**
 * Opens the pin PR of `repo`, or updates the open one of the same head in place (REST only), then closes the PRs of the
 * older `deps/<label>-<sha8>` branches with « Superseded by #n ». `run(cmd, args)` runs a command (injected by the tests).
 * Returns the PR url.
 */
export function publishPinPr({ repo, branch, title, body, run = sh }) {
  const api = (...a) => run("gh", ["api", ...a]);
  const open = JSON.parse(api(`repos/krizaka/${repo}/pulls?state=open&per_page=100`, "--jq", "[.[]|{number,url:.html_url,head:.head.ref}]") || "[]");
  const same = open.find((pr) => pr.head === branch);
  let url;
  let number;
  if (same) {
    api("-X", "PATCH", `repos/krizaka/${repo}/pulls/${same.number}`, "-f", `title=${title}`, "-f", `body=${body}`);
    ({ url, number } = same);
  } else {
    url = run("gh", ["pr", "create", "-R", `krizaka/${repo}`, "--head", branch, "--title", title, "--body", body]);
    number = Number(url.split("/").pop());
  }
  for (const old of open.filter((pr) => pr.head.startsWith(`${branch}-`))) {
    api("-X", "POST", `repos/krizaka/${repo}/issues/${old.number}/comments`, "-f", `body=Superseded by #${number}`);
    api("-X", "PATCH", `repos/krizaka/${repo}/pulls/${old.number}`, "-f", "state=closed");
  }
  return url;
}

function main(argv) {
  const sha = argv[0];
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new Error("usage: propagate-pins.mjs <40-hex sha> [--repos a,b] [--dry-run]");
  const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const dry = argv.includes("--dry-run");
  const source = opt("--source") ?? ".github";
  const repos = (opt("--repos") ?? defaultRepos(source)).split(",").filter((r) => r && r !== source);
  const work = opt("--work") ?? mkdtempSync(join(tmpdir(), "pins-"));
  const label = source === ".github" ? "org workflow pins" : `${source} workflow pins`;
  const branch = pinBranch(label);
  for (const repo of repos) {
    const dir = join(work, repo);
    try {
      sh("gh", ["repo", "clone", `krizaka/${repo}`, dir, "--", "--depth=1", "--quiet"]);
      const changed = movePins(dir, sha, source);
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
      git("-c", "user.name=krizaka-agents[bot]", "-c", "user.email=krizaka-agents[bot]@users.noreply.github.com", "commit", "-q", "-m", `ci(deps): the ${label} move to krizaka/${source}@${sha.slice(0, 8)}`);
      sh("git", pushArgs(dir, branch));
      const title = `ci(deps): the ${label} move to krizaka/${source}@${sha.slice(0, 8)}`;
      const body = `A change in krizaka/${source} reaches this repository (propagate-pins, rule « a rule reaches every repo »). Only the \`@<sha>\` pins of krizaka/${source} change; CI decides. One pull request per repository, updated in place at every change.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
      const url = publishPinPr({ repo, branch, title, body });
      console.log(`${repo}: ${url}`);
    } catch (error) {
      console.error(`${repo}: ${failure(error)}`);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main(process.argv.slice(2));
