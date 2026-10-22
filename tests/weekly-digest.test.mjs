import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bulletsOf, renderDigest, weekLabel } from "../scripts/weekly-digest.mjs";

const BODY = "## English\n\nNew: 1.\n\n- feat: Reads a lease. https://github.com/krizaka/yomizaka/pull/1\n\n## Français\n\nNouveautés : 1.\n\n- feat: Lit un bail. https://github.com/krizaka/yomizaka/pull/1\n";

test("weekLabel is the ISO week", () => {
  assert.equal(weekLabel(new Date("2026-10-26T07:00:00Z")), "2026-W44");
  assert.equal(weekLabel(new Date("2027-01-03T07:00:00Z")), "2026-W53");
});

test("bulletsOf reads one language's section, or every bullet of a body without sections", () => {
  assert.deepEqual(bulletsOf(BODY, "Français"), ["- feat: Lit un bail. https://github.com/krizaka/yomizaka/pull/1"]);
  assert.deepEqual(bulletsOf("- fix: a\n- fix: b", "English"), ["- fix: a", "- fix: b"]);
  assert.deepEqual(bulletsOf(null, "English"), []);
});

test("renderDigest groups by product, each language with its own lines; an empty week says so", () => {
  const md = renderDigest([{ product: "Yomizaka", tag: "yomizaka 2026.10.22.1", url: "https://example.test/r", body: BODY }]);
  assert.match(md, /## Cette semaine chez Krizaka\n\n### Yomizaka[\s\S]*Lit un bail[\s\S]*## This week at Krizaka[\s\S]*Reads a lease/);
  assert.match(renderDigest([]), /Aucune livraison cette semaine\.[\s\S]*No release this week\./);
});

test("release-repos.json lists each repository once", () => {
  const { products } = JSON.parse(readFileSync(new URL("../release-repos.json", import.meta.url), "utf8"));
  const repos = products.flatMap((p) => p.repos);
  assert.equal(new Set(repos).size, repos.length);
  assert.ok(products.some((p) => p.id === "orazaka" && p.repos.includes("orazaka-web-client")));
});
