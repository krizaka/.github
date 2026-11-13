#!/usr/bin/env node
// A @krizaka release reaches its consumers in minutes (krizaka/.github#388): the publisher sends a repository_dispatch
// `krizaka-release` to the repositories that depend on what it published, and each of them runs bump-krizaka.yml.
//
//   node scripts/krizaka-release.mjs consumers '<packages json>'        the repositories to tell (release-consumers.json)
//   node scripts/krizaka-release.mjs dispatch  '<packages json>' [--dry-run]   send the event (needs GH_TOKEN)
//   node scripts/krizaka-release.mjs bump '<packages json>' [--scope=wave|breaking] [--dry-run] [--no-wait]   edit the package.json files of this checkout
//   node scripts/krizaka-release.mjs lock                                regenerate every lockfile of the manifests `bump` changed
//   node scripts/krizaka-release.mjs check <clones folder>               release-consumers.json against the real dependencies
//
// `<packages json>` is `{ "@krizaka/ui": "3.74.0" }` or the `publishedPackages` of changesets (`[{ name, version }]`).
// `--scope=wave` moves patches and minors; `--scope=breaking` moves a major or a 0.x minor, for its own pull request (krizaka-internal#3396).
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { detectPackageManager } from "./detect-package-manager.mjs";

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const SIMPLE_RANGE = /^([\^~]?)(\d+)\.(\d+)\.(\d+)$/;
/** The manifests `bump` changed, handed to `lock` (the runner's temp folder, never the checkout). */
const CHANGED_FILE = join(process.env.RUNNER_TEMP ?? tmpdir(), "krizaka-bump-changed.json");
export const CONSUMERS_FILE = new URL("../orchestration/release-consumers.json", import.meta.url);

/** `{ name: version }` from either shape a publisher gives. */
export function normalisePackages(input) {
  const entries = Array.isArray(input) ? input.map((p) => [p.name, p.version]) : Object.entries(input ?? {});
  return Object.fromEntries(entries.filter(([name, version]) => name.startsWith("@krizaka/") && /^\d+\.\d+\.\d+$/.test(version)));
}

/** Code-unit order (Sonar S2871). */
const byName = (a, b) => Number(a > b) - Number(a < b);
const GIT = "/usr/bin/git"; // absolute (Sonar S4036); the runners' gh is at /usr/bin too
const GH = "/usr/bin/gh";

/** The repositories that depend on at least one published package. `consumers` is `{ repo: [package names] }`. */
export function consumersOf(consumers, packages) {
  const names = new Set(Object.keys(packages));
  return Object.entries(consumers)
    .filter(([, deps]) => deps.some((name) => names.has(name)))
    .map(([repo]) => repo)
    .sort(byName);
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

/** What a bump is: `major`, `minor` or `patch` (the digit that moved). */
export function levelOf(from, to) {
  const [a, b] = [parts(from), parts(to)];
  if (b[0] !== a[0]) return "major";
  return b[1] !== a[1] ? "minor" : "patch";
}

/** Breaking: a new major, or a 0.x minor (semver's breaking digit below 1.0). It goes to its own pull request (krizaka-internal#3396). */
function isBreaking(from, to) {
  const [a, b] = [parts(from), parts(to)];
  return b[0] !== a[0] || (a[0] === 0 && b[1] !== a[1]);
}

/**
 * The bump of one range. Only plain `^x.y.z`, `~x.y.z` and `x.y.z` ranges are touched, in the style they already have.
 * @returns {{ range: string, level: string, breaking: boolean } | { skip: string }}
 */
export function bumpRange(range, version) {
  const match = SIMPLE_RANGE.exec(range);
  if (!match) return { skip: `range ${range} is not plain` };
  const current = `${match[2]}.${match[3]}.${match[4]}`;
  if (compareVersions(version, current) <= 0) return { skip: "already at or above" };
  return { range: `${match[1]}${version}`, level: levelOf(current, version), breaking: isBreaking(current, version) };
}

/** The names of the packages a set of manifests declares: their own dependencies are `workspace:`, never bumped here. */
export function workspaceNames(manifests) {
  return new Set(manifests.map((m) => m.name).filter(Boolean));
}

/** The bumps of one manifest: `[{ name, field, from, to, level, breaking }]`; `scope` keeps only the `wave` (not breaking) or the `breaking` ones. */
export function planManifest(manifest, packages, own = new Set(), scope = "all") {
  const plan = [];
  for (const field of DEP_FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (!(name in packages) || own.has(name) || field === "peerDependencies") continue;
      const bump = bumpRange(range, packages[name]);
      if ("skip" in bump || (scope === "wave" && bump.breaking) || (scope === "breaking" && !bump.breaking)) continue;
      plan.push({ name, field, from: range, to: bump.range, level: bump.level, breaking: bump.breaking });
    }
  }
  return plan;
}

/** Where a manifest is edited in place, keeping its indentation and its final newline. */
export function applyPlan(text, plan) {
  const manifest = JSON.parse(text);
  for (const { name, field, to } of plan) manifest[field][name] = to;
  const second = text.split("\n")[1] ?? "";
  const indent = second.slice(0, second.length - second.trimStart().length) || "  ";
  const newline = text.endsWith("\n") ? "\n" : "";
  return JSON.stringify(manifest, null, indent) + newline;
}

/** The title (conventional commits), the breaking flag, whether anything moves and the details of the pull request. */
export function summarise(packages, plans, scope = "wave") {
  const bumped = new Map();
  for (const { name, from, to, level, breaking } of plans.flat()) bumped.set(name, { from, version: to.replace(/^[\^~]/, ""), breaking: breaking ?? level === "major" });
  const list = [...bumped].sort(([a], [b]) => byName(a, b));
  const names = list.map(([name, { version }]) => name + " " + version);
  return {
    title: "chore(deps): " + (scope === "breaking" ? "breaking " : "") + names.join(", "),
    major: list.some(([, { breaking }]) => breaking),
    changed: list.length > 0,
    details: list.map(([name, { from, version }]) => `${name} ${from} -> ${version}`).join("; "),
  };
}

/** The nearest folder at or above `dir` that has a lockfile, or null. */
function lockfileDir(root, dir) {
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(root, d, "pnpm-lock.yaml")) || existsSync(join(root, d, "package-lock.json"))) return d;
    if (d === ".") return null;
  }
}

/** The lockfiles to regenerate for the changed manifests (root and nested): `[{ dir, manager }]`, once each, in order. */
export function lockfileTargets(root, changedPaths) {
  const dirs = new Set(changedPaths.map((p) => lockfileDir(root, dirname(p))).filter((d) => d !== null));
  return [...dirs].sort(byName).map((dir) => ({ dir, manager: detectPackageManager(join(root, dir)) }));
}

const LOCK_COMMANDS = {
  pnpm: ["pnpm", ["install", "--lockfile-only", "--no-frozen-lockfile", "--ignore-scripts"]],
  npm: ["npm", ["install", "--package-lock-only", "--ignore-scripts"]],
};

/** Regenerates each lockfile with its own folder's manager; `run(command, args, cwd)` is injected. */
export function regenerateLockfiles(root, targets, run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: "inherit" })) {
  for (const { dir, manager } of targets) {
    const [command, args] = LOCK_COMMANDS[manager];
    run(command, args, join(root, dir));
  }
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
  const response = await fetch(`https://registry.npmjs.org/${name.replaceAll("/", "%2F")}/${version}`);
  return response.ok;
}

/** The package.json files of a checkout (git-tracked, not node_modules). */
function manifestPaths(root) {
  const files = execFileSync(GIT, ["ls-files", "--", "package.json", "**/package.json"], { cwd: root, encoding: "utf8" });
  return files.split("\n").filter(Boolean);
}

/** The `@krizaka/*` names a checkout depends on (own workspace packages excluded). */
export function readDependencies(root) {
  const manifests = manifestPaths(root).map((p) => JSON.parse(readFileSync(join(root, p), "utf8")));
  const own = workspaceNames(manifests);
  const names = new Set();
  for (const m of manifests) for (const f of DEP_FIELDS) for (const n of Object.keys(m[f] ?? {})) if (n.startsWith("@krizaka/") && !own.has(n)) names.add(n);
  return [...names].sort(byName);
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
    const changes = added.map((n) => "+" + n).concat(removed.map((n) => "-" + n));
    if (changes.length > 0) drift.push(repo + ": " + changes.join(" "));
  }
  return drift;
}

/** Edits this checkout's manifests (`scope`: `wave`, `breaking` or `all`); returns the plans and the paths of the changed manifests. */
export function bumpCheckout(root, packages, dryRun, scope = "all") {
  const paths = manifestPaths(root);
  const texts = paths.map((p) => readFileSync(join(root, p), "utf8"));
  const own = workspaceNames(texts.map((t) => JSON.parse(t)));
  const plans = texts.map((t) => planManifest(JSON.parse(t), packages, own, scope));
  const changed = paths.filter((_, i) => plans[i].length > 0);
  if (!dryRun) {
    plans.forEach((plan, i) => {
      if (plan.length > 0) writeFileSync(join(root, paths[i]), applyPlan(texts[i], plan));
    });
  }
  return { plans, paths: changed };
}

function dispatchAll(consumers, packages, dryRun) {
  for (const repo of consumersOf(consumers, packages)) {
    console.log((dryRun ? "would tell " : "telling ") + repo);
    if (dryRun) continue;
    const body = JSON.stringify({ event_type: "krizaka-release", client_payload: { packages } });
    execFileSync(GH, ["api", "-X", "POST", `repos/krizaka/${repo}/dispatches`, "--input", "-"], { input: body, stdio: ["pipe", "inherit", "inherit"] });
  }
  return 0;
}

async function bumpCommand(packages, flags, dryRun) {
  const missing = flags.includes("--no-wait") ? [] : await waitForPublished(packages, { fetchVersion: npmServes });
  if (missing.length > 0) {
    console.error(`npm does not serve ${missing.join(", ")} yet`);
    return 1;
  }
  const scope = flags.find((f) => f.startsWith("--scope="))?.slice("--scope=".length) ?? "wave";
  const { plans, paths } = bumpCheckout(process.cwd(), packages, dryRun, scope);
  const summary = summarise(packages, plans, scope);
  console.log(JSON.stringify(summary));
  if (!dryRun) writeFileSync(CHANGED_FILE, JSON.stringify(paths));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${summary.changed}\nmajor=${summary.major}\ntitle=${summary.title}\ndetails=${summary.details}\n`);
  }
  return 0;
}

/** Regenerates the lockfiles of the manifests the last `bump` changed. */
function lockCommand() {
  const targets = lockfileTargets(process.cwd(), JSON.parse(readFileSync(CHANGED_FILE, "utf8")));
  regenerateLockfiles(process.cwd(), targets);
  return 0;
}

async function main([command, argument, ...flags]) {
  const consumers = JSON.parse(readFileSync(CONSUMERS_FILE, "utf8")).repos;
  const dryRun = flags.includes("--dry-run");
  if (command === "check") {
    const drift = driftOf(consumers, argument);
    drift.forEach((line) => console.error(line));
    return drift.length > 0 ? 1 : 0;
  }
  // An empty argument is « nothing published » (the publisher passes PACKAGES="" then): nobody to tell, not an error.
  const packages = normalisePackages(JSON.parse(argument?.trim() || "{}"));
  if (command === "consumers") {
    console.log(JSON.stringify(consumersOf(consumers, packages)));
    return 0;
  }
  if (command === "dispatch") return dispatchAll(consumers, packages, dryRun);
  if (command === "bump") return bumpCommand(packages, flags, dryRun);
  if (command === "lock") return lockCommand();
  console.error("Usage: krizaka-release.mjs <consumers|dispatch|bump|lock|check> …");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
