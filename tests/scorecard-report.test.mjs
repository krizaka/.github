import assert from "node:assert/strict";
import { test } from "node:test";
import { renderTable } from "../scripts/scorecard-report.mjs";

test("renderTable lists every check, marks n/a and not-applicable, and summarises", () => {
  const md = renderTable([
    { name: "a", score: 6, checks: [{ name: "SAST", score: 10 }, { name: "Packaging", score: -1 }] },
    { name: "b", score: 8, checks: [{ name: "SAST", score: 6 }] },
    { name: "c" },
  ]);
  assert.match(md, /\| a \| 6 \| 10 \| – \|/);
  assert.match(md, /\| b \| 8 \| 6 \|  \|/);
  assert.match(md, /\| c \| n\/a \|/);
  assert.match(md, /Average 7\.00 over 2 scored repositories; lowest a \(6\)/);
});
