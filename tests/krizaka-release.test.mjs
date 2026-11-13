// A @krizaka release reaches its consumers: who is told, what is bumped, how (krizaka/.github#388).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  applyPlan,
  bumpCheckout,
  bumpRange,
  compareVersions,
  consumersOf,
  driftOf,
  levelOf,
  lockfileTargets,
  normalisePackages,
  planManifest,
  regenerateLockfiles,
  summarise,
  waitForPublished,
} from "../scripts/krizaka-release.mjs";

const consumers = JSON.parse(readFileSync(new URL("../orchestration/release-consumers.json", import.meta.url), "utf8"));
const registry = JSON.parse(readFileSync(new URL("../repos.json", import.meta.url), "utf8"));

describe("the packages a publisher announces", () => {
  it("reads both shapes and keeps only exact @krizaka versions", () => {
    const expected = { "@krizaka/ui": "3.74.0" };
    assert.deepEqual(normalisePackages({ "@krizaka/ui": "3.74.0", react: "19.0.0", "@krizaka/x": "next" }), expected);
    assert.deepEqual(normalisePackages([{ name: "@krizaka/ui", version: "3.74.0" }, { name: "lodash", version: "4.0.0" }]), expected);
    assert.deepEqual(normalisePackages(undefined), {});
  });
});

describe("who is told", () => {
  const map = { a: ["@krizaka/ui", "@krizaka/auth"], b: ["@krizaka/auth"], c: ["@krizaka/icons"] };
  it("is every repository that depends on a published package, once, in order", () => {
    assert.deepEqual(consumersOf(map, { "@krizaka/auth": "0.12.0", "@krizaka/ui": "3.74.0" }), ["a", "b"]);
    assert.deepEqual(consumersOf(map, { "@krizaka/icons": "1.0.1" }), ["c"]);
  });
  it("is nobody when nobody depends on it", () => {
    assert.deepEqual(consumersOf(map, { "@krizaka/query": "1.0.0" }), []);
  });
  it("is checked against the registry: every consumer is a repository of the organisation", () => {
    const names = new Set(registry.repositories.map((r) => r.name));
    for (const repo of Object.keys(consumers.repos)) assert.ok(names.has(repo), `${repo} is not in repos.json`);
  });
  it("lists only @krizaka/* packages, sorted", () => {
    for (const [repo, deps] of Object.entries(consumers.repos)) {
      assert.ok(deps.every((n) => n.startsWith("@krizaka/")), repo);
      assert.deepEqual(deps, [...deps].sort(), repo);
    }
  });
});

describe("the version-range logic", () => {
  it("keeps the style of the range", () => {
    assert.deepEqual(bumpRange("^3.73.0", "3.74.0"), { range: "^3.74.0", level: "minor", breaking: false });
    assert.deepEqual(bumpRange("~0.10.0", "0.10.2"), { range: "~0.10.2", level: "patch", breaking: false });
    assert.deepEqual(bumpRange("3.73.0", "3.73.1"), { range: "3.73.1", level: "patch", breaking: false });
  });
  it("calls a new major a major, and a 0.x minor breaking (krizaka-internal#3396)", () => {
    assert.equal(levelOf("3.73.0", "4.0.0"), "major");
    assert.equal(levelOf("0.10.0", "0.11.0"), "minor");
    assert.equal(levelOf("0.10.0", "1.0.0"), "major");
    assert.equal(bumpRange("^0.10.0", "0.11.0").breaking, true);
    assert.equal(bumpRange("^3.73.0", "4.0.0").breaking, true);
    assert.equal(bumpRange("^0.10.0", "0.10.5").breaking, false);
    assert.equal(bumpRange("^1.0.0", "1.1.0").breaking, false);
  });
  it("leaves alone what it does not understand or already has", () => {
    for (const range of ["workspace:^", "file:../x", ">=3.0.0", "^3 || ^4", "latest", "npm:@krizaka/ui@3.0.0", "^3.74.0", "^3.75.0"]) {
      assert.ok("skip" in bumpRange(range, "3.74.0"), range);
    }
  });
  it("compares numerically, not as text", () => {
    assert.equal(compareVersions("3.9.0", "3.10.0"), -1);
    assert.equal(compareVersions("3.10.0", "3.10.0"), 0);
  });
});

describe("what is bumped in a manifest", () => {
  const manifest = {
    name: "app",
    dependencies: { "@krizaka/ui": "^3.73.0", "@krizaka/own": "^0.1.0", react: "^19.0.0" },
    devDependencies: { "@krizaka/config": "~0.13.0" },
    peerDependencies: { "@krizaka/ui": "^3.0.0" },
  };
  const packages = { "@krizaka/ui": "3.74.0", "@krizaka/own": "0.2.0", "@krizaka/config": "0.13.4" };

  it("bumps dependencies and devDependencies, never a peer range nor a package of its own workspace", () => {
    const plan = planManifest(manifest, packages, new Set(["@krizaka/own"]));
    assert.deepEqual(plan.map((p) => `${p.field} ${p.name} ${p.from} -> ${p.to}`), [
      "dependencies @krizaka/ui ^3.73.0 -> ^3.74.0",
      "devDependencies @krizaka/config ~0.13.0 -> ~0.13.4",
    ]);
  });
  it("writes the manifest back with its own indentation and final newline", () => {
    const text = `${JSON.stringify(manifest, null, 4)}\n`;
    const next = applyPlan(text, planManifest(manifest, packages, new Set(["@krizaka/own"])));
    assert.match(next, /^ {4}"name"/m);
    assert.ok(next.endsWith("}\n"));
    assert.equal(JSON.parse(next).dependencies["@krizaka/ui"], "^3.74.0");
    assert.equal(JSON.parse(next).peerDependencies["@krizaka/ui"], "^3.0.0");
  });
});

describe("the pull request", () => {
  it("is titled by what moved, and flags a major (no auto-merge)", () => {
    const minor = summarise({}, [[{ name: "@krizaka/ui", from: "^3.73.0", to: "^3.74.0", level: "minor" }], [{ name: "@krizaka/auth", from: "^0.11.0", to: "^0.12.0", level: "minor" }]]);
    assert.deepEqual(minor, { title: "chore(deps): @krizaka/auth 0.12.0, @krizaka/ui 3.74.0", major: false, changed: true, details: "@krizaka/auth ^0.11.0 -> 0.12.0; @krizaka/ui ^3.73.0 -> 3.74.0" });
    assert.equal(summarise({}, [[{ name: "@krizaka/ui", to: "^4.0.0", level: "major" }]]).major, true);
  });
  it("says nothing changed when nothing is planned", () => {
    assert.equal(summarise({}, [[], []]).changed, false);
  });
});

describe("waiting for npm", () => {
  const sleep = async () => {};
  it("retries until the registry serves every version", async () => {
    let calls = 0;
    const fetchVersion = async () => ++calls > 2;
    assert.deepEqual(await waitForPublished({ "@krizaka/ui": "3.74.0" }, { fetchVersion, sleep }), []);
    assert.equal(calls, 3);
  });
  it("names what is still missing after the last attempt", async () => {
    const fetchVersion = async (name) => name === "@krizaka/ui";
    const missing = await waitForPublished({ "@krizaka/ui": "3.74.0", "@krizaka/auth": "0.12.0" }, { fetchVersion, sleep, attempts: 3 });
    assert.deepEqual(missing, ["@krizaka/auth@0.12.0"]);
  });
});

describe("the consumers list against the real dependencies", () => {
  it("reports what a repository depends on that the list lacks, and the reverse", () => {
    const root = mkdtempSync(join(tmpdir(), "release-"));
    const repo = join(root, "app");
    mkdirSync(repo);
    execFileSync("git", ["init", "-q"], { cwd: repo });
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "app", dependencies: { "@krizaka/ui": "^3.0.0", "@krizaka/new": "^1.0.0" } }));
    execFileSync("git", ["add", "."], { cwd: repo });
    assert.deepEqual(driftOf({ app: ["@krizaka/gone", "@krizaka/ui"] }, root), ["app: +@krizaka/new -@krizaka/gone"]);
    assert.deepEqual(driftOf({ app: ["@krizaka/new", "@krizaka/ui"] }, root), []);
  });
});

// main went red on every non-release push of krizaka-ts (2026-11-12): the publisher passes PACKAGES="" when nothing was
// published, and `JSON.parse("")` threw in `consumers`. Nothing published means nobody to tell, not a failure.
describe("consumers with nothing published", () => {
  for (const empty of ["", "  ", "{}"]) {
    it(`prints [] and exits 0 for ${JSON.stringify(empty)}`, () => {
      const out = execFileSync(process.execPath, [new URL("../scripts/krizaka-release.mjs", import.meta.url).pathname, "consumers", empty], {
        encoding: "utf8",
      });
      assert.deepEqual(JSON.parse(out), []);
    });
  }
});

// krizaka-internal#3396: the org wave opens PRs that land.
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" });
const repoWith = (files) => {
  const repo = mkdtempSync(join(tmpdir(), "wave-"));
  git(repo, "init", "-q");
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(repo, path, ".."), { recursive: true });
    writeFileSync(join(repo, path), typeof text === "string" ? text : `${JSON.stringify(text, null, 2)}\n`);
  }
  git(repo, "add", ".");
  return repo;
};
const manifestOf = (repo, path) => JSON.parse(readFileSync(join(repo, path), "utf8"));

describe("the title of the pull request (conventional commits)", () => {
  it("starts with chore(deps): for the wave and for the breaking pull request", () => {
    const plans = [[{ name: "@krizaka/ui", to: "^4.0.0", level: "major", breaking: true }]];
    assert.match(summarise({}, plans, "wave").title, /^chore\(deps\): /);
    assert.match(summarise({}, plans, "breaking").title, /^chore\(deps\): breaking @krizaka\/ui 4\.0\.0$/);
  });
});

describe("a major in its own pull request", () => {
  const packages = { "@krizaka/ui": "4.0.0", "@krizaka/auth": "0.13.0", "@krizaka/icons": "1.0.1", "@krizaka/query": "1.2.0" };
  const files = () => ({
    "package.json": { name: "app", dependencies: { "@krizaka/ui": "^3.73.0", "@krizaka/auth": "^0.12.0", "@krizaka/icons": "^1.0.0", "@krizaka/query": "^1.1.0" } },
  });
  it("keeps patches and minors in the wave and leaves the major and the 0.x minor alone", () => {
    const repo = repoWith(files());
    const { plans } = bumpCheckout(repo, packages, false, "wave");
    assert.equal(summarise(packages, plans, "wave").major, false);
    assert.deepEqual(manifestOf(repo, "package.json").dependencies, { "@krizaka/ui": "^3.73.0", "@krizaka/auth": "^0.12.0", "@krizaka/icons": "^1.0.1", "@krizaka/query": "^1.2.0" });
  });
  it("moves only the major and the 0.x minor in the breaking pull request", () => {
    const repo = repoWith(files());
    const { plans } = bumpCheckout(repo, packages, false, "breaking");
    const summary = summarise(packages, plans, "breaking");
    assert.equal(summary.major, true);
    assert.equal(summary.title, "chore(deps): breaking @krizaka/auth 0.13.0, @krizaka/ui 4.0.0");
    assert.deepEqual(manifestOf(repo, "package.json").dependencies, { "@krizaka/ui": "^4.0.0", "@krizaka/auth": "^0.13.0", "@krizaka/icons": "^1.0.0", "@krizaka/query": "^1.1.0" });
  });
  it("opens no breaking pull request when nothing breaks", () => {
    const repo = repoWith(files());
    const { plans } = bumpCheckout(repo, { "@krizaka/icons": "1.0.1" }, false, "breaking");
    assert.equal(summarise({}, plans, "breaking").changed, false);
  });
});

describe("a repository whose main already has the target versions", () => {
  it("changes nothing and so opens no pull request", () => {
    const repo = repoWith({ "package.json": { name: "app", dependencies: { "@krizaka/ui": "^3.74.0" }, devDependencies: { "@krizaka/config": "0.13.4" } } });
    for (const scope of ["wave", "breaking"]) {
      const { plans, paths } = bumpCheckout(repo, { "@krizaka/ui": "3.74.0", "@krizaka/config": "0.13.4" }, false, scope);
      assert.equal(summarise({}, plans, scope).changed, false);
      assert.deepEqual(paths, []);
    }
    assert.equal(git(repo, "status", "--porcelain", "--untracked-files=no").includes("package.json\n M"), false);
  });
});

describe("every lockfile whose manifest the wave changes is regenerated", () => {
  const dep = { dependencies: { "@krizaka/ui": "^3.73.0" } };
  const repo = () =>
    repoWith({
      "package.json": { name: "root", ...dep },
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "site/package.json": { name: "site", ...dep },
      "site/package-lock.json": "{}\n",
      "apps/web/package.json": { name: "web", ...dep },
      "apps/web/pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      "packages/lib/package.json": { name: "lib", ...dep },
      "docs/package.json": { name: "docs", dependencies: { react: "^19.0.0" } },
    });
  it("finds the nearest lockfile of each changed manifest, with that folder's manager, once", () => {
    const root = repo();
    const { paths } = bumpCheckout(root, { "@krizaka/ui": "3.74.0" }, false, "wave");
    assert.deepEqual(lockfileTargets(root, paths), [
      { dir: ".", manager: "pnpm" },
      { dir: "apps/web", manager: "pnpm" },
      { dir: "site", manager: "npm" },
    ]);
  });
  it("runs the lockfile-only install in every one of them, in its own folder", () => {
    const root = repo();
    const calls = [];
    regenerateLockfiles(root, lockfileTargets(root, ["package.json", "site/package.json"]), (command, args, cwd) => calls.push([command, ...args, cwd]));
    assert.deepEqual(calls, [
      ["pnpm", "install", "--lockfile-only", "--no-frozen-lockfile", "--ignore-scripts", root],
      ["npm", "install", "--package-lock-only", "--ignore-scripts", join(root, "site")],
    ]);
  });
  it("regenerates nothing when no manifest changed", () => {
    assert.deepEqual(lockfileTargets(repo(), []), []);
  });
});
