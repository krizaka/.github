// WHY  Reading a repository from GitHub (its tree, files, tarball, rulesets, npm) is the only part of the matrix that needs the network and a token.
// WHAT `liveSnapshot(repo)`: one pinned commit, the files read at it with their hashes, and the live settings; `tarballMatches`.
// HOW  Imported by scripts/conformance.mjs (which re-exports it); needs GH_TOKEN or GITHUB_TOKEN. Tests: tests/conformance.test.mjs (the tarball reader).
// OWNER krizaka/.github (lane platform), ADR-026 phase D. Entry point: scripts/conformance.mjs.

import { gunzipSync } from "node:zlib";
import { byCodePoint, isPackageManifest, sha256 } from "./conformance-basics.mjs";
import { latestOf } from "./conformance-versions.mjs";
import { snapshotOf } from "./conformance-registry.mjs";

async function api(path, accept = "application/vnd.github+json", record = null) {
  const auth = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept, ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404 || res.status === 409) {
    record?.({ url: `https://api.github.com${path}`, http: res.status, sha256: null });
    return null;
  }
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const text = await res.text();
  record?.({ url: `https://api.github.com${path}`, http: res.status, sha256: sha256(text) });
  return accept.includes("raw") ? text : JSON.parse(text);
}

/** Paths of the text files of a gzipped tarball whose content matches `re` (GitHub's tarball: one top folder, ustar headers). */
export function tarballMatches(gz, re) {
  const tar = gunzipSync(gz);
  const hits = [];
  let off = 0;
  while (off + 512 <= tar.length) {
    const head = tar.subarray(off, off + 512);
    if (head[0] === 0) break;
    const name = head.subarray(0, 100).toString("utf8").split("\0", 1)[0];
    const prefix = head.subarray(345, 500).toString("utf8").split("\0", 1)[0];
    const size = parseInt(head.subarray(124, 136).toString("utf8").split("\0", 1)[0].trim() || "0", 8);
    const type = String.fromCharCode(head[156] || 48);
    const body = tar.subarray(off + 512, off + 512 + size);
    if (type === "0" && size < 2_000_000 && !body.includes(0)) {
      const full = (prefix ? `${prefix}/${name}` : name).split("/").slice(1).join("/");
      if (full && re.test(body.toString("utf8"))) hits.push(full);
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return hits;
}

/** The live snapshot of one repository (default branch). */
export async function liveSnapshot({ name, kind }, org = "krizaka") {
  let commit = null;
  let paths;
  try {
    // One commit for the whole run: the tree, the files and the tarball are all read at this SHA.
    commit = (await api(`/repos/${org}/${name}/commits/HEAD`))?.sha ?? null;
    if (!commit) throw new Error("no default branch commit");
    const tree = await api(`/repos/${org}/${name}/git/trees/${commit}?recursive=1`);
    paths = (tree?.tree ?? []).filter((e) => e.type === "blob").map((e) => e.path).sort(byCodePoint);
  } catch (error) {
    return { ...snapshotOf(name, kind, [], async () => null, { commit }), error: `could not read the repository: ${error.message}` };
  }
  let snap;
  const record = (e) => snap?.evidence.push(e);
  const raw = (path) => api(`/repos/${org}/${name}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${commit}`, "application/vnd.github.raw+json");
  const scan = async (re) => {
    record({ url: `https://api.github.com/repos/${org}/${name}/tarball/${commit}` });
    const res = await fetch(`https://api.github.com/repos/${org}/${name}/tarball/${commit}`, {
      headers: { accept: "application/vnd.github+json", ...(process.env.GH_TOKEN || process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`${name} tarball: ${res.status}`);
    return tarballMatches(Buffer.from(await res.arrayBuffer()), re);
  };
  const published = async (re) => {
    const manifests = paths.filter(isPackageManifest);
    const hits = [];
    for (const m of manifests) {
      let pkg;
      try {
        pkg = JSON.parse((await raw(m)) ?? "{}");
      } catch {
        continue;
      }
      if (!pkg.name || pkg.private) continue;
      const meta = await fetch(`https://registry.npmjs.org/${pkg.name.replaceAll("/", "%2F")}/latest`, { signal: AbortSignal.timeout(30000) });
      if (!meta.ok) continue;
      const { version, dist } = await meta.json();
      record({ url: dist.tarball, integrity: dist.integrity ?? null });
      const tgz = await fetch(dist.tarball, { signal: AbortSignal.timeout(120000) });
      if (!tgz.ok) throw new Error(`${pkg.name} tarball: ${tgz.status}`);
      hits.push(...tarballMatches(Buffer.from(await tgz.arrayBuffer()), re).map((f) => `${pkg.name}@${version}:${f}`));
    }
    return hits;
  };
  // Required status checks on main: the rulesets that apply to the branch, then classic branch protection.
  const requiredChecks = async () => {
    const contexts = new Set();
    const rules = (await api(`/repos/${org}/${name}/rules/branches/main`, undefined, record)) ?? [];
    for (const r of rules) if (r.type === "required_status_checks") for (const c of r.parameters?.required_status_checks ?? []) contexts.add(c.context);
    const classic = await api(`/repos/${org}/${name}/branches/main/protection/required_status_checks`, undefined, record);
    for (const c of classic?.contexts ?? []) contexts.add(c);
    for (const c of classic?.checks ?? []) contexts.add(c.context);
    return [...contexts];
  };
  const mergeGuard = async () => {
    const rules = (await api(`/repos/${org}/${name}/rules/branches/main`, undefined, record)) ?? [];
    const classic = await api(`/repos/${org}/${name}/branches/main/protection/required_status_checks`, undefined, record);
    return { mergeQueue: rules.some((r) => r.type === "merge_queue"), strict: classic?.strict === true || rules.some((r) => r.type === "required_status_checks" && r.parameters?.strict_required_status_checks_policy === true) };
  };
  // A reusable workflow of the org, read at the ref a caller pins (the check `caller-permissions`).
  const reusable = (repo, file, ref) => api(`/repos/${org}/${repo}/contents/.github/workflows/${encodeURIComponent(file)}?ref=${encodeURIComponent(ref)}`, "application/vnd.github.raw+json", record);
  snap = snapshotOf(name, kind, paths, raw, { commit, scan, published, requiredChecks, mergeGuard, reusable, latest: (pin) => latestOf(pin, api) });
  return snap;
}

