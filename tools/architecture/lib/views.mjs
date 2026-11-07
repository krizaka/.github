// The laid-out views as the cockpit draws them (ADR-027 § 9): each node with its position, lifecycle, links and the facts
// it binds; each edge with its route. Pure: LikeC4's laid-out views and the facts in, plain sorted objects out.
import { globMatches } from "@krizaka/architecture";
import { bindingOf } from "./drift.mjs";

const byString = (a, b) => Number(a > b) - Number(a < b);
const ISSUE = /^(?:krizaka\/)?([\w.-]+)#(\d+)$/;
const ADR = /^(?:([\w.-]+)\s+)?(ADR-\d+)$/i;
const GH = "https://github.com/krizaka";
export const LEVELS = { c1: "c1", c2: "c2" };

/** The address of an ADR (`ADR-022` in krizaka/.github, `sovkora ADR-073` in sovkora), from the files of that repository. */
export function adrUrl(ref, paths) {
  const m = ADR.exec(String(ref ?? "").trim());
  if (!m) return null;
  const repo = m[1] ?? ".github";
  const id = m[2].toUpperCase();
  const file = (paths.get(repo) ?? []).find((p) => /(^|\/)docs\/adr\//.test(p) && p.split("/").pop().toUpperCase().startsWith(id));
  return { title: id + (m[1] ? ` (${repo})` : ""), url: file ? `${GH}/${repo}/blob/main/${file}` : `${GH}/${repo}/tree/main/docs/adr` };
}

/** The address of an issue (`krizaka-internal#2663`). */
export function issueUrl(ref) {
  const m = ISSUE.exec(String(ref ?? "").trim());
  return m ? { title: `${m[1]}#${m[2]}`, url: `${GH}/${m[1]}/issues/${m[2]}` } : null;
}

function factsOfBinding(binding, facts) {
  const repo = facts.byName.get(binding.repo);
  if (!repo) return null;
  const units = repo.units.filter((u) => u.path === binding.path || (binding.path.includes("*") && globMatches(binding.path, u.path)));
  return {
    repo: repo.name,
    commit: repo.commit,
    latestTag: repo.latestTag,
    languages: repo.languages,
    units: units.map((u) => ({ path: u.path, name: u.name, ecosystem: u.ecosystem, language: u.language, version: u.version, published: u.published, dependsOn: u.dependsOn.length, behind: u.dependsOn.filter((d) => d.behind).length })),
  };
}

function linksOf(node, binding, facts) {
  const links = node.links.map((l) => ({ kind: "link", title: l.title ?? l.url, url: l.url }));
  if (binding) {
    const repo = facts.byName.get(binding.repo);
    const whole = binding.path === "." || binding.path.includes("*");
    const where = binding.path === "." ? binding.repo : `${binding.repo}/${binding.path}`;
    links.push({ kind: "repo", title: where, url: whole ? `${GH}/${binding.repo}` : `${GH}/${binding.repo}/tree/main/${binding.path}` });
    if (repo?.latestTag) links.push({ kind: "tag", title: repo.latestTag.name, url: repo.latestTag.url });
  }
  const adr = adrUrl(node.metadata?.adr, facts.paths);
  if (adr) links.push({ kind: "adr", ...adr });
  const issue = issueUrl(node.metadata?.issue);
  if (issue) links.push({ kind: "issue", ...issue });
  return links;
}

const LIFECYCLES = ["planned", "retiring"];
const lifecycleOf = (tags) => LIFECYCLES.find((t) => tags.includes(t)) ?? "current";

function nodeOf(n, facts, items) {
  const tags = [...(n.tags ?? [])].sort(byString);
  const binding = bindingOf({ metadata: n.metadata ?? {} });
  return {
    id: n.id,
    parent: n.parent ?? null,
    kind: n.kind,
    shape: n.shape,
    title: n.title,
    description: n.description?.txt ?? (typeof n.description === "string" ? n.description : null),
    technology: n.technology ?? null,
    tags,
    lifecycle: lifecycleOf(tags),
    x: Math.round(n.x),
    y: Math.round(n.y),
    width: Math.round(n.width),
    height: Math.round(n.height),
    children: [...(n.children ?? [])].sort(byString),
    navigateTo: n.navigateTo ?? null,
    binding,
    links: linksOf({ links: n.links ?? [], metadata: n.metadata ?? {} }, binding, facts),
    facts: binding ? factsOfBinding(binding, facts) : null,
    drift: items.filter((i) => i.element === n.id),
  };
}

function edgeOf(e, relationTags) {
  const tags = [...new Set((e.relations ?? []).flatMap((r) => relationTags.get(r) ?? []))].sort(byString);
  return { id: e.id, source: e.source, target: e.target, label: e.label ?? null, points: (e.points ?? []).map(([x, y]) => [Math.round(x), Math.round(y)]), tags, lifecycle: lifecycleOf(tags) };
}

/** The level and scope of a standard view, from its id (`sovkora_c2`, `libraries_c1`, `org_c1`). */
export function viewMeta(id, systemIds) {
  const m = /^(.+)_(c1|c2)$/.exec(id);
  if (!m) return { level: null, scope: null };
  return { level: m[2], scope: m[1], system: systemIds.has(m[1]) };
}

/** Every laid-out view, sorted by id, with the undocumented units of its system listed beside it (none of them is drawn). */
export function viewsOf({ layouted, facts, items, relationTags, systemIds, homeOf }) {
  return layouted
    .map((v) => {
      const meta = viewMeta(v.id, systemIds);
      const nodes = v.nodes.map((n) => nodeOf(n, facts, items)).sort((a, b) => byString(a.id, b.id));
      const edges = v.edges.map((e) => edgeOf(e, relationTags)).sort((a, b) => byString(a.id, b.id));
      const xs = nodes.flatMap((n) => [n.x, n.x + n.width]);
      const ys = nodes.flatMap((n) => [n.y, n.y + n.height]);
      const bounds = nodes.length ? { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } : { x: 0, y: 0, width: 0, height: 0 };
      const home = homeOf(meta.scope);
      const undocumented = items.filter((i) => i.kind === "undocumented" && (meta.scope === "org" ? i.home === null : home !== null && i.home === home));
      return { id: v.id, title: v.title ?? v.id, level: meta.level, scope: meta.scope, bounds, nodes, edges, undocumented };
    })
    .filter((v) => v.level !== null)
    .sort((a, b) => byString(a.id, b.id));
}
