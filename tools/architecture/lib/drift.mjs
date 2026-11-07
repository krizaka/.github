// The drift between the hand-written models and the facts of main (ADR-027 § 6), and one verdict per active repository
// (§ 7). Pure: facts, elements and homes in, sorted items and verdicts out.
import { globMatches } from "@krizaka/architecture";

export const DRIFT_KINDS = ["undocumented", "phantom", "reached", "gone", "missing", "invalid"];
const byString = (a, b) => Number(a > b) - Number(a < b);
const depth = (path) => (path === "." ? 0 : path.split("/").length);
const isApp = (path) => /^apps\/[^/]+$/.test(path);

/** The units a model must bind: the root, every `apps/*`, and in a library repository its top published packages. */
export function requiredUnits(repo) {
  const published = repo.units.filter((u) => u.published && u.path !== ".");
  const library = repo.owner === "krizaka" && repo.units.some((u) => u.published);
  const nested = (u) => published.some((p) => p !== u && p.ecosystem === u.ecosystem && u.path.startsWith(`${p.path}/`));
  const paths = new Map([[".", { path: ".", name: repo.units.find((u) => u.path === ".")?.name ?? repo.name }]]);
  for (const u of repo.units.filter((x) => isApp(x.path))) if (!paths.has(u.path)) paths.set(u.path, { path: u.path, name: u.name });
  if (library) {
    for (const u of published.filter((x) => depth(x.path) <= 2 && !nested(x))) if (!paths.has(u.path)) paths.set(u.path, { path: u.path, name: u.name });
  }
  return [...paths.values()].sort((a, b) => byString(a.path, b.path));
}

/** The element's binding: { repo, path } from its metadata, or null when it names no repository. */
export function bindingOf(element) {
  const repo = element.metadata?.repo;
  if (!repo || typeof repo !== "string") return null;
  const path = typeof element.metadata.path === "string" && element.metadata.path.trim() ? element.metadata.path.trim().replace(/\/$/, "") : ".";
  return { repo, path };
}

const binds = (binding, unitPath) => binding.path === unitPath || (binding.path.includes("*") && globMatches(binding.path, unitPath));

/** Does `main` hold what a binding names: an active repository and, for a path, a unit or a tracked folder? */
export function bindingExists(binding, facts) {
  const repo = facts.byName.get(binding.repo);
  if (!repo) return false;
  if (binding.path === ".") return true;
  if (repo.units.some((u) => binds(binding, u.path))) return true;
  const paths = facts.paths.get(binding.repo) ?? [];
  return binding.path.includes("*") ? false : paths.some((p) => p.startsWith(`${binding.path}/`));
}

/** The system an element belongs to: the first part of its id. */
export const systemOf = (id) => id.split(".")[0];

/** May an element of this system bind this repository? An asset's repositories belong to that asset's model only. */
function mayBind(systemId, repo, assets) {
  return !assets.has(repo.owner) || systemId === repo.owner;
}

function item(kind, repo, home, fields) {
  return { kind, repo, home, ...fields };
}

/**
 * Every drift item: facts = { repos, paths } (from factsOf), elements = the org-wide model's elements, homes = Map(system →
 * { repo, status, errors }), assets = the set of asset system ids.
 */
export function driftOf({ facts, elements, homes, assets }) {
  const byName = new Map(facts.repos.map((r) => [r.name, r]));
  const ctx = { byName, paths: facts.paths };
  const items = [];
  const homeRepo = (id) => homes.get(systemOf(id))?.repo ?? null;
  const bound = elements.map((e) => ({ element: e, binding: bindingOf(e) })).filter((b) => b.binding);
  for (const repo of facts.repos) {
    for (const unit of requiredUnits(repo)) {
      // The root is covered by any current element of the repository (the repository is in the model); a unit by its own.
      const covered = bound.some((b) => b.element.lifecycle !== "planned" && b.binding.repo === repo.name && (unit.path === "." || binds(b.binding, unit.path)) && mayBind(systemOf(b.element.id), repo, assets));
      if (!covered) items.push(item("undocumented", repo.name, assets.has(repo.owner) ? (homes.get(repo.owner)?.repo ?? null) : null, { path: unit.path, unit: unit.name, why: `${repo.name}${unit.path === "." ? "" : `/${unit.path}`} is on main and no current element binds it` }));
    }
  }
  for (const { element, binding } of bound) {
    const exists = bindingExists(binding, ctx);
    const where = `${binding.repo}${binding.path === "." ? "" : `/${binding.path}`}`;
    const target = byName.has(binding.repo) ? binding.repo : homeRepo(element.id);
    if (element.lifecycle === "current" && !exists) items.push(item("phantom", target, homeRepo(element.id), { element: element.id, path: binding.path, why: `${element.id} binds ${where}, which main does not have` }));
    if (element.lifecycle === "planned" && exists) items.push(item("reached", target, homeRepo(element.id), { element: element.id, path: binding.path, why: `${element.id} is planned and ${where} is already on main: drop #planned` }));
    if (element.lifecycle === "retiring" && !exists) items.push(item("gone", target, homeRepo(element.id), { element: element.id, path: binding.path, why: `${element.id} is retiring and ${where} is gone from main: drop the element` }));
  }
  for (const [system, home] of homes) {
    if (home.status === "missing") items.push(item("missing", home.repo, home.repo, { system, why: `${home.repo} is the home of ${system} and has no docs/architecture/*.c4` }));
    for (const e of home.errors ?? []) items.push(item("invalid", home.repo, home.repo, { system, path: e.path, line: e.line, why: e.message }));
  }
  const order = (a, b) => byString(a.repo ?? "", b.repo ?? "") || DRIFT_KINDS.indexOf(a.kind) - DRIFT_KINDS.indexOf(b.kind) || byString(a.why, b.why);
  return items.sort(order);
}

/**
 * One verdict per active repository: pass when no drift item names it (as the repository or as the home to fix), fail
 * otherwise, unknown when it could not be read. `evidence` is the model files the verdict read, with their SHA-256.
 */
export function verdictsOf({ facts, items, homes, unread, base }) {
  const evidenceOf = (repo) => {
    const files = [...base.map((f) => ({ repo: ".github", path: f.path, sha256: f.sha256 }))];
    for (const home of homes.values()) if (home.repo === repo.name || home.binds?.has(repo.name)) files.push(...(home.files ?? []).map((f) => ({ repo: home.repo, ...f })));
    return files.sort((a, b) => byString(`${a.repo}/${a.path}`, `${b.repo}/${b.path}`));
  };
  const verdicts = facts.repos.map((repo) => {
    const mine = items.filter((i) => i.repo === repo.name || i.home === repo.name);
    return { repo: repo.name, commit: repo.commit, status: mine.length ? "fail" : "pass", items: mine, evidence: evidenceOf(repo) };
  });
  for (const u of unread) verdicts.push({ repo: u.repo, commit: null, status: "unknown", items: [], why: u.why, evidence: [] });
  return verdicts.sort((a, b) => byString(a.repo, b.repo));
}

/** The numbers the founder reads (§ 7): repositories in sync out of the active ones, drift items by kind, homes by state. */
export function summaryOf(verdicts, items, homes) {
  const count = (status) => verdicts.filter((v) => v.status === status).length;
  const byKind = Object.fromEntries(DRIFT_KINDS.map((k) => [k, items.filter((i) => i.kind === k).length]));
  const homeStates = { ok: 0, missing: 0, invalid: 0 };
  for (const h of homes.values()) homeStates[h.status] += 1;
  return { active: verdicts.length, inSync: count("pass"), failing: count("fail"), unknown: count("unknown"), drift: items.length, byKind, homes: homeStates };
}
