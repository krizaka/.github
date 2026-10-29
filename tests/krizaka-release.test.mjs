// A @krizaka release reaches its consumers: who is told, what is bumped, how (krizaka/.github#388).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  applyPlan,
  bumpRange,
  compareVersions,
  consumersOf,
  driftOf,
  levelOf,
  normalisePackages,
  planManifest,
  summarise,
  waitForPublished,
} from "../scripts/krizaka-release.mjs";

const consumers = JSON.parse(readFileSync(new URL("../release-consumers.json", import.meta.url), "utf8"));
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
    assert.deepEqual(bumpRange("^3.73.0", "3.74.0"), { range: "^3.74.0", level: "minor" });
    assert.deepEqual(bumpRange("~0.10.0", "0.10.2"), { range: "~0.10.2", level: "patch" });
    assert.deepEqual(bumpRange("3.73.0", "3.73.1"), { range: "3.73.1", level: "patch" });
  });
  it("calls a new major a major, and a 0.x minor a minor (CI decides)", () => {
    assert.equal(levelOf("3.73.0", "4.0.0"), "major");
    assert.equal(levelOf("0.10.0", "0.11.0"), "minor");
    assert.equal(levelOf("0.10.0", "1.0.0"), "major");
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
    const minor = summarise({}, [[{ name: "@krizaka/ui", to: "^3.74.0", level: "minor" }], [{ name: "@krizaka/auth", to: "^0.12.0", level: "minor" }]]);
    assert.deepEqual(minor, { title: "deps: @krizaka/auth 0.12.0, @krizaka/ui 3.74.0", major: false, changed: true });
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
