#!/usr/bin/env node
// Reports every Krizaka app whose @krizaka/ui (and sibling packages) lags the latest published minor.
// Usage: node scripts/check-ui-drift.mjs [--strict] [--org krizaka] [--packages ui,tokens,tailwind]
// Needs the GitHub CLI (`gh`) logged in and `npm`. Read-only. Exit 1 with --strict when an app drifts.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Lowest version a range accepts: "^3.18.2" -> "3.18.2", "3.11.0" -> "3.11.0", ">=0.2.1" -> "0.2.1". null when not semver-ish (workspace:*, *). */
export function lowerBound(range) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(range ?? ""));
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

export const minorOf = (v) => (v ? v.split(".").slice(0, 2).join(".") : null);

/** "ok" when the range's floor is on the latest minor, "behind" otherwise, "n/a" for workspace/non-semver ranges. */
export function status(range, latest) {
  const floor = lowerBound(range);
  if (!floor || /^workspace:/.test(range)) return "n/a";
  return minorOf(floor) === minorOf(latest) ? "ok" : "behind";
}

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

function latestOf(pkg) {
  return sh("npm", ["view", `@krizaka/${pkg}`, "version", "--prefer-online"]);
}

function repos(org) {
  return JSON.parse(sh("gh", ["repo", "list", org, "--limit", "200", "--json", "name,isArchived"]))
    .filter((r) => !r.isArchived)
    .map((r) => r.name);
}

function manifests(org, repo) {
  const tree = JSON.parse(sh("gh", ["api", `repos/${org}/${repo}/git/trees/HEAD?recursive=1`]));
  return tree.tree
    .map((n) => n.path)
    .filter((p) => /(^|\/)package\.json$/.test(p) && !p.includes("node_modules"));
}

function manifest(org, repo, path) {
  const b64 = sh("gh", ["api", `repos/${org}/${repo}/contents/${path}`, "--jq", ".content"]);
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, d) => (args.includes(name) ? args[args.indexOf(name) + 1] : d);
  const org = opt("--org", "krizaka");
  const packages = opt("--packages", "ui,tokens,tailwind").split(",");
  const latest = Object.fromEntries(packages.map((p) => [p, latestOf(p)]));
  const rows = [];
  for (const repo of repos(org)) {
    let paths = [];
    try { paths = manifests(org, repo); } catch { continue; }
    for (const path of paths) {
      let json;
      try { json = manifest(org, repo, path); } catch { continue; }
      const deps = { ...json.peerDependencies, ...json.devDependencies, ...json.dependencies };
      const row = { where: `${repo}/${path.replace(/package\.json$/, "").replace(/\/$/, "")}`.replace(/\/$/, ""), cells: {} };
      for (const p of packages) if (deps[`@krizaka/${p}`]) row.cells[p] = deps[`@krizaka/${p}`];
      if (Object.keys(row.cells).length) rows.push(row);
    }
  }
  let drift = 0;
  console.log(["app", ...packages.map((p) => `${p} (latest ${latest[p]})`), "status"].join(" | "));
  for (const row of rows) {
    const st = packages.map((p) => (row.cells[p] ? status(row.cells[p], latest[p]) : "-"));
    const bad = st.includes("behind");
    if (bad) drift++;
    console.log([row.where, ...packages.map((p) => row.cells[p] ?? "-"), bad ? "DRIFT" : "ok"].join(" | "));
  }
  console.log(`\n${drift} manifest(s) behind the latest minor.`);
  if (drift && args.includes("--strict")) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
