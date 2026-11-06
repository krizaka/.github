// Where a repository's files come from. One shape for all sources: { name, commit, committedAt, files: Map(path -> text) }, the
// tracked files at one commit. GitHub: the commit of the default branch, then ONE tarball (two requests per repository, never a
// request per file). Directory: `git ls-files` of a local reference copy (tests and `--repo`).
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { MAX_FILE_BYTES, readTar } from "./tar.mjs";

const API = "https://api.github.com";
// `git` is run from one of these absolute paths, never found through the caller's PATH (Sonar S4036).
const GIT_PATHS = ["/usr/bin/git", "/opt/homebrew/bin/git", "/usr/local/bin/git"];

function requestHeaders() {
  const credential = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  return { accept: "application/vnd.github+json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) };
}

async function getJson(path) {
  const res = await fetch(`${API}${path}`, { headers: requestHeaders(), signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/** The default branch's commit and ONE tarball of a repository of the org. */
export async function githubSource(name, org = "krizaka") {
  const head = await getJson(`/repos/${org}/${name}/commits/HEAD`);
  const res = await fetch(`${API}/repos/${org}/${name}/tarball/${head.sha}`, { headers: requestHeaders(), signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`${name} tarball: ${res.status}`);
  return { name, commit: head.sha, committedAt: head.commit.committer.date, files: readTar(Buffer.from(await res.arrayBuffer())) };
}

/** The last run of each workflow, from the 100 most recent runs of the repository: Map(workflow path -> { at, conclusion }). */
export async function lastRunsOf(name, org = "krizaka") {
  const runs = new Map();
  try {
    const page = await getJson(`/repos/${org}/${name}/actions/runs?per_page=100`);
    for (const run of page.workflow_runs ?? []) {
      if (!runs.has(run.path)) runs.set(run.path, { at: run.created_at, conclusion: run.conclusion ?? run.status });
    }
  } catch {
    // the app cannot read Actions here (or the repository has none): the last run stays unknown, never invented
  }
  return runs;
}

function lstatSafe(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

function git(dir, ...args) {
  const bin = GIT_PATHS.find((p) => lstatSafe(p));
  return execFileSync(bin, ["-C", dir, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** The tracked files of a local reference copy at its HEAD (symbolic links and binary files left out). */
export function directorySource(dir, name = basename(dir)) {
  const files = new Map();
  for (const path of git(dir, "ls-files", "-z").split("\0").filter(Boolean)) {
    const stat = lstatSafe(join(dir, path));
    if (!stat?.isFile() || stat.size > MAX_FILE_BYTES) continue;
    const buffer = readFileSync(join(dir, path));
    if (!buffer.includes(0)) files.set(path, buffer.toString("utf8"));
  }
  const [commit, committedAt] = git(dir, "log", "-1", "--format=%H%n%cI").trim().split("\n");
  return { name, commit, committedAt, files };
}

/** A source from a ready object of files (fixtures). */
export const mapSource = (name, files, commit = "0".repeat(40)) => ({ name, commit, committedAt: "2026-01-01T00:00:00Z", files: new Map(Object.entries(files)) });
