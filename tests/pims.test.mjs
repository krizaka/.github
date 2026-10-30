import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const rec = JSON.parse(readFileSync("docs/privacy/pims/records-of-processing.json", "utf8"));

test("every product has a record with the fields Law 25 and 27701 need", () => {
  assert.deepEqual(rec.products.map((p) => p.id).sort(), ["akinaza", "orazaka", "yomizaka"]);
  for (const p of rec.products) {
    for (const k of ["purposes", "categories", "persons", "suppliers"]) assert.ok(Array.isArray(p[k]) && p[k].length, `${p.id}.${k}`);
    for (const k of ["retention", "transfers", "rights", "pia"]) assert.ok(typeof p[k] === "string" && p[k], `${p.id}.${k}`);
    assert.ok(p.role.every((r) => ["controller", "processor"].includes(r)) && p.role.length);
    assert.ok(existsSync(`docs/privacy/pims/${p.rights}`), `${p.id}: workflow file exists`);
  }
});

test("the rights workflow states the 30-day deadline", () => {
  assert.match(readFileSync("docs/privacy/pims/rights-requests.md", "utf8"), /Within 30 days/);
});

test("the feature-request template asks the privacy-by-design question", () => {
  assert.match(readFileSync(".github/ISSUE_TEMPLATE/feature_request.yml", "utf8"), /id: privacy[\s\S]*required: true/);
});
