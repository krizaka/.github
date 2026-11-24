// No code name is left in the repository (krizaka-internal#2693, #4284): the products carry their commercial names
// (docs/standards/renames-2026-11-06.md). The terms, their forms and the history paths that may keep an old name are
// the list, standards/code-names.json, read through scripts/code-names/lib.mjs; this test holds no pattern of its own.
// CODE_NAMES_REF=<tree-ish> checks another commit (how the test is proven red on main).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findHits, loadList, isHistory } from "../scripts/code-names/lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = ".github";
const list = loadList();
const ref = process.env.CODE_NAMES_REF;

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  return r.stdout;
}

/** The files that contain a term as a plain substring (git narrows the search; the list decides what is a hit). */
function candidateFiles() {
  const terms = list.terms.flatMap((t) => ["-e", t.term]);
  const prefix = ref ? `${ref}:` : "";
  const out = git(["grep", "-lIiF", ...terms, ...(ref ? [ref] : []), "--", "."]);
  return out.split("\n").filter(Boolean).map((f) => f.slice(prefix.length));
}

const contentOf = (file) => (ref ? git(["show", `${ref}:${file}`]) : readFileSync(resolve(ROOT, file), "utf8"));
const namingFiles = (files) => files.filter((f) => findHits(contentOf(f), f, { list }).length || findHits(f, f, { list }).length);

test("no file names a code name outside the history paths of the list", () => {
  const offenders = namingFiles(candidateFiles().filter((f) => !isHistory(f, { list, repo: REPO })));
  assert.deepEqual(offenders, [], "use the commercial name (docs/standards/renames-2026-11-06.md)");
});

test("every scoped history path of this repository still needs its exemption", () => {
  const present = new Set(candidateFiles());
  const scoped = list.history.filter((e) => e.startsWith(`${REPO}:`)).map((e) => e.slice(REPO.length + 1));
  for (const file of scoped) assert.ok(present.has(file), `${file} no longer names a code name: remove it from history in standards/code-names.json`);
});
