// Guard (krizaka-internal#1999): no workflow or script of this repository opens an issue in the repository it runs in.
// Our issues live in the private krizaka-internal; the daily « Public issues conformance » was red with 40 issues opened
// by the alert workflows (SEO family, post-deploy, journeys) and the weekly conformance run, each in a public repository.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const files = [
  ...readdirSync(new URL("../.github/workflows/", import.meta.url)).map((f) => `.github/workflows/${f}`),
  ...readdirSync(new URL("../scripts/", import.meta.url)).filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs")).map((f) => `scripts/${f}`),
];

// An issue created (CLI or REST) on the running repository or on a repository taken from a variable.
const SELF = [
  /gh\s+issue\s+create(?![^\n]*krizaka\/krizaka-internal)/,
  /gh\s+api\s+"?repos\/\$\{?GITHUB_REPOSITORY\}?\/issues"?\s+-[fF]/,
  /gh\s+api\s+"?repos\/\$\{\{\s*github\.repository\s*\}\}\/issues"?\s+-[fF]/,
  /POST[^\n]*`\/repos\/krizaka\/\$\{step\.repo\}\/issues`/,
  /issues\.create\(\s*\{(?![^}]*repo:\s*["']krizaka-internal["'])/,
];

test("no workflow or script opens an issue in the repository it runs in", () => {
  const bad = [];
  for (const f of files) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const re of SELF) if (re.test(text)) bad.push(`${f}: ${re}`);
  }
  assert.deepEqual(bad, [], "open the issue in krizaka/krizaka-internal (app token, title `<repo> · <type>(<scope>): …`, repo:/lane:/type: labels)");
});
