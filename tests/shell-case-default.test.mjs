// SonarCloud githubactions:S131 turned the org's main gate red: every shell `case` in a workflow or action needs a
// default branch (`*) ;;`). The scripts are read as text; `case … in` and `esac` are matched as a stack.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const FILES = [
  ...readdirSync(".github/workflows").filter((f) => f.endsWith(".yml")).map((f) => `.github/workflows/${f}`),
  ...readdirSync("actions", { recursive: true }).filter((f) => String(f).endsWith("action.yml")).map((f) => `actions/${f}`),
];

export function casesWithoutDefault(text) {
  const missing = [];
  const stack = [];
  text.split("\n").forEach((line, i) => {
    if (/^\s*#/.test(line)) return;
    for (const m of line.matchAll(/\bcase\s+\S+\s+in\b|\besac\b|(?:^|[\s;|])\*\)/g)) {
      if (m[0].startsWith("case")) stack.push({ line: i + 1, hasDefault: false });
      else if (m[0] === "esac") {
        const c = stack.pop();
        if (c && !c.hasDefault) missing.push(c.line);
      } else if (stack.length > 0) stack.at(-1).hasDefault = true;
    }
  });
  return missing;
}

test("the detector sees a case without a default, also nested", () => {
  assert.deepEqual(casesWithoutDefault('case "$A" in a) ;; esac'), [1]);
  assert.deepEqual(casesWithoutDefault('case "$A" in a) ;; *) ;; esac'), []);
  assert.deepEqual(casesWithoutDefault('case "$A" in a) case "$B" in b) ;; *) ;; esac ;; esac'), [1]);
  assert.deepEqual(casesWithoutDefault('case "$A" in a) case "$B" in b) ;; *) ;; esac ;; *) ;; esac'), []);
});

test("every shell case of the org workflows and actions has a default branch", () => {
  for (const file of FILES) {
    assert.deepEqual(casesWithoutDefault(readFileSync(file, "utf8")), [], `${file}: case without « *) »`);
  }
});
