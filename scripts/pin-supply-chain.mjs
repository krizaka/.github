#!/usr/bin/env node
// Pins what OpenSSF Scorecard's Pinned-Dependencies check wants pinned, in one repository:
//   - every `uses: owner/repo[/path]@ref` of a workflow becomes `@<full commit sha> # <tag or branch>`;
//   - every Dockerfile `FROM image:tag` becomes `FROM image:tag@sha256:<digest>`.
// Dependabot (github-actions, docker) keeps the pins current, keeping the tag as the comment.
//
//   node scripts/pin-supply-chain.mjs [repo-dir]          # rewrite in place (default: .)
//   node scripts/pin-supply-chain.mjs [repo-dir] --check  # exit 1 when something is not pinned
//   node scripts/pin-supply-chain.mjs [repo-dir] --no-docker
//   node scripts/pin-supply-chain.mjs [repo-dir] --refresh  # also move `# <branch>` pins to the branch's current head
//
// Actions are resolved with `git ls-remote` (public repositories, no token); images with
// `docker buildx imagetools inspect`. Nothing is guessed: an unresolved reference fails the run.
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SHA = /^[0-9a-f]{40}$/;
const USES = /^(\s*(?:-\s+)?uses:\s*)([^\s#]+)(\s*#.*)?$/;

/** Highest semver-looking tag among `tags`, else the first. */
export function bestTag(tags) {
  const semver = tags.filter((t) => /^v?\d+(\.\d+)*$/.test(t));
  const pool = semver.length ? semver : tags;
  return [...pool].sort((a, b) => b.split(".").length - a.split(".").length || b.localeCompare(a, "en", { numeric: true }))[0];
}

/** Parse `git ls-remote` output into { sha, tagsBySha }. */
export function parseRefs(out) {
  const heads = new Map();
  const tags = new Map();
  for (const line of out.split("\n")) {
    const [sha, ref] = line.split("\t");
    if (!ref) continue;
    if (ref.startsWith("refs/heads/")) heads.set(ref.slice(11), sha);
    else if (ref.startsWith("refs/tags/")) {
      const peeled = ref.endsWith("^{}");
      const name = ref.slice(10).replace(/\^\{\}$/, "");
      if (peeled || !tags.has(name)) tags.set(name, sha);
    }
  }
  return { heads, tags };
}

/** Resolve `ref` of one repository to { sha, label } from parsed refs. */
export function resolveRef(refs, ref) {
  const sha = refs.tags.get(ref) ?? refs.heads.get(ref);
  if (!sha) throw new Error(`ref not found: ${ref}`);
  const same = [...refs.tags].filter(([, s]) => s === sha).map(([t]) => t);
  const isTag = refs.tags.has(ref);
  return { sha, label: isTag && same.length ? bestTag(same) : ref };
}

/** Rewrite the unpinned `uses:` lines of a workflow. `resolve(owner/repo, ref)` returns { sha, label }. */
export function pinWorkflowText(text, resolve, { refresh = false } = {}) {
  const changes = [];
  const out = text.split("\n").map((line) => {
    const m = USES.exec(line);
    if (!m) return line;
    const [, head, target] = m;
    if (target.startsWith("./") || target.startsWith("docker://")) return line;
    const at = target.lastIndexOf("@");
    if (at < 0) return line;
    const path = target.slice(0, at);
    const ref = target.slice(at + 1);
    const repo = path.split("/").slice(0, 2).join("/");
    let pinned = ref;
    if (SHA.test(ref)) {
      // --refresh: a pin commented with a branch name (a first-party reusable workflow @main) moves to that branch's head;
      // Dependabot only follows tags, so these are the pins nothing else bumps.
      const branch = (m[3] ?? "").replace(/^\s*#\s*/, "").trim();
      if (!refresh || !branch || /^v?\d/.test(branch)) return line;
      pinned = branch;
    }
    const { sha, label } = resolve(repo, pinned);
    if (SHA.test(ref) && sha === ref) return line;
    changes.push(`${target} -> ${sha.slice(0, 10)} # ${label}`);
    return `${head}${path}@${sha} # ${label}`;
  });
  return { text: out.join("\n"), changes };
}

const FROM = /^(\s*FROM\s+(?:--platform=\S+\s+)?)(\S+)(\s+AS\s+\S+)?(\s*)$/i;

/** Pin the `FROM image:tag` lines of a Dockerfile. `digest(image)` returns `sha256:…`. */
export function pinDockerfileText(text, digest) {
  const changes = [];
  const stages = new Set();
  const out = text.split("\n").map((line) => {
    const m = FROM.exec(line);
    if (!m) return line;
    const [, head, image, as, tail] = m;
    if (as) stages.add(as.trim().split(/\s+/)[1].toLowerCase());
    if (image.includes("@") || image.includes("$") || image === "scratch" || stages.has(image.toLowerCase())) return line;
    const withTag = /:[^/]+$/.test(image) ? image : `${image}:latest`;
    const d = digest(withTag);
    changes.push(`${withTag} -> ${d.slice(0, 19)}`);
    return `${head}${withTag}@${d}${as ?? ""}${tail}`;
  });
  return { text: out.join("\n"), changes };
}

function walk(dir, pick, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, pick, acc);
    else if (pick(name, p)) acc.push(p);
  }
  return acc;
}

const cache = new Map();
function remoteRefs(repo) {
  if (!cache.has(repo)) {
    const out = execFileSync("git", ["ls-remote", `https://github.com/${repo}`], { encoding: "utf8" });
    cache.set(repo, parseRefs(out));
  }
  return cache.get(repo);
}

function imageDigest(image) {
  const out = execFileSync("docker", ["buildx", "imagetools", "inspect", image, "--format", "{{.Manifest.Digest}}"], { encoding: "utf8" });
  const d = out.trim();
  if (!/^sha256:[0-9a-f]{64}$/.test(d)) throw new Error(`no digest for ${image}`);
  return d;
}

function main(argv) {
  const check = argv.includes("--check");
  const docker = !argv.includes("--no-docker");
  const refresh = argv.includes("--refresh");
  const root = argv.find((a) => !a.startsWith("--")) ?? ".";
  let pending = 0;
  const files = [
    ...walk(root, (n, p) => /\.ya?ml$/.test(n) && /(^|[\\/])\.github[\\/](workflows|actions)[\\/]/.test(p)).map((p) => [p, "wf"]),
    ...(docker ? walk(root, (n) => /^Dockerfile(\..+)?$|\.Dockerfile$/.test(n)).map((p) => [p, "docker"]) : []),
  ];
  for (const [file, kind] of files) {
    const before = readFileSync(file, "utf8");
    const { text, changes } =
      kind === "wf"
        ? pinWorkflowText(before, (repo, ref) => resolveRef(remoteRefs(repo), ref), { refresh })
        : pinDockerfileText(before, imageDigest);
    if (!changes.length) continue;
    pending += changes.length;
    console.log(`${file}\n  ${changes.join("\n  ")}`);
    if (!check) writeFileSync(file, text);
  }
  if (check && pending) {
    console.error(`${pending} unpinned reference(s)`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2));
