// The whole architecture of the org from its sources (ADR-027): facts, homes, the org-wide model and its laid-out views,
// the drift, one verdict per active repository, the dependency graph and the numbers. The same commits give the same object
// (only `generatedAt` holds a clock).
import { readFileSync } from "node:fs";
import { driftOf, bindingOf, summaryOf, systemOf, verdictsOf } from "./drift.mjs";
import { factsOf } from "./facts.mjs";
import { dependencyGraph, systemOfRepo } from "./graph.mjs";
import { BASE_FILES, MODEL_DIR, baseOf, checkHome, modelFiles, parse, systemsDsl, viewsDsl } from "./model.mjs";
import { viewsOf } from "./views.mjs";

export const SCHEMA = "krizaka.architecture/1";
const byString = (a, b) => Number(a > b) - Number(a < b);
const DOTGITHUB = ".github";

function likec4Version() {
  const pkg = new URL("../node_modules/@likec4/language-services/package.json", import.meta.url);
  return JSON.parse(readFileSync(pkg, "utf8")).version;
}

/** The systems with a home: the generated family systems, then the base's own (the platform), each with its home repository. */
function systemsWithHome(familySystems, baseElements) {
  const own = baseElements
    .filter((e) => e.kind === "system" && !e.id.includes(".") && typeof e.metadata?.home === "string")
    .map((e) => ({ id: e.id, name: e.title, group: e.tags.find((t) => ["asset", "libraries", "sites", "platform"].includes(t)) ?? "platform", url: null, home: e.metadata.home, generated: false }));
  return [...familySystems.map((s) => ({ ...s, generated: true })), ...own.filter((o) => !familySystems.some((s) => s.id === o.id))];
}

async function checkHomes({ systems, sourceOf, base, systemsFile, known, baseErrors }) {
  const homes = new Map();
  for (const system of systems) {
    const source = sourceOf.get(system.home);
    if (!source) {
      homes.set(system.id, { repo: system.home, status: "missing", errors: [], files: [], elements: [], sources: [] });
      continue;
    }
    if (system.home === DOTGITHUB) {
      const errors = baseErrors.filter((e) => e.repo === DOTGITHUB);
      homes.set(system.id, { repo: DOTGITHUB, status: errors.length ? "invalid" : "ok", errors, files: base.map(({ path, sha256 }) => ({ path, sha256 })), elements: [], sources: [] });
      continue;
    }
    const files = modelFiles(source.files);
    homes.set(system.id, { repo: system.home, ...(await checkHome({ base, systems: systemsFile, known, home: { repo: system.home, files }, system: system.id })) });
  }
  return homes;
}

/**
 * sources: [{ name, commit, committedAt, files: Map, tags }] of the active repositories; unread: [{ repo, why }];
 * registry: the rows of repos.json; family: the family systems (sources.mjs familySystems).
 */
export async function buildArchitecture({ sources, unread = [], registry, family, orgVersion, generatedAt, mode }) {
  const facts = factsOf(sources, registry);
  facts.byName = new Map(facts.repos.map((r) => [r.name, r]));
  const sourceOf = new Map(sources.map((s) => [s.name, s]));
  const dotgithub = sourceOf.get(DOTGITHUB);
  const base = dotgithub ? baseOf(dotgithub.files).map((f) => ({ ...f, repo: DOTGITHUB })) : [];
  const systemsFile = { repo: "generated", path: "systems.c4", text: systemsDsl(family) };
  const baseParse = await parse([...base.filter((f) => f.text !== null), systemsFile]);
  const known = new Set(baseParse.elements.map((e) => e.id));
  const systems = systemsWithHome(family, baseParse.elements);
  const homes = await checkHomes({ systems, sourceOf, base: base.filter((f) => f.text !== null), systemsFile, known, baseErrors: baseParse.errors });
  if (base.some((f) => f.text === null)) homes.get("platform")?.errors.push({ repo: DOTGITHUB, path: MODEL_DIR, line: 1, message: `the org base needs ${BASE_FILES.join(" and ")}` });

  const valid = [...homes.values()].filter((h) => h.status === "ok").flatMap((h) => h.sources);
  const merged = await parse([...base.filter((f) => f.text !== null), systemsFile, ...valid]);
  const withInside = new Set(merged.elements.filter((e) => e.id.includes(".")).map((e) => systemOf(e.id)));
  const viewsFile = { repo: "generated", path: "views.c4", text: viewsDsl(systems.filter((s) => known.has(s.id)), withInside) };
  const org = await parse([...base.filter((f) => f.text !== null), systemsFile, ...valid, viewsFile], { layout: true });

  const assets = new Set(systems.filter((s) => s.group === "asset").map((s) => s.id));
  const items = driftOf({ facts, elements: org.elements, homes, assets });
  const bindings = org.elements.map((e) => ({ binding: bindingOf(e), system: systemOf(e.id) })).filter((b) => b.binding).map((b) => ({ repo: b.binding.repo, system: b.system }));
  for (const [id, home] of homes) home.binds = new Set(bindings.filter((b) => b.system === id).map((b) => b.repo));
  const verdicts = verdictsOf({ facts, items, homes, unread, base });
  const relationTags = new Map(org.relations.map((r) => [r.id, r.tags]));
  const homeOf = (scope) => homes.get(scope)?.repo ?? null;
  const views = viewsOf({ layouted: org.views, facts, items, relationTags, systemIds: new Set(systems.map((s) => s.id)), homeOf });
  const systemOfRepoMap = systemOfRepo(facts, bindings, assets);
  const graph = dependencyGraph(facts, systemOfRepoMap);

  return {
    schema: SCHEMA,
    generatedAt,
    mode,
    tool: { likec4: likec4Version(), org: orgVersion },
    base: { repo: DOTGITHUB, commit: dotgithub?.commit ?? null, files: base.map(({ path, sha256 }) => ({ path, sha256 })) },
    summary: summaryOf(verdicts, items, homes),
    systems: systems
      .map((s) => {
        const home = homes.get(s.id);
        return { id: s.id, name: s.name, group: s.group, url: s.url, home: s.home, generated: s.generated, status: home.status, errors: home.errors, files: home.files, repos: [...home.binds].sort(byString), views: views.filter((v) => v.scope === s.id).map((v) => v.id) };
      })
      .sort((a, b) => byString(a.id, b.id)),
    repos: facts.repos.map((r) => ({ ...r, system: systemOfRepoMap.get(r.name) ?? null })),
    packages: facts.packages,
    drift: items,
    verdicts,
    views,
    graph,
    unread,
  };
}
