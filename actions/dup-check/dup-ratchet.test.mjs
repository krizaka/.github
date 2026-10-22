import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, nextBaseline, topClones, run } from "./dup-ratchet.mjs";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("evaluate: an increase fails, equal passes, lower passes and says to tighten, no baseline fails", () => {
  assert.equal(evaluate(11, 10).ok, false);
  assert.match(evaluate(11, 10).reason, /may only go down/);
  assert.deepEqual([evaluate(10, 10).ok, evaluate(10, 10).lower], [true, false]);
  assert.deepEqual([evaluate(7, 10).ok, evaluate(7, 10).lower], [true, true]);
  assert.equal(evaluate(0, null).ok, false);
  assert.match(evaluate(0, null).reason, /--update/);
});

test("nextBaseline never raises the count", () => {
  assert.equal(nextBaseline(12, 10), 10);
  assert.equal(nextBaseline(7, 10), 7);
  assert.equal(nextBaseline(7, null), 7);
});

test("topClones: the biggest first, readable locations", () => {
  const report = {
    duplicates: [
      { lines: 9, firstFile: { name: "a.ts", startLoc: { line: 1 }, endLoc: { line: 10 } }, secondFile: { name: "b.ts", startLoc: { line: 5 }, endLoc: { line: 14 } } },
      { lines: 30, firstFile: { name: "c.ts", startLoc: { line: 1 }, endLoc: { line: 31 } }, secondFile: { name: "d.ts", startLoc: { line: 2 }, endLoc: { line: 32 } } },
    ],
  };
  const top = topClones(report, 1);
  assert.equal(top.length, 1);
  assert.deepEqual(top[0], { lines: 30, a: "c.ts:1-31", b: "d.ts:2-32" });
});

test("run: counts through the detector, refuses a rise, never raises on --update (detector stubbed)", () => {
  const cwd = mkdtempSync(join(tmpdir(), "dup-"));
  const report = (lines) => ({ statistics: { total: { duplicatedLines: lines, percentage: 1.5, lines: 1000, clones: 2 } }, duplicates: [] });
  const stub = (lines) => (cmd, args) => {
    const out = args[args.indexOf("--output") + 1];
    writeFileSync(join(out, "jscpd-report.json"), JSON.stringify(report(lines)));
  };
  const log = () => {};
  assert.equal(run(["--update"], { cwd, exec: stub(40), log }), 0);
  assert.equal(JSON.parse(readFileSync(join(cwd, "dup-ratchet.json"), "utf8")).duplicatedLines, 40);
  assert.equal(run([], { cwd, exec: stub(40), log }), 0);
  assert.equal(run([], { cwd, exec: stub(41), log }), 1, "a rise is refused");
  assert.equal(run(["--update"], { cwd, exec: stub(55), log }), 0);
  assert.equal(JSON.parse(readFileSync(join(cwd, "dup-ratchet.json"), "utf8")).duplicatedLines, 40, "--update never raises");
  assert.equal(run(["--update"], { cwd, exec: stub(12), log }), 0);
  assert.equal(JSON.parse(readFileSync(join(cwd, "dup-ratchet.json"), "utf8")).duplicatedLines, 12);
});
