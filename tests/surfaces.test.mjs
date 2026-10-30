// « Done » covers every surface (krizaka/.github#439).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluate, loadConfig, productOf, productRepos, reopenComment, surfaceProblems, surfacesBlock, surfacesSection, withSurfaces } from "../scripts/surfaces.mjs";

const products = loadConfig();
const ids = (p) => products[p].surfaces.map((s) => s.id);

test("the founder's surfaces per product", () => {
  assert.deepEqual(ids("orazaka"), ["web-client", "web-admin", "mobile", "mac", "cli", "api-sdk"]);
  assert.deepEqual(ids("yomizaka"), ["web", "admin", "mobile", "mac"]);
  assert.deepEqual(ids("akinaza"), ["web", "admin", "mobile", "mac"]);
});

test("a product is its repositories of the krizaka organisation, named in surfaces.json", () => {
  assert.equal(productOf("krizaka/orazaka-cli", products), "orazaka");
  assert.equal(productOf("krizaka/orazaka", products), "orazaka");
  assert.equal(productOf("krizaka/yomizaka", products), "yomizaka");
  assert.equal(productOf("krizaka/akinaza", products), "akinaza");
  assert.equal(productOf("krizaka/krizaka-ui", products), null);
  assert.equal(productOf("yomizaka/yomizaka", products), null, "there is no product organisation");
});

test("the sweep reads krizaka/<repo> for every repo of surfaces.json, never an organisation of a product", () => {
  const repos = productRepos(products);
  assert.ok(repos.length >= 3 && repos.every((r) => r.startsWith("krizaka/")), repos.join());
  for (const r of ["krizaka/yomizaka", "krizaka/akinaza", "krizaka/orazaka", "krizaka/orazaka-cli"]) assert.ok(repos.includes(r), r);
  const flow = readFileSync(".github/workflows/feature-surfaces.yml", "utf8");
  assert.doesNotMatch(flow, /matrix:|owner: \[/);
  assert.doesNotMatch(readFileSync("scripts/surfaces.mjs", "utf8"), /orgs\//);
});

test("Orazaka's Mac surface is apps/desktop of krizaka/orazaka", () => {
  const mac = products.orazaka.surfaces.find((s) => s.id === "mac");
  assert.deepEqual([mac.repo, mac.path], ["orazaka", "apps/desktop"]);
});

const done = (lines) => `### The problem\n\nx\n\n### Surfaces\n\n${lines.join("\n")}\n\n### Privacy by design\n\nnone`;
const yomizakaDone = ["- [x] Web — yomizaka/yomizaka#12", "- [x] Admin — https://github.com/yomizaka/yomizaka/pull/13", "- [x] Mobile — n/a — no mobile screen for this", "- [x] Mac — n/a: the Mac app has no such page"];

test("every surface shipped or justified passes", () => {
  assert.deepEqual(surfaceProblems(done(yomizakaDone), products.yomizaka.surfaces), []);
});

test("an open box, a bare tick, a missing line and a missing section are all named", () => {
  const surfaces = products.yomizaka.surfaces;
  assert.match(surfaceProblems(done(["- [ ] Web — ", ...yomizakaDone.slice(1)]), surfaces).join(), /Web: not ticked/);
  assert.match(surfaceProblems(done(["- [x] Web — ", ...yomizakaDone.slice(1)]), surfaces).join(), /Web: ticked without a PR link/);
  assert.match(surfaceProblems(done(["- [x] Web — n/a — ", ...yomizakaDone.slice(1)]), surfaces).join(), /Web: ticked without/, "n/a needs a reason");
  assert.match(surfaceProblems(done(yomizakaDone.slice(0, 3)), surfaces).join(), /Mac: missing/);
  assert.match(surfaceProblems("no section", surfaces).join(), /no « Surfaces » checklist/);
});

test("the section stops at the next heading and reads only checklist lines", () => {
  assert.deepEqual(surfacesSection("## Surfaces\n- [x] a #1\ntext\n## Other\n- [ ] b"), ["- [x] a #1"]);
});

test("the CLI is a surface of Orazaka only", () => {
  assert.match(surfaceProblems(done(yomizakaDone.slice(0, 2)), products.orazaka.surfaces).join(), /CLI: missing/);
});

const closed = (extra) => ({ number: 7, state: "closed", labels: [{ name: "type:feature" }], body: done([]), ...extra });

test("the closing check: a feature of a product with a gap fails, anything else is skipped", () => {
  assert.equal(evaluate(closed(), "krizaka/yomizaka", products).ok, false);
  assert.equal(evaluate(closed({ body: done(yomizakaDone) }), "krizaka/yomizaka", products).ok, true);
  assert.equal(evaluate(closed({ type: { name: "Feature" }, labels: [] }), "krizaka/orazaka-cli", products).ok, false, "the org issue type counts");
  for (const [issue, repo] of [
    [closed({ labels: [{ name: "type:bug" }] }), "krizaka/yomizaka"],
    [closed(), "krizaka/krizaka-ui"],
    [closed({ state: "open" }), "krizaka/yomizaka"],
    [closed({ state_reason: "not_planned" }), "krizaka/yomizaka"],
    [closed({ pull_request: {} }), "krizaka/yomizaka"],
  ]) assert.equal(evaluate(issue, repo, products).skipped, true);
});

test("the reopen comment names every gap and carries the marker", () => {
  const c = reopenComment(["Web: not ticked", "Mac: missing from the checklist"]);
  assert.match(c, /surfaces-check/);
  assert.match(c, /- Web: not ticked/);
  assert.match(c, /- Mac: missing/);
});

test("the template block lists every surface of its product, the org default every product", () => {
  const one = surfacesBlock(products, "akinaza");
  for (const s of products.akinaza.surfaces) assert.match(one, new RegExp(`- \\[ \\] ${s.label} — `));
  assert.doesNotMatch(one, /Orazaka/);
  const all = surfacesBlock(products);
  for (const p of Object.values(products)) assert.match(all, new RegExp(p.title));
  assert.match(all, /CLI/);
});

test("withSurfaces replaces the generated block and is stable", () => {
  const base = "name: x\nbody:\n  - type: input\n    id: a\n";
  const once = withSurfaces(base, products, "yomizaka");
  assert.equal(withSurfaces(once, products, "yomizaka"), once);
  assert.notEqual(withSurfaces(once, products, "orazaka"), once);
});

test("the committed templates are the generated ones, and the org default has the Surfaces textarea", () => {
  const base = readFileSync(".github/ISSUE_TEMPLATE/feature_request.yml", "utf8");
  assert.equal(base, withSurfaces(base, products), "run: node scripts/surfaces.mjs write");
  for (const p of Object.keys(products)) {
    assert.equal(readFileSync(`docs/standards/surfaces/feature_request.${p}.yml`, "utf8"), withSurfaces(base, products, p), p);
  }
  assert.match(base, /label: Surfaces/);
});

test("the workflow reopens on close (reusable) and sweeps on a schedule, with literally named jobs", () => {
  const text = readFileSync(".github/workflows/feature-surfaces.yml", "utf8");
  assert.match(text, /workflow_call:/);
  assert.match(text, /schedule:/);
  assert.match(text, /name: Feature surfaces\n/);
  assert.match(text, /surfaces\.mjs check/);
  assert.match(text, /surfaces\.mjs sweep/);
});
