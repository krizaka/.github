import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateRow, validateRegister } from "../scripts/incident-register.mjs";

const drill = JSON.parse(readFileSync("docs/privacy/incident-register.drill.json", "utf8"));
const schema = JSON.parse(readFileSync("docs/privacy/incident-register.schema.json", "utf8"));

test("the drill row is valid and marked as a drill", () => {
  assert.deepEqual(validateRegister(drill), {});
  assert.equal(drill[0].drill, true);
});

test("the schema and the validator ask for the same required fields", () => {
  for (const k of schema.required) {
    const row = structuredClone(drill[0]);
    delete row[k];
    assert.ok(validateRow(row).length > 0, `missing ${k} must fail`);
  }
});

test("a serious risk needs a dated notice to the CAI and to the persons", () => {
  const row = { ...structuredClone(drill[0]), seriousInjuryRisk: true, drill: false };
  assert.equal(validateRow(row).length, 2);
  row.noticesSent = [{ to: "cai", on: "2026-10-27" }, { to: "persons", on: "2026-10-27" }];
  assert.deepEqual(validateRow(row), []);
});

test("the register is kept at least five years", () => {
  const row = { ...structuredClone(drill[0]), retainUntil: "2028-01-01" };
  assert.match(validateRow(row).join(), /five years/);
});

test("ids are unique", () => {
  assert.ok(validateRegister([drill[0], drill[0]])["INC-2026-001"].includes("duplicate id"));
});

test("the CLI path stays inside the working directory and is a .json file", async () => {
  const { safeRegisterPath } = await import("../scripts/incident-register.mjs");
  assert.match(safeRegisterPath("docs/privacy/incident-register.drill.json", "/work"), /drill\.json$/);
  assert.throws(() => safeRegisterPath("../etc/passwd.json", "/work"));
  assert.throws(() => safeRegisterPath("/etc/passwd", "/work"));
  assert.throws(() => safeRegisterPath("notes.txt", "/work"));
});

test("the notice templates only name fields the register has", () => {
  const schema = JSON.parse(readFileSync("docs/privacy/incident-register.schema.json", "utf8"));
  const notices = readFileSync("docs/privacy/incident-notices.md", "utf8");
  const table = notices.split("## 2.")[0];
  const named = [...table.matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1]).filter((f) => f !== "other");
  assert.ok(named.length >= 8, "the Commission table maps its elements to register fields");
  for (const f of named) assert.ok(f in schema.properties, `incident-notices.md names unknown field ${f}`);
});
