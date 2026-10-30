// A job of a reusable workflow that can be skipped (`if:`) must have a literal name: a skipped job never evaluates
// `${{ }}`, so its required check (« caller / Name ») never reports and the merge queue ejects the PR (2026-10-30,
// visual-regression.yml after .github#437). Matrix jobs are exempt (their names are per-leg).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = ".github/workflows";

/** The jobs of a workflow text: { id, name, hasIf, matrix } read from the 2-space `jobs:` children. */
export function jobsOf(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === "jobs:");
  if (start === -1) return [];
  const jobs = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line) && !line.startsWith("#")) break;
    const id = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (id) jobs.push({ id: id[1], name: null, hasIf: false, matrix: false });
    const cur = jobs.at(-1);
    if (!cur) continue;
    const name = /^ {4}name:\s*(.*)$/.exec(line);
    if (name) cur.name = name[1];
    if (/^ {4}if:/.test(line)) cur.hasIf = true;
    if (/^ {6}matrix:/.test(line)) cur.matrix = true;
  }
  return jobs;
}

export function expressionNamedSkippable(text) {
  return jobsOf(text)
    .filter((j) => j.hasIf && !j.matrix && j.name?.includes("${{"))
    .map((j) => j.id);
}

test("a skippable job of a reusable workflow has a literal name", () => {
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".yml"))) {
    const text = readFileSync(`${DIR}/${f}`, "utf8");
    if (!/^ {2}workflow_call:/m.test(text)) continue;
    assert.deepEqual(expressionNamedSkippable(text), [], `${f}: expression job name on a job that can be skipped`);
  }
});

test("the detector sees an expression name behind an if", () => {
  const bad = "jobs:\n  v:\n    if: ${{ x }}\n    name: ${{ a && 'b' || 'c' }}\n    runs-on: x\n";
  assert.deepEqual(expressionNamedSkippable(bad), ["v"]);
  assert.deepEqual(expressionNamedSkippable("jobs:\n  v:\n    if: ${{ x }}\n    name: Literal\n"), []);
});
