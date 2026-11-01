// A rule change reaches every repository (krizaka-internal#879): the matrix proves the bump happened, not only that the
// receiver exists. A repository is red when it still pins a family version older than one published more than the grace ago.
import test from "node:test";
import assert from "node:assert/strict";
import { baseVersion, compareVersions, npmPins, mavenPins, behind, versionsVerdict, renderVersions } from "../scripts/conformance-versions.mjs";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-01T00:00:00Z");

test("the base version of a range, null when it is not a plain one", () => {
  assert.equal(baseVersion("^0.19.0"), "0.19.0");
  assert.equal(baseVersion("~1.2.3"), "1.2.3");
  assert.equal(baseVersion("1.2.3"), "1.2.3");
  assert.equal(baseVersion(">=2.0.1"), "2.0.1");
  assert.equal(baseVersion("workspace:*"), null);
  assert.equal(baseVersion("latest"), null);
});

test("versions compare by number, not by text", () => {
  assert.ok(compareVersions("0.9.0", "0.20.0") < 0);
  assert.ok(compareVersions("1.0.0", "0.20.0") > 0);
  assert.equal(compareVersions("0.6.0", "0.6.0"), 0);
});

test("npm pins: the @krizaka/* ranges of every dependency field, never a workspace one", () => {
  const pkg = JSON.stringify({ dependencies: { "@krizaka/ui": "^3.74.0", react: "19.0.0" }, devDependencies: { "@krizaka/config": "^0.19.0", "@krizaka/db": "workspace:*" } });
  assert.deepEqual(npmPins(pkg), [
    { ecosystem: "npm", name: "@krizaka/config", have: "0.19.0" },
    { ecosystem: "npm", name: "@krizaka/ui", have: "3.74.0" },
  ]);
  assert.deepEqual(npmPins("not json"), []);
});

test("maven pins: krizaka-parent, the BOM through its property, and the family property", () => {
  const pom = `<project><parent><groupId>com.krizaka</groupId><artifactId>krizaka-parent</artifactId><version>0.3.3</version></parent>
    <properties><krizaka-build.version>0.3.3</krizaka-build.version></properties>
    <dependencyManagement><dependencies><dependency><groupId>com.krizaka</groupId><artifactId>krizaka-bom</artifactId><version>\${krizaka-build.version}</version></dependency></dependencies></dependencyManagement></project>`;
  assert.deepEqual(mavenPins(pom), [
    { ecosystem: "maven", name: "krizaka-bom", have: "0.3.3" },
    { ecosystem: "maven", name: "krizaka-parent", have: "0.3.3" },
  ]);
  assert.deepEqual(mavenPins("<project><properties><krizaka.version>0.5.0</krizaka.version></properties></project>"), [{ ecosystem: "maven", name: "krizaka-bom", have: "0.5.0" }]);
  assert.deepEqual(mavenPins("<project><parent><artifactId>krizaka-parent</artifactId><version>${project.version}</version></parent></project>"), []);
});

test("behind: only a newer version published longer ago than the grace counts", () => {
  const pins = [
    { ecosystem: "npm", name: "@krizaka/config", have: "0.19.0" },
    { ecosystem: "npm", name: "@krizaka/ui", have: "3.74.0" },
    { ecosystem: "npm", name: "@krizaka/icons", have: "1.0.0" },
  ];
  const latest = {
    "npm:@krizaka/config": { version: "0.20.0", publishedAt: new Date(NOW - 10 * DAY).toISOString() },
    "npm:@krizaka/ui": { version: "3.75.0", publishedAt: new Date(NOW - 1 * DAY).toISOString() },
    "npm:@krizaka/icons": { version: "1.0.0", publishedAt: new Date(NOW - 30 * DAY).toISOString() },
  };
  assert.deepEqual(behind(pins, latest, { now: NOW, graceDays: 7 }), [{ ecosystem: "npm", name: "@krizaka/config", have: "0.19.0", latest: "0.20.0", days: 10 }]);
});

test("behind counts from the first version after the pin, not from the latest", () => {
  const pins = [{ ecosystem: "npm", name: "@krizaka/config", have: "0.17.0" }];
  const at = (d) => new Date(NOW - d * DAY).toISOString();
  const latest = { "npm:@krizaka/config": { version: "0.20.0", publishedAt: at(1), times: { "0.17.0": at(9), "0.18.0": at(8), "0.19.0": at(4), "0.20.0": at(1), created: at(99) } } };
  assert.deepEqual(behind(pins, latest, { now: NOW, graceDays: 3 }), [{ ecosystem: "npm", name: "@krizaka/config", have: "0.17.0", latest: "0.20.0", days: 8 }]);
});

test("the verdict names what is behind; nothing pinned is green", () => {
  assert.deepEqual(versionsVerdict([]), { ok: true, why: "" });
  const v = versionsVerdict([{ name: "@krizaka/config", have: "0.19.0", latest: "0.20.0", days: 10 }]);
  assert.equal(v.ok, false);
  assert.match(v.why, /@krizaka\/config 0\.19\.0 < 0\.20\.0 \(published 10 days ago\)/);
});

test("the versions table: one row per repository, current or behind", () => {
  const md = renderVersions({ a: { pins: [{ name: "@krizaka/ui", have: "3.75.0" }], behind: [] }, b: { pins: [{ name: "krizaka-parent", have: "0.3.3" }], behind: [{ name: "krizaka-parent", have: "0.3.3", latest: "0.6.0", days: 9 }] } });
  assert.match(md, /\| a \| @krizaka\/ui 3\.75\.0 \| current \|/);
  assert.match(md, /\| b \| krizaka-parent 0\.3\.3 \| krizaka-parent 0\.3\.3 → 0\.6\.0 \|/);
});
