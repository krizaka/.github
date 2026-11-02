import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  END, badgeUrl, collectKrizakaDeps, compareVersions, depBadge, envBadge, languageBadge, latestStable, mainLanguages, manifestPaths, parseCargoDeps, parseMavenDeps, parsePythonDeps, pomProperty, readHealth, readModel, renderBlock, renderComponents, renderProduct, replaceBlock, statusLabel, treeLanguageBytes, versionOf,
} from "../scripts/profile-readme.mjs";

const data = JSON.parse(readFileSync(new URL("../profile/products.json", import.meta.url), "utf8"));
const readme = readFileSync(new URL("../profile/README.md", import.meta.url), "utf8");

// A reader that answers from tables: nothing here touches the network. Every ecosystem has a fixture file.
const POM = `<project><properties><krizaka.version>0.7.1</krizaka.version></properties><dependencies>
<dependency><groupId>com.krizaka</groupId><artifactId>krizaka-security</artifactId></dependency>
<dependency><groupId>com.krizaka</groupId><artifactId>krizaka-users-api</artifactId><version>0.6.0</version></dependency>
<dependency><groupId>org.other</groupId><artifactId>x</artifactId></dependency></dependencies></project>`;
const CARGO = `[package]\nname = "app"\nauthors = ["Krizaka"]\n[dependencies]\nkrizaka-tauri-kit = { version = "0.3", git = "https://github.com/krizaka/krizaka-tauri-kit", tag = "v0.3.0" }\nkrizaka-local = { path = "../local" }\nserde = "1"\n`;
const TREE = [
  { path: "apps/web/package.json", type: "blob", size: 1 }, { path: "apps/web/app/page.tsx", type: "blob", size: 900 }, { path: "apps/web/app/api/x/route.ts", type: "blob", size: 100 },
  { path: "apps/desktop/src-tauri/Cargo.toml", type: "blob", size: 1 }, { path: "apps/desktop/src-tauri/main.rs", type: "blob", size: 500 }, { path: "apps/desktop/src/app.ts", type: "blob", size: 1000 },
  { path: "svc/pom.xml", type: "blob", size: 1 }, { path: "svc/A.java", type: "blob", size: 100 },
  { path: "worker/requirements.txt", type: "blob", size: 1 }, { path: "worker/w.py", type: "blob", size: 100 }, { path: "node_modules/p/package.json", type: "blob", size: 1 },
];
const FILES = {
  "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { "@krizaka/ui": "^3.80.0", "@krizaka/own": "1.0.0" } }),
  "apps/desktop/src-tauri/Cargo.toml": CARGO, "svc/pom.xml": POM, "worker/requirements.txt": "krizaka-worker-kit==0.2.0\nnumpy==2.0.0\n",
};
const reader = ({ health = {}, npm = {}, java = null } = {}) => ({
  repoTree: async () => TREE,
  repoLanguages: async () => ({ Java: 5000, CSS: 90000, Shell: 100 }),
  repoFile: async (_o, _r, path) => FILES[path] ?? "<krizaka.version>0.7.1</krizaka.version>",
  npmLatest: async (n) => npm[n] ?? (n === "@krizaka/own" ? { missing: true } : { version: "3.81.0" }),
  githubMavenLatest: async () => java ?? "0.8.0",
  gitTagLatest: async () => "0.4.0",
  pypiLatest: async (n) => (n === "krizaka-worker-kit" ? { version: "0.3.0" } : { missing: true }),
  health: async (host) => health[host] ?? { up: false },
  markHash: async () => "abc",
});
const fixtureData = {
  ...data,
  tiers: [{ id: "client-web", label: "Clients: web" }, { id: "client-mac", label: "Clients: Mac" }, { id: "bff", label: "BFF" }, { id: "service", label: "Services" }, { id: "worker", label: "Workers" }],
  order: ["orazaka"],
  products: { orazaka: { ...data.products.orazaka, bom: { repo: "b", file: "pom.xml", property: "krizaka.version", package: "com.krizaka.krizaka-bom" }, components: [
    { label: "Web", tier: "client-web", repo: "r", path: "apps/web" }, { label: "API", tier: "bff", repo: "r", path: "apps/web/app/api" }, { label: "Mac", tier: "client-mac", repo: "r", path: "apps/desktop" },
    { label: "Core", tier: "service", repo: "r", path: "svc" }, { label: "Media", tier: "worker", repo: "r", path: "worker" },
  ] } },
};

test("versionOf reads the first version of a range and refuses non-semver specs", () => {
  assert.equal(versionOf("^0.12.0"), "0.12.0");
  assert.equal(versionOf("~3.1.4"), "3.1.4");
  assert.equal(versionOf(">=1.2.3 <2"), "1.2.3");
  assert.equal(versionOf("workspace:*"), null);
  assert.equal(versionOf("catalog:"), null);
});

test("versions compare numerically; the latest stable skips SNAPSHOTs and tags", () => {
  assert.ok(compareVersions("0.10.0", "0.9.9") > 0);
  assert.equal(latestStable(["0.8.0", "0.8.1-SNAPSHOT", "0.7.1", "0.10.0-rc.1"]), "0.8.0");
  assert.equal(latestStable([]), null);
});

test("collectKrizakaDeps keeps the highest used version and leaves out the repository's own packages", () => {
  const deps = collectKrizakaDeps([
    { name: "app", dependencies: { "@krizaka/ui": "^3.1.0", "@krizaka/own": "1.0.0", react: "19.0.0" } },
    { name: "@krizaka/own", devDependencies: { "@krizaka/ui": "3.2.0", "@krizaka/x": "workspace:*" } },
  ]);
  assert.deepEqual(deps, [{ name: "@krizaka/ui", used: "3.2.0" }]);
});

test("pomProperty reads the BOM version property", () => {
  assert.equal(pomProperty("<properties><krizaka.version>0.7.1</krizaka.version></properties>", "krizaka.version"), "0.7.1");
  assert.equal(pomProperty("<a/>", "krizaka.version"), null);
});

test("an environment is up only when /api/healthz says ok", () => {
  assert.deepEqual(readHealth(200, '{"status":"ok","version":"1.0.0+abc"}'), { up: true, version: "1.0.0+abc" });
  assert.deepEqual(readHealth(200, "<html>parked</html>"), { up: false });
  assert.deepEqual(readHealth(503, '{"status":"ok"}'), { up: false });
  assert.deepEqual(readHealth(0, ""), { up: false });
});

test("prod is « not open yet » without a link until its health check answers, then it links by itself", () => {
  const down = envBadge("prod", { host: "www.verikora.com", up: false });
  assert.match(down, /Prod: not open yet/);
  assert.ok(!down.includes("](https://www.verikora.com"), "no link to a host that does not answer");
  const up = envBadge("prod", { host: "www.verikora.com", up: true, version: "1.2.0+abc" });
  assert.match(up, /\]\(https:\/\/www\.verikora\.com\)$/);
  assert.match(up, /1\.2\.0/);
  assert.match(envBadge("dev", { host: "www.yomizaka.com", up: false }), /Dev: down/);
});

test("shields badges escape dashes, underscores and spaces", () => {
  assert.equal(badgeUrl("a-b_c", "up · 1.0", "green"), "https://img.shields.io/badge/a--b__c-up_%C2%B7_1.0-green");
});

test("a dependency badge is green on the latest, orange behind, grey when the latest is unknown", () => {
  assert.match(depBadge({ name: "@krizaka/ui", used: "3.81.0", latest: "3.81.0" }), /-brightgreen\)/);
  assert.match(depBadge({ name: "@krizaka/ui", used: "3.80.0", latest: "3.81.0" }), /-orange\)/);
  assert.match(depBadge({ name: "@krizaka/ui", used: "3.80.0", latest: null }), /-lightgrey\)/);
});

test("the data file: every product is in development, under its commercial name, with no host in the script", () => {
  assert.deepEqual(data.order.map((id) => data.products[id].name), ["Sovkora", "Verikora", "Folioviv"]);
  for (const id of data.order) assert.equal(data.products[id].status, "development");
  assert.deepEqual(Object.values(data.statuses), ["In development"]);
  const script = readFileSync(new URL("../scripts/profile-readme.mjs", import.meta.url), "utf8");
  assert.ok(!/\b(orazaka|yomizaka|akinaza|sovkora|verikora|folioviv)\.com/.test(script), "hosts live in profile/products.json");
});

test("an opened status needs a decision: an unknown status is refused, never shown as Available", () => {
  assert.throws(() => statusLabel(data, { name: "X", status: "released" }), /not in profile\/products\.json/);
});

test("the data file: every component has a tier of the tiers list, a repository and a label", () => {
  const tiers = new Set(data.tiers.map((t) => t.id));
  for (const id of data.order) {
    assert.ok(data.products[id].components.length > 0);
    for (const c of data.products[id].components) assert.ok(tiers.has(c.tier) && c.repo && c.label, `${id}: ${c.label}`);
  }
  const tierOf = (id, label) => data.products[id].components.find((c) => c.label === label).tier;
  assert.equal(tierOf("orazaka", "Edge"), "service");
  assert.equal(tierOf("orazaka", "Media and GPU worker"), "worker");
  assert.equal(tierOf("yomizaka", "API routes"), "bff");
  assert.equal(tierOf("akinaza", "Mac app"), "client-mac");
});

test("a component with a tier that is not in the list is refused, never guessed", () => {
  assert.throws(() => renderComponents(data, [{ label: "X", tier: "frontend", repo: "r", languages: [], modules: {} }]), /not in profile\/products\.json tiers/);
});

test("languages: the main one, a second only when it is a real part, markup and shell never; read from sizes, not typed", () => {
  assert.deepEqual(mainLanguages({ Java: 5000, CSS: 90000, Shell: 9 }), ["Java"]);
  assert.deepEqual(mainLanguages({ TypeScript: 1000, Rust: 200, Python: 5 }), ["TypeScript", "Rust"]);
  assert.deepEqual(mainLanguages({ TypeScript: 1000, Rust: 50 }), ["TypeScript"]);
  assert.deepEqual(mainLanguages({}), []);
  assert.deepEqual(mainLanguages(treeLanguageBytes(TREE, "apps/desktop")), ["TypeScript", "Rust"]);
  assert.deepEqual(treeLanguageBytes(TREE, "svc"), { Java: 100 });
  assert.match(languageBadge("Rust"), /Rust-dea584\)$/);
  assert.match(languageBadge("Zig"), /Zig-lightgrey\)$/);
});

test("manifests of each ecosystem are found under a path, node_modules never", () => {
  assert.deepEqual(manifestPaths(TREE, "apps/web").npm, ["apps/web/package.json"]);
  assert.deepEqual(manifestPaths(TREE).npm, ["apps/web/package.json"]);
  assert.deepEqual(manifestPaths(TREE, "svc").maven, ["svc/pom.xml"]);
  assert.deepEqual(manifestPaths(TREE, "apps/desktop").rust, ["apps/desktop/src-tauri/Cargo.toml"]);
  assert.deepEqual(manifestPaths(TREE, "worker").python, ["worker/requirements.txt"]);
});

test("Maven: only com.krizaka modules; a managed one uses the BOM version, an explicit one its own", () => {
  assert.deepEqual(parseMavenDeps(POM, "0.7.1"), [{ name: "krizaka-security", used: "0.7.1" }, { name: "krizaka-users-api", used: "0.6.0" }]);
});

test("Rust: krizaka crates with the git tag as version, path crates are the workspace's own; Python: pinned krizaka packages", () => {
  assert.deepEqual(parseCargoDeps(CARGO), [{ name: "krizaka-tauri-kit", used: "0.3.0", repo: "krizaka/krizaka-tauri-kit" }]);
  assert.deepEqual(parsePythonDeps("krizaka-worker-kit==0.2.0\nnumpy==2.0.0\n"), [{ name: "krizaka-worker-kit", used: "0.2.0" }]);
});

test("the block groups the components by tier with language, repository and modules from every ecosystem", async () => {
  const model = await readModel(fixtureData, reader({ health: { "www.orazaka.com": { up: true, version: "1.0.0+aaa" } } }));
  const block = renderBlock(fixtureData, model);
  assert.ok(block.includes("**Sovkora**") && block.includes("<details><summary>Components (5)"));
  const order = ["Clients: web", "Clients: Mac", "**BFF**", "**Services**", "**Workers**"].map((t) => block.indexOf(t));
  assert.ok(order.every((n, i) => n >= 0 && (i === 0 || n > order[i - 1])), "tiers in the order of the data");
  assert.match(block, /\| Web \| !\[TypeScript\]\([^)]*\) \| \[r\]\(https:\/\/github\.com\/krizaka\/r\/tree\/HEAD\/apps\/web\) \|/);
  assert.match(block, /\| Mac \| !\[TypeScript\]\([^)]*\) !\[Rust\]/);
  assert.match(block, /\| Core \| !\[Java\][^|]*\|[^|]*\| <sub>Maven \(2\)<\/sub>/);
  assert.match(block, /krizaka-security 0\.7\.1 \(latest 0\.8\.0\)/);
  assert.match(block, /@krizaka\/ui 3\.80\.0 \(latest 3\.81\.0\)/);
  assert.match(block, /krizaka-tauri-kit 0\.3\.0 \(latest 0\.4\.0\)/);
  assert.match(block, /krizaka-worker-kit 0\.2\.0 \(latest 0\.3\.0\)/);
  assert.ok(!block.includes("@krizaka/own"), "a workspace package is not a dependency");
  assert.match(block, /Dev: up 1\.0\.0\+aaa/);
  assert.equal((block.match(/Prod: not open yet/g) ?? []).length, 1);
  assert.ok(!/Available/.test(block) && !/licen[cs]e|Apache|\bMIT\b/i.test(block) && !/maven central/i.test(block));
});

test("the real block lists every component of data with its tier heading", async () => {
  const model = await readModel(data, reader());
  const block = renderBlock(data, model);
  for (const name of ["Sovkora", "Verikora", "Folioviv"]) assert.ok(block.includes(`**${name}**`));
  assert.equal((block.match(/Prod: not open yet/g) ?? []).length, 3);
  for (const id of data.order) for (const c of data.products[id].components) assert.ok(block.includes(`| ${c.label} |`), c.label);
});

test("a package missing on npm is the repository's own and is left out; an unreachable registry is shown as unknown", async () => {
  const model = await readModel(fixtureData, reader({ npm: { "@krizaka/ui": { missing: true } } }));
  assert.equal(model.products[0].components[0].modules.npm.length, 0);
  const model2 = await readModel(fixtureData, reader({ npm: { "@krizaka/ui": {} } }));
  assert.equal(model2.products[0].components[0].modules.npm[0].latest, null);
  assert.match(renderProduct(fixtureData, model2.products[0]), /-lightgrey\)/);
});

test("replaceBlock rewrites only the marked block and the committed README has its markers", () => {
  const next = replaceBlock(readme, `<!-- generated:start -->\nX\n${END}`);
  assert.ok(next.includes("X"));
  const outside = (r) => r.slice(0, r.indexOf("<!-- generated:start")) + r.slice(r.indexOf(END) + END.length);
  assert.equal(outside(next), outside(readme));
  assert.throws(() => replaceBlock("no markers", "x"), /markers/);
});
