import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildArchitecture } from "../lib/assemble.mjs";
import { latestTags, versionParts } from "../lib/facts.mjs";
import { systemsDsl, viewsDsl } from "../lib/model.mjs";
import { adrUrl, issueUrl } from "../lib/views.mjs";
import { SOVKORA_C4, org } from "./fixtures.mjs";

const verdict = (arch, repo) => arch.verdicts.find((v) => v.repo === repo);
const kinds = (arch, repo) => verdict(arch, repo).items.map((i) => i.kind);

test("an org whose models bind every unit is in sync: every repository passes, with its commit and evidence", async () => {
  const arch = await buildArchitecture(org());
  assert.deepEqual(arch.verdicts.map((v) => [v.repo, v.status]), [[".github", "pass"], ["krizaka-ui", "pass"], ["sovkora", "pass"], ["sovkora-web", "pass"]]);
  assert.deepEqual(arch.summary, { active: 4, inSync: 4, failing: 0, unknown: 0, drift: 0, byKind: { undocumented: 0, phantom: 0, reached: 0, gone: 0, missing: 0, invalid: 0 }, homes: { ok: 3, missing: 0, invalid: 0 } });
  assert.equal(verdict(arch, "sovkora-web").commit, "3".repeat(40));
  assert.ok(verdict(arch, "sovkora-web").evidence.some((e) => e.repo === "sovkora" && e.path === "docs/architecture/sovkora.c4" && e.sha256.length === 64));
});

test("a dependency is resolved to its publisher, with the lockfile's version, the latest tag and behind", async () => {
  const arch = await buildArchitecture(org());
  const web = arch.repos.find((r) => r.name === "sovkora-web");
  const [ui] = web.units[0].dependsOn;
  assert.deepEqual([ui.name, ui.have, ui.from, ui.repo, ui.latest, ui.latestTag, ui.behind], ["@krizaka/ui", "1.0.0", "lockfile", "krizaka-ui", "1.2.0", "@krizaka/ui@1.2.0", true]);
  assert.equal(web.latestTag.name, "2026.11.07.2");
  const edge = arch.graph.edges.find((e) => e.package === "@krizaka/ui");
  assert.deepEqual([edge.source, edge.target, edge.behind, edge.internal], ["sovkora-web:.", "krizaka-ui:packages/ui", true, false]);
});

test("undocumented: a repository on main that no current element binds fails, and so does its asset's home", async () => {
  const arch = await buildArchitecture(org((f) => { f.sovkora["docs/architecture/sovkora.c4"] = SOVKORA_C4.replace(/web = app[\s\S]*?\n {4}\}\n/, "").replace("founder -> sovkora.web 'uses'\n  sovkora.web -> sovkora.engine 'calls'", ""); }));
  assert.deepEqual(kinds(arch, "sovkora-web"), ["undocumented"]);
  assert.equal(verdict(arch, "sovkora").status, "fail");
  assert.equal(verdict(arch, "krizaka-ui").status, "pass");
});

test("phantom: a current element bound to a repository main does not have fails its home", async () => {
  const arch = await buildArchitecture(org((f) => { f.sovkora["docs/architecture/extra.c4"] = "model {\n  extend sovkora {\n    old = container 'Old' {\n      metadata {\n        repo 'sovkora-gone'\n      }\n    }\n  }\n}\n"; }));
  assert.deepEqual(kinds(arch, "sovkora"), ["phantom"]);
});

test("reached and gone: a planned element already on main, a retiring element gone from main", async () => {
  const model = "model {\n  extend sovkora {\n    next = app 'Next web' {\n      #planned\n      metadata {\n        repo 'sovkora-web'\n      }\n    }\n    kit = library 'UI kit' {\n      #retiring\n      metadata {\n        repo 'sovkora-ui-kit'\n      }\n    }\n  }\n}\n";
  const arch = await buildArchitecture(org((f) => { f.sovkora["docs/architecture/target.c4"] = model; }));
  assert.deepEqual(kinds(arch, "sovkora-web"), ["reached"]);
  assert.deepEqual(kinds(arch, "sovkora").sort(), ["gone", "reached"]);
});

test("missing: a library's home without docs/architecture fails, and its packages are undocumented", async () => {
  const arch = await buildArchitecture(org((f) => { delete f["krizaka-ui"]["docs/architecture/ui.c4"]; }));
  assert.deepEqual(kinds(arch, "krizaka-ui"), ["undocumented", "undocumented", "missing"]);
  assert.equal(arch.summary.homes.missing, 1);
});

test("invalid: an unknown kind, a specification of its own, an element outside its system", async () => {
  for (const [model, why] of [
    ["model {\n  extend ui {\n    core = librar 'x' {\n      metadata {\n        repo 'krizaka-ui'\n      }\n    }\n  }\n}\n", /Could not resolve/],
    [`specification {\n  element thing\n}\n${"model {\n  extend ui {\n    core = library 'x' {\n      metadata {\n        repo 'krizaka-ui'\n        path 'packages/*'\n      }\n    }\n  }\n}\n"}`, /writes no specification/],
    ["model {\n  rogue = system 'Rogue'\n  extend ui {\n    core = library 'x' {\n      metadata {\n        repo 'krizaka-ui'\n        path 'packages/*'\n      }\n    }\n  }\n}\n", /outside the system ui/],
  ]) {
    const arch = await buildArchitecture(org((f) => { f["krizaka-ui"]["docs/architecture/ui.c4"] = model; }));
    const invalid = verdict(arch, "krizaka-ui").items.filter((i) => i.kind === "invalid");
    assert.ok(invalid.some((i) => why.test(i.why)), `${why}: ${JSON.stringify(invalid)}`);
    assert.equal(arch.systems.find((s) => s.id === "ui").status, "invalid");
  }
});

test("the standard views are generated and laid out: C1 around each system, C2 of a system with an inside", async () => {
  const arch = await buildArchitecture(org());
  const ids = arch.views.map((v) => v.id);
  for (const id of ["sovkora_c1", "sovkora_c2", "ui_c2", "libraries_c2", "org_c1"]) assert.ok(ids.includes(id), id);
  const c2 = arch.views.find((v) => v.id === "sovkora_c2");
  const web = c2.nodes.find((n) => n.id === "sovkora.web");
  assert.deepEqual([web.kind, web.lifecycle, web.binding], ["app", "current", { repo: "sovkora-web", path: "." }]);
  assert.ok(web.links.some((l) => l.kind === "tag" && l.title === "2026.11.07.2"));
  assert.ok(c2.edges.some((e) => e.source === "sovkora.web" && e.target === "sovkora.engine" && e.points.length >= 4));
});

test("the same commits give the same bytes", async () => {
  const a = await buildArchitecture(org());
  const b = await buildArchitecture(org());
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("tags: the highest version per package and per repository; calendar versions order too", () => {
  const t = latestTags("r", ["v1.9.0", "v1.10.0", "@krizaka/a@0.2.0", "@krizaka/a@0.10.0", "not-a-version"]);
  assert.equal(t.repo.name, "v1.10.0");
  assert.equal(t.packages["@krizaka/a"].version, "0.10.0");
  assert.deepEqual(versionParts("2026.11.06.4"), [2026, 11, 6, 4]);
  assert.equal(versionParts("main"), null);
});

test("links: an ADR resolves to its file in its repository, an issue to its address", () => {
  const paths = new Map([[".github", ["docs/adr/ADR-022-dev-and-prod-environments.md"]], ["sovkora", ["docs/adr/ADR-073-one-author.md"]]]);
  assert.equal(adrUrl("ADR-022", paths).url, "https://github.com/krizaka/.github/blob/main/docs/adr/ADR-022-dev-and-prod-environments.md");
  assert.equal(adrUrl("sovkora ADR-073", paths).url, "https://github.com/krizaka/sovkora/blob/main/docs/adr/ADR-073-one-author.md");
  assert.equal(adrUrl("ADR-999", paths).url, "https://github.com/krizaka/.github/tree/main/docs/adr");
  assert.equal(issueUrl("krizaka-internal#2663").url, "https://github.com/krizaka/krizaka-internal/issues/2663");
  assert.equal(issueUrl("nonsense"), null);
});

test("the generated systems and views are DSL the parser reads (quotes escaped)", () => {
  const dsl = systemsDsl([{ id: "x", name: "It's", group: "asset", url: "https://x", home: "x" }]);
  assert.match(dsl, /x = system 'It\\'s'/);
  assert.match(viewsDsl([{ id: "x", name: "X", group: "asset" }], new Set(["x"])), /view x_c2 of x/);
});

/** The `required`, `enum`, `const` and `additionalProperties: false` of the schema, checked along properties, items and $ref. */
function problems(schema, value, root, at = "$") {
  const s = schema.$ref ? root.$defs[schema.$ref.split("/").pop()] : schema;
  const out = [];
  if (s.const !== undefined && value !== s.const) out.push(`${at}: not ${s.const}`);
  if (s.enum && !s.enum.includes(value)) out.push(`${at}: ${value} not in ${s.enum}`);
  for (const part of s.allOf ?? []) out.push(...problems(part, value, root, at));
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of s.required ?? []) if (!(key in value)) out.push(`${at}.${key}: missing`);
    if (s.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in (s.properties ?? {}))) out.push(`${at}.${key}: not in the schema`);
    for (const [key, sub] of Object.entries(s.properties ?? {})) if (key in value) out.push(...problems(sub, value[key], root, `${at}.${key}`));
  }
  if (Array.isArray(value) && s.items) value.forEach((v, i) => out.push(...problems(s.items, v, root, `${at}[${i}]`)));
  return out;
}

test("the output follows docs/standards/architecture.schema.json, with drift of every kind in it", async () => {
  const schema = JSON.parse(readFileSync(new URL("../../../docs/standards/architecture.schema.json", import.meta.url), "utf8"));
  const arch = await buildArchitecture(org((f) => {
    f.sovkora["docs/architecture/target.c4"] = "model {\n  extend sovkora {\n    kit = library 'UI kit' {\n      #retiring\n      metadata {\n        repo 'sovkora-ui-kit'\n      }\n    }\n  }\n}\n";
    delete f["krizaka-ui"]["docs/architecture/ui.c4"];
  }));
  assert.deepEqual(problems(schema, arch, schema), []);
});
