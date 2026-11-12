// No code name is left in the repository (krizaka-internal#2693): the products carry their commercial names
// (docs/standards/renames-2026-11-06.md). Only the history and the rename machinery may name the old ones.
// CODE_NAMES_REF=<tree-ish> checks another commit (how the test is proven red on main).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PATTERN = "orazaka|yomizaka|akinaza|kachizaka";
const SELF = "tests/code-names.test.mjs";

/** Files that may keep an old name, each with the reason. */
export const ALLOWED = new Map([
  ["docs/standards/renames-2026-11-06.md", "the historic old -> new table"],
  ["scripts/repository-names.test.mjs", "names the old names to prove they are reported"],
  ["scripts/commit-identities.json", "old -> new bot logins, to recognise historic commits"],
  ["tests/check-trailers.test.mjs", "historic bot identities in old commits must still be recognised"],
  [SELF, "this guard"],
  ["profile/README.md", "generated from the consumers' package.json files, which still depend on the old npm package names"],
]);

const isAllowed = (file) => ALLOWED.has(file) || /(^|\/)CHANGELOG[^/]*\.md$/i.test(file);

function filesNamingACodeName(ref) {
  const args = ["grep", "-liE", PATTERN, ...(ref ? [ref] : []), "--", "."];
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  const prefix = ref ? `${ref}:` : "";
  return r.stdout.split("\n").filter(Boolean).map((f) => f.slice(prefix.length));
}

test("no file names a code name outside the history allow-list", () => {
  const offenders = filesNamingACodeName(process.env.CODE_NAMES_REF).filter((f) => !isAllowed(f));
  assert.deepEqual(offenders, [], "use the commercial name (docs/standards/renames-2026-11-06.md)");
});

test("every allowed file still needs its exemption", () => {
  const present = new Set(filesNamingACodeName(process.env.CODE_NAMES_REF));
  for (const file of ALLOWED.keys()) if (file !== SELF) assert.ok(present.has(file), `${file} no longer names a code name: remove it from ALLOWED`);
});
