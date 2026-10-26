import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const soa = JSON.parse(readFileSync("docs/security/isms/soa.json", "utf8"));
const risks = JSON.parse(readFileSync("docs/security/isms/risk-register.json", "utf8"));
const STATUS = ["applied", "partial", "gap", "excluded"];
import { existsSync } from "node:fs";
const suppliers = JSON.parse(readFileSync("docs/security/isms/supplier-register.json", "utf8"));
const assets = JSON.parse(readFileSync("docs/security/isms/asset-inventory.json", "utf8"));
const records = JSON.parse(readFileSync("docs/privacy/pims/records-of-processing.json", "utf8"));

test("the SoA lists the 93 controls of Annex A 2022", () => {
  const by = (t) => soa.controls.filter((c) => c.theme === t).length;
  assert.deepEqual([by("organizational"), by("people"), by("physical"), by("technological")], [37, 8, 14, 34]);
  assert.equal(new Set(soa.controls.map((c) => c.id)).size, 93);
});

test("every control has a status, an owner, and the evidence its status needs", () => {
  for (const c of soa.controls) {
    assert.ok(STATUS.includes(c.status), `${c.id}: status`);
    assert.ok(c.owner, `${c.id}: owner`);
    if (c.status !== "gap") assert.ok(c.evidence, `${c.id}: ${c.status} needs evidence or a reason`);
    if (["partial", "gap"].includes(c.status)) assert.ok(c.plan, `${c.id}: ${c.status} needs a plan`);
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

test("the gap analysis is done: no control is left unassessed", () => {
  assert.deepEqual(soa.controls.filter((c) => !STATUS.includes(c.status)).map((c) => c.id), []);
});

test("the readiness never claims a certification", () => {
  for (const f of ["README.md", "security-policy.md", "continuity.md", "access-control.md"]) {
    const text = readFileSync(`docs/security/isms/${f}`, "utf8").toLowerCase();
    assert.ok(!/\b(we are|krizaka is) (iso[^ ]* )?(certified|compliant)\b/.test(text), `${f} claims a certification`);
  }
});

test("every supplier category the records name is in the supplier register, with its terms status", () => {
  const known = new Set(suppliers.suppliers.flatMap((s) => s.categories));
  for (const p of records.products) for (const c of p.suppliers ?? []) assert.ok(known.has(c), `${p.id}: supplier category ${c} missing`);
  for (const s of suppliers.suppliers) {
    assert.ok(["to-collect", "on-file", "not-needed"].includes(s.dpa), `${s.id}: dpa`);
    if (s.personalInformation) assert.notEqual(s.dpa, "not-needed", `${s.id} holds personal information`);
    assert.ok(s.region, `${s.id}: region`);
  }
});

test("the asset inventory points to sources that exist", () => {
  for (const a of assets.classes) {
    assert.ok(a.owner && a.classification, `${a.id}: owner and classification`);
    const local = a.source.split(" ")[0];
    if (!local.startsWith("krizaka/") && !local.startsWith("private")) assert.ok(existsSync(local), `${a.id}: ${local} missing`);
  }
});
