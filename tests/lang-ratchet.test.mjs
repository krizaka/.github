import { test } from "node:test";
import assert from "node:assert/strict";
import { countRuff, countClippy, countPyright, compare } from "../scripts/lang-ratchet.mjs";

test("ruff findings are counted per rule code", () => {
  const out = countRuff(JSON.stringify([{ code: "S101" }, { code: "S101" }, { code: "B006" }, { code: null }]));
  assert.deepEqual(out, { "ruff:S101": 2, "ruff:B006": 1, "ruff:syntax": 1 });
});

test("clippy counts warnings and errors of compiler messages only", () => {
  const lines = [
    JSON.stringify({ reason: "compiler-message", message: { level: "warning", code: { code: "clippy::unwrap_used" } } }),
    JSON.stringify({ reason: "compiler-message", message: { level: "warning", code: { code: "clippy::unwrap_used" } } }),
    JSON.stringify({ reason: "compiler-message", message: { level: "note", code: { code: "clippy::x" } } }),
    JSON.stringify({ reason: "build-finished", success: true }),
    "not json",
  ].join("\n");
  assert.deepEqual(countClippy(lines), { "clippy:clippy::unwrap_used": 2 });
});

test("pyright counts errors per rule", () => {
  const out = countPyright(JSON.stringify({ generalDiagnostics: [{ severity: "error", rule: "reportOptionalMemberAccess" }, { severity: "warning", rule: "x" }] }));
  assert.deepEqual(out, { "pyright:reportOptionalMemberAccess": 1 });
});

test("a count above its baseline fails, an unrecorded rule must be zero", () => {
  const { failures } = compare({ "ruff:S101": 2 }, { "ruff:S101": 3, "ruff:B006": 1 });
  assert.deepEqual(failures, ["ruff:S101: 3 > 2", "ruff:B006: 1 > 0"]);
});

test("update lowers a count and never raises one", () => {
  const { failures, next } = compare({ "ruff:S101": 5, "ruff:E501": 1 }, { "ruff:S101": 3, "ruff:E501": 4 });
  assert.equal(next["ruff:S101"], 3);
  assert.equal(next["ruff:E501"], 1);
  assert.equal(failures.length, 1);
});
