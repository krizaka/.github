import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { END, collectProducts, renderProducts, replaceBlock, withHeroVersion } from "../scripts/profile-products.mjs";

const knowhow = JSON.parse(readFileSync(new URL("../profile/knowhow.json", import.meta.url), "utf8"));
const site = (id, status, extra = {}) => ({ id, name: id[0].toUpperCase() + id.slice(1), url: `https://dev.${id}.com`, kind: "product", status, repo: `https://github.com/krizaka/${id}`, ...extra });
const sites = [
  { id: "krizaka", name: "Krizaka", url: "https://www.krizaka.com", kind: "company", status: "released" },
  site("orazaka", "released"),
  site("orochia", "released"),
  site("yasakia", "development"),
  site("yororis", "construction"),
  site("kachizaka", "development"),
  site("akinaza", "development"),
  site("yomizaka", "development"),
  { id: "ui", name: "Krizaka UI", url: "https://ui.krizaka.com", kind: "open-source", status: "released" },
];

test("products only, in the know-how order, with their status in words", () => {
  const p = collectProducts({ sites, knowhow });
  assert.deepEqual(p.map((x) => x.id), ["orazaka", "orochia", "yasakia", "yororis", "yomizaka", "kachizaka", "akinaza"]);
  assert.deepEqual(p.map((x) => x.status), ["Dev preview", "Dev preview", "In development", "Under construction", "In development", "In development", "In development"]);
});

test("a product the package does not know yet comes from its fallback; once known, the package wins", () => {
  const withFallback = { ...knowhow, products: { ...knowhow.products, yomizaka: { fallback: { name: "Yomizaka", url: "https://dev.yomizaka.com", repo: "https://github.com/krizaka/yomizaka", status: "upcoming" } } } };
  const without = sites.filter((s) => s.id !== "yomizaka");
  assert.equal(collectProducts({ sites: without, knowhow: withFallback }).find((x) => x.id === "yomizaka").url, "https://dev.yomizaka.com");
  assert.equal(collectProducts({ sites: [...without, site("yomizaka", "development", { url: "https://yomizaka.example" })], knowhow: withFallback }).find((x) => x.id === "yomizaka").url, "https://yomizaka.example");
});

test("a brand-new product appears with the package's own one-line description", () => {
  const p = collectProducts({ sites: [...sites, site("zorakia", "upcoming")], descriptions: { zorakia: "A new thing." }, knowhow });
  const z = p.at(-1);
  assert.equal(z.id, "zorakia");
  assert.equal(z.line, "A new thing.");
    assert.match(renderProducts(p), /\*\*Zorakia\*\* &nbsp;<sup>Coming soon<\/sup><br>A new thing\./);
});

test("no dead link: a missing repository or mark is left out", () => {
  const md = renderProducts(collectProducts({ sites, knowhow }), { repos: (r) => !r.endsWith("/yomizaka"), marks: (id) => id !== "yomizaka" });
  assert.ok(!md.includes("github.com/krizaka/yomizaka"));
  assert.ok(md.includes("github.com/krizaka/orazaka"));
  assert.ok(!md.includes("brand/yomizaka/"));
  assert.ok(md.includes("dev.yomizaka.com"));
});

test("a product with a dev site shows the site and the repository, each once; one without shows its repository once", () => {
  const md = renderProducts(collectProducts({ sites, knowhow }));
  const row = md.split("<tr>").find((r) => r.includes("**Kachizaka**"));
  assert.match(row, /\[dev\.kachizaka\.com\]\(https:\/\/dev\.kachizaka\.com\) · \[Repository\]\(https:\/\/github\.com\/krizaka\/kachizaka\)/);
  assert.ok(row.includes("brand/kachizaka/mark-dark.svg"));
  const noSite = collectProducts({ sites: sites.map((x) => (x.id === "akinaza" ? { ...x, url: x.repo } : x)), knowhow });
  const r2 = renderProducts(noSite).split("<tr>").find((r) => r.includes("**Akinaza**"));
  assert.equal(r2.split("github.com/krizaka/akinaza)").length - 1, 1);
  assert.ok(!renderProducts(noSite, { marks: (id) => id !== "akinaza" }).includes("brand/akinaza/"));
});

test("the marks carry the @krizaka/ui version, so GitHub's image cache refreshes with a release", () => {
  const md = renderProducts(collectProducts({ sites, knowhow }), { version: "3.28.0" });
  assert.ok(md.includes("brand/orazaka/mark-dark.svg?v=3.28.0") && md.includes("brand/akinaza/mark-light.svg?v=3.28.0"));
  assert.ok(!renderProducts(collectProducts({ sites, knowhow })).includes("?v="));
  const hero = '<img src="https://krizaka-assets.b-cdn.net/brand/krizaka/mark-light.svg?v=1.0.0">';
  assert.equal(withHeroVersion(hero, "3.28.0"), hero.replace("1.0.0", "3.28.0"));
  assert.equal(withHeroVersion(withHeroVersion(hero, "3.28.0"), "3.28.0"), withHeroVersion(hero, "3.28.0"));
});

test("the READMEs wear no mark that is stored in the repository: the marks are the export of @krizaka/ui", () => {
  for (const f of ["../README.md", "../profile/README.md", "../profile/MEMBER_README.md"]) {
    const text = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/profile\/assets|srcset="assets\//.test(text), f);
    assert.ok(text.includes("brand/krizaka/mark-"), f);
  }
});

test("no hard-coded version and no word the Yororis lexicon refuses", () => {
  const md = renderProducts(collectProducts({ sites, knowhow }));
  assert.ok(!/\b\d+\.\d+\.\d+\b/.test(md));
  assert.ok(!/thérap|therap|psy|coming soon.*yororis|beta|waiting list/i.test(md.split("Yororis")[1]?.split("</tr>")[0] ?? ""));
  assert.match(md, /Under construction/);
});

test("replaceBlock rewrites only the section and is idempotent", () => {
  const block = renderProducts(collectProducts({ sites, knowhow }));
  const readme = `# Hi\n\n<!-- products:start old -->\nold\n${END}\n\nfooter\n`;
  const once = replaceBlock(readme, block);
  assert.ok(once.startsWith("# Hi\n") && once.endsWith("\n\nfooter\n"));
  assert.equal(replaceBlock(once, block), once);
  assert.throws(() => replaceBlock("# nothing", block), /markers/);
});
