#!/usr/bin/env node
// A @krizaka release reaches its consumers in minutes (krizaka/.github#388): the publisher sends a repository_dispatch
// `krizaka-release` to the repositories that depend on what it published, and each of them runs bump-krizaka.yml.
//
//   node scripts/krizaka-release.mjs consumers '<packages json>'        the repositories to tell (release-consumers.json)
//   node scripts/krizaka-release.mjs dispatch  '<packages json>' [--dry-run]   send the event (needs GH_TOKEN)
//   node scripts/krizaka-release.mjs bump '<packages json>' [--dry-run] [--no-wait]   edit the package.json files of this checkout
//   node scripts/krizaka-release.mjs check <clones folder>               release-consumers.json against the real dependencies
//
// `<packages json>` is `{ "@krizaka/ui": "3.74.0" }` or the `publishedPackages` of changesets (`[{ name, version }]`).
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const SIMPLE_RANGE = /^([\^~]?)(\d+)\.(\d+)\.(\d+)$/;
export const CONSUMERS_FILE = new URL("../orchestration/release-consumers.json", import.meta.url);

/** `{ name: version }` from either shape a publisher gives. */
export function normalisePackages(input) {
  const entries = Array.isArray(input) ? input.map((p) => [p.name, p.version]) : Object.entries(input ?? {});
  return Object.fromEntries(entries.filter(([name, version]) => name.startsWith("@krizaka/") && /^\d+\.\d+\.\d+$/.test(version)));
}

/** The repositories that depend on at least one published package. `consumers` is `{ repo: [package names] }`. */
export function consumersOf(consumers, packages) {
  const names = new Set(Object.keys(packages));
  return Object.entries(consumers)
    .filter(([, deps]) => deps.some((name) => names.has(name)))
    .map(([repo]) => repo)
    .sort();
}

/** `[major, minor, patch]` of a plain version, or null. */
function parts(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** -1, 0 or 1. */
export function compareVersions(a, b) {
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

/**
 * What a bump is: `major` (a new major from 1.0 on), `minor` or `patch`. Below 1.0 the minor is the breaking digit in semver, but
 * the @krizaka/* packages publish their changes as minors on purpose and CI decides: a 0.x minor is `minor`.
 */
export function levelOf(from, to) {
  const [a, b] = [parts(from), parts(to)];
  if (b[0] !== a[0]) return "major";
  return b[1] !== a[1] ? "minor" : "patch";
}

/**
 * The bump of one range. Only plain `^x.y.z`, `~x.y.z` and `x.y.z` ranges are touched, in the style they already have.
 * @returns {{ range: string, level: string } | { skip: string }}
 */
export function bumpRange(range, version) {
  const match = SIMPLE_RANGE.exec(range);
  if (!match) return { skip: `range ${range} is not plain` };
  const current = `${match[2]}.${match[3]}.${match[4]}`;
  if (compareVersions(version, current) <= 0) return { skip: "already at or above" };
  return { range: `${match[1]}${version}`, level: levelOf(current, version) };
}

/** The names of the packages a set of manifests declares: their own dependencies are `workspace:`, never bumped here. */
export function workspaceNames(manifests) {
  return new Set(manifests.map((m) => m.name).filter(Boolean));
}

/** The bumps of one manifest: `[{ name, field, from, to, level }]`. */
export function planManifest(manifest, packages, own = new Set()) {
  const plan = [];
  for (const field of DEP_FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (!(name in packages) || own.has(name) || field === "peerDependencies") continue;
      const bump = bumpRange(range, packages[name]);
      if (!("skip" in bump)) plan.push({ name, field, from: range, to: bump.range, level: bump.level });
    }
  }
  return plan;
}

/** Where a manifest is edited in place, keeping its indentation and its final newline. */
export function applyPlan(text, plan) {
  const manifest = JSON.parse(text);
  for (const { name, field, to } of plan) manifest[field][name] = to;
  const indent = /^(\s+)"/m.exec(text)?.[1] ?? "  ";
  return `${JSON.stringify(manifest, null, indent)}${text.endsWith("\n") ? "\n" : ""}`;
}

/** The title and the major flag of the pull request. */
export function summarise(packages, plans) {
  const bumped = new Map();
  for (const { name, to, level } of plans.flat()) bumped.set(name, { version: to.replace(/^[\^~]/, ""), level });
  const list = [...bumped].sort(([a], [b]) => a.localeCompare(b));
  return {
    title: `deps: ${list.map(([name, { version }]) => `${name} ${version}`).join(", ")}`,
    major: list.some(([, { level }]) => level === "major"),
    changed: list.length > 0,
  };
}

/** Waits (with backoff) until the registry serves every version; returns the ones still missing. */
export async function waitForPublished(packages, { fetchVersion, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), attempts = 12 } = {}) {
  let missing = Object.entries(packages);
  for (let attempt = 0; attempt < attempts && missing.length > 0; attempt++) {
    if (attempt > 0) await sleep(Math.min(5000 * 2 ** (attempt - 1), 60_000));
    const served = await Promise.all(missing.map(async ([name, version]) => (await fetchVersion(name, version)) === true));
    missing = missing.filter((_, i) => !served[i]);
  }
  return missing.map(([name, version]) => `${name}@${version}`);
}

/** Does npm serve this exact version? */
async function npmServes(name, version) {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2F")}/${version}`);
  return response.ok;
}

/** The package.json files of a checkout (git-tracked, not node_modules). */
function manifestPaths(root) {
  const files = execFileSync("git", ["ls-files", "--", "package.json", "**/package.json"], { cwd: root, encoding: "utf8" });
  return files.split("\n").filter(Boolean);
}

/** The `@krizaka/*` names a checkout depends on (own workspace packages excluded). */
export function readDependencies(root) {
  const manifests = manifestPaths(root).map((p) => JSON.parse(readFileSync(join(root, p), "utf8")));
  const own = workspaceNames(manifests);
  const names = new Set();
  for (const m of manifests) for (const f of DEP_FIELDS) for (const n of Object.keys(m[f] ?? {})) if (n.startsWith("@krizaka/") && !own.has(n)) names.add(n);
  return [...names].sort();
}

/** Drift between release-consumers.json and the clones of a folder: `[ "repo: +added -removed" ]`. */
export function driftOf(consumers, clones) {
  const drift = [];
  for (const [repo, listed] of Object.entries(consumers)) {
    const dir = join(clones, repo);
    if (!existsSync(dir)) continue;
    const real = readDependencies(dir);
    const added = real.filter((n) => !listed.includes(n));
    const removed = listed.filter((n) => !real.includes(n));
    if (added.length || removed.length) drift.push(`${repo}: ${added.map((n) => `+${n}`).concat(removed.map((n) => `-${n}`)).join(" ")}`);
  }
  return drift;
}

/** Edits this checkout's manifests; returns the plans. */
function bumpCheckout(root, packages, dryRun) {
  const paths = manifestPaths(root);
  const texts = paths.map((p) => readFileSync(join(root, p), "utf8"));
  const own = workspaceNames(texts.map((t) => JSON.parse(t)));
  const plans = texts.map((t) => planManifest(JSON.parse(t), packages, own));
  if (!dryRun) plans.forEach((plan, i) => plan.length > 0 && writeFileSync(join(root, paths[i]), applyPlan(texts[i], plan)));
  return plans;
}

async function main([command, argument, ...flags]) {
  const consumers = JSON.parse(readFileSync(CONSUMERS_FILE, "utf8")).repos;
  const dryRun = flags.includes("--dry-run");
  if (command === "check") {
    const drift = driftOf(consumers, argument);
    drift.forEach((line) => console.error(line));
    return drift.length > 0 ? 1 : 0;
  }
  const packages = normalisePackages(JSON.parse(argument ?? "{}"));
  if (command === "consumers") return console.log(JSON.stringify(consumersOf(consumers, packages))), 0;
  if (command === "dispatch") {
    for (const repo of consumersOf(consumers, packages)) {
      console.log(`${dryRun ? "would tell" : "telling"} ${repo}`);
      if (!dryRun) {
        const body = JSON.stringify({ event_type: "krizaka-release", client_payload: { packages } });
        execFileSync("gh", ["api", "-X", "POST", `repos/krizaka/${repo}/dispatches`, "--input", "-"], { input: body, stdio: ["pipe", "inherit", "inherit"] });
      }
    }
    return 0;
  }
  if (command === "bump") {
    const missing = flags.includes("--no-wait") ? [] : await waitForPublished(packages, { fetchVersion: npmServes });
    if (missing.length > 0) return console.error(`npm does not serve ${missing.join(", ")} yet`), 1;
    const summary = summarise(packages, bumpCheckout(process.cwd(), packages, dryRun));
    console.log(JSON.stringify(summary));
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${summary.changed}\nmajor=${summary.major}\ntitle=${summary.title}\n`);
    return 0;
  }
  console.error("Usage: krizaka-release.mjs <consumers|dispatch|bump|check> …");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
