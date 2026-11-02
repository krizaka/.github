import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  END, badgeUrl, collectKrizakaDeps, compareVersions, depBadge, envBadge, latestStable, pomProperty, readHealth, readModel, renderBlock, renderProduct, replaceBlock, statusLabel, versionOf,
} from "../scripts/profile-readme.mjs";

const data = JSON.parse(readFileSync(new URL("../profile/products.json", import.meta.url), "utf8"));
const readme = readFileSync(new URL("../profile/README.md", import.meta.url), "utf8");

// A reader that answers from tables: nothing here touches the network.
const reader = ({ health = {}, npm = {}, java = null, pom = "<krizaka.version>0.7.1</krizaka.version>", manifests = [{ dependencies: { "@krizaka/ui": "^3.80.0", "@krizaka/own": "1.0.0" }, name: "app" }, { name: "@krizaka/own" }] } = {}) => ({
  repoPackageJsons: async () => manifests,
  repoFile: async () => pom,
  npmLatest: async (n) => npm[n] ?? { version: "3.81.0" },
  githubMavenLatest: async () => java,
  health: async (host) => health[host] ?? { up: false },
  markHash: async () => "abc",
});

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

test("the block shows the commercial names, the environments, the dependencies and the Java BOM", async () => {
  const model = await readModel(data, reader({ health: { "www.orazaka.com": { up: true, version: "1.0.0+aaa" } }, java: "0.8.0" }));
  const block = renderBlock(data, model);
  for (const name of ["Sovkora", "Verikora", "Folioviv"]) assert.ok(block.includes(`**${name}**`));
  assert.equal((block.match(/Prod: not open yet/g) ?? []).length, 3);
  assert.match(block, /Dev: up 1\.0\.0\+aaa/);
  assert.match(block, /Dev: down/);
  assert.match(block, /com\.krizaka:krizaka-bom 0\.7\.1 \(latest 0\.8\.0\)/);
  assert.ok(!block.includes("@krizaka/own"), "a workspace package is not a dependency");
  assert.ok(!/Available/.test(block));
  assert.ok(!/licen[cs]e|Apache|\bMIT\b/i.test(block), "no licence is claimed for the products");
  assert.ok(!/maven central/i.test(block));
});

test("a package missing on npm is the repository's own and is left out; an unreachable registry is shown as unknown", async () => {
  const model = await readModel(data, reader({ npm: { "@krizaka/ui": { missing: true } } }));
  assert.equal(model.products[0].deps.length, 0);
  const model2 = await readModel(data, reader({ npm: { "@krizaka/ui": {} } }));
  assert.equal(model2.products[0].deps[0].latest, null);
  assert.match(renderProduct(data, model2.products[0]), /-lightgrey\)/);
});

test("replaceBlock rewrites only the marked block and the committed README has its markers", () => {
  const next = replaceBlock(readme, `<!-- generated:start -->\nX\n${END}`);
  assert.ok(next.includes("X"));
  const outside = (r) => r.slice(0, r.indexOf("<!-- generated:start")) + r.slice(r.indexOf(END) + END.length);
  assert.equal(outside(next), outside(readme));
  assert.throws(() => replaceBlock("no markers", "x"), /markers/);
});
