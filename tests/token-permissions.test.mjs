// OpenSSF Scorecard « Token-Permissions » (krizaka/.github, scorecard 5.9): one workflow with a job that has no
// `permissions:` and no top-level block sets the whole check to 0. Every workflow declares a top-level block that is
// never a write; the two reusable workflows below cannot (their release job takes the caller's grant) and are named here.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const DIR = new URL("../.github/workflows/", import.meta.url);
// File -> why it has no top-level block. A new entry needs a reason a reviewer accepts; the list only shrinks.
const NO_TOP_LEVEL = {
  "maven.yml": "release-github takes the caller's packages: write; a top-level block would cap it at read (403 on the 0.3.0 deploy)",
  "tauri-macos.yml": "release takes the caller's contents: write; a block (or a job-level write) makes pull-request callers fail at startup",
};

const files = readdirSync(DIR).filter((f) => f.endsWith(".yml"));

function topLevelPermissions(text) {
  const m = text.match(/^permissions:[ \t]*(.*)\n((?:[ \t]+.*\n|[ \t]*\n)*)/m);
  return m ? `${m[1]}\n${m[2]}`.trim() : null;
}

test("every workflow declares a top-level permissions block, but the named exceptions", () => {
  const missing = files.filter((f) => topLevelPermissions(readFileSync(new URL(f, DIR), "utf8")) === null);
  assert.deepEqual(missing.sort(), Object.keys(NO_TOP_LEVEL).sort());
});

test("no top-level block grants a write or write-all", () => {
  for (const f of files) {
    const block = topLevelPermissions(readFileSync(new URL(f, DIR), "utf8"));
    assert.doesNotMatch(block ?? "", /write/, `${f}: a top-level write reaches every job`);
  }
});
