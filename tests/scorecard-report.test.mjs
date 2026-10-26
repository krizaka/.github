import assert from "node:assert/strict";
import { test } from "node:test";
import { isOrgLogin, renderTable } from "../scripts/scorecard-report.mjs";

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

test("isOrgLogin accepts a GitHub login and refuses options, paths and queries", () => {
  assert.equal(isOrgLogin("krizaka"), true);
  assert.equal(isOrgLogin("my-org"), true);
  for (const bad of ["--jq", "-x", "a/b", "../x", "a?b=1", "a b", "", "a--", "-a"]) assert.equal(isOrgLogin(bad), false, bad);
});
