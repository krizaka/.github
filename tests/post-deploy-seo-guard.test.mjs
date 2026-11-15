// post-deploy.yml ran `seo/scripts/check-seo-family.mjs` from a sparse checkout of krizaka-com; krizaka-com#710 deleted that file
// (the guard ships in @krizaka/config as `krizaka-seo-family`), so every site's post-deploy check was red with « Cannot find module »
// (krizaka-internal#3709). The step runs the bin of an exact @krizaka/config version.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../.github/workflows/post-deploy.yml", import.meta.url), "utf8");

test("post-deploy: the SEO check no longer reads a script out of krizaka-com", () => {
  assert.doesNotMatch(text, /repository:\s*krizaka\/krizaka-com/);
  assert.doesNotMatch(text, /check-seo-family\.mjs\s+--base/);
});

test("post-deploy: the SEO check runs the krizaka-seo-family bin of an exact @krizaka/config version", () => {
  assert.match(text, /@krizaka\/config@\d+\.\d+\.\d+\s+krizaka-seo-family\b/);
  assert.doesNotMatch(text, /@krizaka\/config@(latest|next|\^|~)/);
});

test("post-deploy: the extra arguments still reach the guard", () => {
  assert.match(text, /krizaka-seo-family\s+--base "\$\{SITE\}" --host "\$\{SITE\}" "\$\{extra\[@\]\}"/);
});
