import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

// GitHub validates `with:` against the pinned commit before any job starts: an input the pinned commit does not declare is a
// startup_failure, with no job and no log, in every repository that calls the workflow (krizaka/.github#595). An input therefore
// lands first in the called workflow, then the pin moves. Needs the pinned commit: CI's shallow checkout returns early.
const root = new URL("..", import.meta.url).pathname;
const dir = `${root}.github/workflows/`;
const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Each call of a pinned first-party workflow: { file, called, sha, keys }, `keys` being the names under its `with:`. */
export function pinnedCalls(file, text) {
  const calls = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const m = /^(\s*)uses: krizaka\/\.github\/\.github\/workflows\/([\w.-]+)@([0-9a-f]{40})/.exec(line);
    if (!m) return;
    const keys = [];
    const withAt = lines[i + 1]?.trim() === "with:" ? i + 2 : -1;
    for (let j = withAt; j > 0 && lines[j].startsWith(`${m[1]}  `); j++) {
      const key = new RegExp(`^${m[1]}  ([\\w-]+):`).exec(lines[j]);
      if (key) keys.push(key[1]);
    }
    calls.push({ file, called: m[2], sha: m[3], keys });
  });
  return calls;
}

/** The input names a workflow declares under `on.workflow_call.inputs`. */
export function declaredInputs(text) {
  const block = /^ {4}inputs:\n((?: {6}.*\n| *\n)*)/m.exec(text.slice(text.indexOf("workflow_call:")))?.[1] ?? "";
  return [...block.matchAll(/^ {6}([\w-]+):\s*$/gm)].map((m) => m[1]);
}

test("the parser reads the keys of a call and the inputs of a workflow", () => {
  const sha = "a".repeat(40);
  const call = `    uses: krizaka/.github/.github/workflows/x.yml@${sha} # main\n    with:\n      one: 1\n      two-b: \${{ inputs.b }}\n\n  next:\n`;
  assert.deepEqual(pinnedCalls("f", call), [{ file: "f", called: "x.yml", sha, keys: ["one", "two-b"] }]);
  assert.deepEqual(declaredInputs('on:\n  workflow_call:\n    inputs:\n      one:\n        type: string\n      two-b:\n        default: ""\n    outputs:\n      three:\n'), ["one", "two-b"]);
});

test("every input passed to a pinned workflow exists at that pin", (t) => {
  if (git(["rev-parse", "--is-shallow-repository"]) === "true") return t.skip("needs the history");
  const calls = readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => pinnedCalls(f, readFileSync(dir + f, "utf8")));
  assert.ok(calls.length > 0);
  for (const { file, called, sha, keys } of calls) {
    const inputs = declaredInputs(git(["show", `${sha}:.github/workflows/${called}`]));
    for (const key of keys) assert.ok(inputs.includes(key), `${file} passes \`${key}\` to ${called}@${sha.slice(0, 8)}, which does not declare it: land the input first, then move the pin`);
  }
});
