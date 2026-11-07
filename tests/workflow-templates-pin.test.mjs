// The org requires every action and reusable workflow pinned to a full commit SHA (Actions policy `sha_pinning_required`,
// turned on 2026-11-06, krizaka-internal#2801). A starter workflow in workflow-templates/ is copied into a new repository as is,
// so a template that says `@main` would hand that repository a workflow the policy refuses. scripts/pin-supply-chain.mjs pins
// and refreshes this folder; this test keeps it pinned.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = "workflow-templates";
const FULL_SHA = /^[0-9a-f]{40}$/;

/** The `owner/repo...@ref` of every live `uses:` line of a YAML text (comments and local `./` actions skipped). */
export function usesRefs(text) {
  const refs = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim().replace(/^-\s+/, "");
    if (!trimmed.startsWith("uses:")) continue;
    const target = trimmed.slice("uses:".length).trim().split(/\s/)[0];
    if (!target.startsWith("./")) refs.push(target);
  }
  return refs;
}

test("usesRefs reads live uses lines only", () => {
  const text = "# uses: a/b@main\n    - uses: a/b@v1\n    uses: ./local\n    uses: c/d@" + "a".repeat(40) + " # main\n";
  assert.deepEqual(usesRefs(text), ["a/b@v1", `c/d@${"a".repeat(40)}`]);
});

test("every starter workflow pins a full commit SHA", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  assert.ok(files.length > 0, "the templates folder is read");
  for (const f of files)
    for (const ref of usesRefs(readFileSync(`${DIR}/${f}`, "utf8")))
      assert.match(ref.split("@")[1] ?? "", FULL_SHA, `${DIR}/${f}: ${ref} is not pinned to a full SHA`);
});
