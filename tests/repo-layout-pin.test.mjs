import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// 2026-10-29 (#427): the consumers' pins moved to the repo-layout fix, but the reusable workflows still called the action at an older
// commit of this repository, so every format PR stayed red on the layout check. The action is one source: one commit everywhere.
test("every reusable workflow and action calls krizaka/.github's repo-layout at the same commit", () => {
  const pins = new Map();
  for (const dir of [".github/workflows", "actions"]) {
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.ya?ml$/.test(e.name)) {
          for (const m of readFileSync(p, "utf8").matchAll(/krizaka\/\.github\/actions\/repo-layout@([0-9a-f]{40})/g)) pins.set(m[1], [...(pins.get(m[1]) ?? []), p]);
        }
      }
    };
    walk(dir);
  }
  assert.ok(pins.size > 0, "the reusable workflows call the repo-layout action");
  assert.equal(pins.size, 1, `repo-layout is pinned at ${pins.size} different commits: ${[...pins.keys()].map((k) => k.slice(0, 8)).join(", ")}`);
});
