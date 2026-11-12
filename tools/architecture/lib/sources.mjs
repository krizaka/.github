// Where the architecture's lists and files come from (ADR-027 § 4). Nothing here is typed: the repositories and their owners
// are repos.json (until policy.json carries `apps[].repos`, krizaka-internal#2781 step 2: this is the one reader to change), the
// systems are the family of @krizaka/org, the files and tags are each repository's at one commit.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { org } from "@krizaka/org";
import { scopeOf } from "../../../scripts/conformance.mjs";
import { directorySource, githubSource } from "../../automation-catalogue/lib/sources.mjs";

const ROOT = new URL("../../../", import.meta.url);
const API = "https://api.github.com";
const GIT_PATHS = ["/usr/bin/git", "/opt/homebrew/bin/git", "/usr/local/bin/git"];
/** The family group of @krizaka/org → the tag the generated system carries (specification.c4). */
export const GROUP_TAGS = { products: "asset", "open-source": "libraries", krizaka: "sites" };

/** The registry rows (repos.json) and the active ones (the matrix's scope). */
export function registry(root = ROOT) {
  const { repositories } = JSON.parse(readFileSync(new URL("repos.json", root), "utf8"));
  return { rows: repositories, active: scopeOf(repositories).active };
}

/** The systems of the family that have a home repository: { id, name, group, url, home }. */
export function familySystems(family = org.family) {
  return family
    .filter((f) => f.repo && GROUP_TAGS[f.group])
    .map((f) => ({ id: f.id, name: f.name, group: GROUP_TAGS[f.group], url: f.url, home: f.repo.slice(f.repo.lastIndexOf("/") + 1), status: f.status }));
}

export const orgVersion = () => org.version;

function git(dir, ...args) {
  const bin = GIT_PATHS.find((p) => existsSync(p));
  return execFileSync(bin, ["-C", dir, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

/** A reference copy at its HEAD: its tracked files and its tag names. */
export function localSource(dir, name) {
  const source = directorySource(dir, name);
  return { ...source, tags: git(dir, "tag", "--list").split("\n").filter(Boolean).sort() };
}

async function tagNames(name) {
  const credential = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = { accept: "application/vnd.github+json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) };
  const res = await fetch(`${API}/repos/krizaka/${name}/git/matching-refs/tags`, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${name} tags: ${res.status}`);
  return (await res.json()).map((r) => r.ref.replace(/^refs\/tags\//, "")).sort();
}

/** A repository of the org on GitHub at its default branch's commit: one tarball and one list of tags (three requests). */
export async function remoteSource(name) {
  return { ...(await githubSource(name)), tags: await tagNames(name) };
}

/** The checkout this tool runs from: krizaka/.github, whose org base (specification.c4, org.c4) is the one the run checks. */
export const OWN_CHECKOUT = fileURLToPath(ROOT);

/**
 * The sources of the active repositories, one at a time; a repository that cannot be read is listed, never invented.
 * krizaka/.github is always this checkout, so a pull request on the org base checks its own files.
 */
export async function sourcesOf(active, { local = null, use = {} } = {}) {
  const sources = [];
  const unread = [];
  for (const repo of active) {
    try {
      if (use[repo.name]) sources.push(localSource(use[repo.name], repo.name));
      else if (repo.name === ".github") sources.push(localSource(OWN_CHECKOUT, repo.name));
      else sources.push(local ? localSource(join(local, repo.name), repo.name) : await remoteSource(repo.name));
    } catch (error) {
      unread.push({ repo: repo.name, why: String(error?.message ?? error).replace(/\s+/g, " ").slice(0, 200) });
    }
  }
  return { sources, unread };
}
