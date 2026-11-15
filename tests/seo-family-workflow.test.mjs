// seo-family.yml sparse-checked `scripts/check-seo-family.mjs` out of krizaka-com; the guard ships in @krizaka/config as
// `krizaka-seo-family` (krizaka-internal#3709). The step runs the bin of an exact version, and no workflow of this repository
// may take that script from another repository again.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("../.github/workflows/", import.meta.url);
const workflows = readdirSync(dir).filter((n) => /\.ya?ml$/.test(n)).map((n) => [n, readFileSync(new URL(n, dir), "utf8")]);

test("seo-family: runs the krizaka-seo-family bin of an exact @krizaka/config version", () => {
  const text = readFileSync(new URL("seo-family.yml", dir), "utf8");
  assert.match(text, /@krizaka\/config@\d+\.\d+\.\d+\s+krizaka-seo-family\s+--base "https:\/\/\$\{HOST\}" --host "https:\/\/\$\{HOST\}" "\$\{extra\[@\]\}"/);
  assert.doesNotMatch(text, /@krizaka\/config@(latest|next|\^|~)/);
});

test("no workflow sparse-checks check-seo-family out of another repository", () => {
  for (const [name, text] of workflows) {
    assert.doesNotMatch(text, /sparse-checkout:[^\n]*check-seo-family/, `${name} sparse-checks the SEO guard`);
    assert.doesNotMatch(text, /node\s+\S*check-seo-family\.mjs/, `${name} runs a local copy of the SEO guard`);
  }
});
