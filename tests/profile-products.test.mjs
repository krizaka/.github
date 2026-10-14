import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { END, collectProducts, renderProducts, replaceBlock } from "../scripts/profile-products.mjs";

const knowhow = JSON.parse(readFileSync(new URL("../profile/knowhow.json", import.meta.url), "utf8"));
const site = (id, status, extra = {}) => ({ id, name: id[0].toUpperCase() + id.slice(1), url: `https://dev.${id}.com`, kind: "product", status, repo: `https://github.com/krizaka/${id}`, ...extra });
const sites = [
  { id: "krizaka", name: "Krizaka", url: "https://www.krizaka.com", kind: "company", status: "released" },
  site("orazaka", "released"),
  site("orochia", "released"),
  site("yasakia", "upcoming"),
  site("yororis", "construction"),
  { id: "ui", name: "Krizaka UI", url: "https://ui.krizaka.com", kind: "open-source", status: "released" },
];

test("products only, in the know-how order, with their status in words", () => {
  const p = collectProducts({ sites, knowhow });
  assert.deepEqual(p.map((x) => x.id), ["orazaka", "orochia", "yasakia", "yororis", "yomizaka"]);
  assert.deepEqual(p.map((x) => x.status), ["Available", "Available", "Coming soon", "Under construction", "In development"]);
});

test("a product the package does not know yet comes from its fallback; once known, the package wins", () => {
  const before = collectProducts({ sites, knowhow }).find((x) => x.id === "yomizaka");
  assert.equal(before.url, "https://dev.yomizaka.com");
  const after = collectProducts({ sites: [...sites, site("yomizaka", "upcoming", { url: "https://yomizaka.example" })], knowhow }).find((x) => x.id === "yomizaka");
  assert.equal(after.url, "https://yomizaka.example");
  assert.equal(after.status, "In development");
});

test("a brand-new product appears with the package's own one-line description", () => {
  const p = collectProducts({ sites: [...sites, site("zorakia", "upcoming")], descriptions: { zorakia: "A new thing." }, knowhow });
  const z = p.at(-1);
  assert.equal(z.id, "zorakia");
  assert.equal(z.line, "A new thing.");
  assert.equal(z.knowhow, undefined);
  assert.match(renderProducts(p), /\*\*Zorakia\*\* &nbsp;<sup>Coming soon<\/sup><br>A new thing\./);
});

test("no dead link: a missing repository or mark is left out", () => {
  const md = renderProducts(collectProducts({ sites, knowhow }), { repos: (r) => !r.endsWith("/yomizaka"), marks: (id) => id !== "yomizaka" });
  assert.ok(!md.includes("github.com/krizaka/yomizaka"));
  assert.ok(md.includes("github.com/krizaka/orazaka"));
  assert.ok(!md.includes("brand/yomizaka/"));
  assert.ok(md.includes("dev.yomizaka.com"));
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
