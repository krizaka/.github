import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const soa = JSON.parse(readFileSync("docs/security/isms/soa.json", "utf8"));
const risks = JSON.parse(readFileSync("docs/security/isms/risk-register.json", "utf8"));
const STATUS = ["applied", "partial", "excluded", "to-assess"];

test("the SoA lists the 93 controls of Annex A 2022", () => {
  const by = (t) => soa.controls.filter((c) => c.theme === t).length;
  assert.deepEqual([by("organizational"), by("people"), by("physical"), by("technological")], [37, 8, 14, 34]);
  assert.equal(new Set(soa.controls.map((c) => c.id)).size, 93);
});

test("every control has a status, an owner, and the evidence its status needs", () => {
  for (const c of soa.controls) {
    assert.ok(STATUS.includes(c.status), `${c.id}: status`);
    assert.ok(c.owner, `${c.id}: owner`);
    if (c.status !== "to-assess") assert.ok(c.evidence, `${c.id}: ${c.status} needs evidence or a reason`);
  }
});

test("risks reference known controls and have valid scores", () => {
  const ids = new Set(soa.controls.map((c) => c.id));
  for (const r of risks.risks) {
    for (const k of ["likelihood", "impact"]) assert.ok(r[k] >= 1 && r[k] <= 5, `${r.id}: ${k}`);
    assert.ok(["reduce", "accept", "transfer", "avoid"].includes(r.treatment), `${r.id}: treatment`);
    for (const c of r.controls) assert.ok(ids.has(c), `${r.id}: unknown control ${c}`);
  }
});
