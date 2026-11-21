// The public copy of the architecture is a filter of the original (krizaka-internal#4552): the tool builds one full object, this
// removes what is private, as the closed list docs/standards/architecture-public-filter.json says. Pure: the object and the
// list in, a new object out. The summary keeps the org's whole numbers.
import { readFileSync } from "node:fs";

export const POLICY_FILE = new URL("../../../docs/standards/architecture-public-filter.json", import.meta.url);
export const loadPolicy = () => JSON.parse(readFileSync(POLICY_FILE, "utf8"));
const REDACTED = "[private]";

const isPrivateFact = (item, policy) => policy.privateFactKinds.includes(item.fact?.kind);
const inside = (id, systems) => systems.has(id) || [...systems].some((s) => id.startsWith(`${s}.`));

/** Arrays lose every object that names a hidden repository; every string loses its private words (a path, a secret name, a hidden repository). */
function scrub(value, { hidden, words }) {
  if (typeof value === "string") return words.reduce((text, w) => text.replace(w, REDACTED), value);
  if (Array.isArray(value)) return value.filter((v) => !(v && typeof v === "object" && (hidden(v.repo) || hidden(v.home)))).map((v) => scrub(v, { hidden, words }));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, { hidden, words })]));
  return value;
}

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

function viewsWithout(views, systems) {
  return views
    .filter((v) => !systems.has(v.scope))
    .map((v) => {
      const nodes = v.nodes.filter((n) => !inside(n.id, systems)).map((n) => ({ ...n, children: (n.children ?? []).filter((c) => !inside(c, systems)) }));
      return { ...v, nodes, edges: v.edges.filter((e) => !inside(e.source, systems) && !inside(e.target, systems)), undocumented: (v.undocumented ?? []).filter((i) => !systems.has(i.system)) };
    });
}

/** The public copy of an architecture object: private homes and their repositories, private stores, local paths and secret names removed. */
export function publicOf(arch, policy = loadPolicy()) {
  const repos = new Set(arch.repos.filter((r) => !policy.publicVisibility.includes(r.visibility)).map((r) => r.name));
  const systems = new Set(arch.systems.filter((s) => repos.has(s.home)).map((s) => s.id));
  const hidden = (repo) => repos.has(repo);
  const words = [new RegExp(policy.localPath, "g"), new RegExp(policy.secretName, "g"), ...[...repos].map((r) => new RegExp(`(?<![\\w-])${escapeRe(r)}(?![\\w-])`, "g"))];
  const kept = {
    ...arch,
    systems: arch.systems.filter((s) => !systems.has(s.id)).map((s) => ({ ...s, repos: s.repos.filter((r) => !hidden(r)) })),
    repos: arch.repos.filter((r) => !hidden(r.name)),
    drift: arch.drift.filter((i) => !hidden(i.repo) && !hidden(i.home) && !systems.has(i.system) && !isPrivateFact(i, policy)),
    verdicts: arch.verdicts.filter((v) => !hidden(v.repo)).map((v) => ({ ...v, items: v.items.filter((i) => !hidden(i.repo) && !hidden(i.home) && !isPrivateFact(i, policy)) })),
    views: viewsWithout(arch.views, systems),
    graph: { nodes: arch.graph.nodes.filter((n) => !hidden(n.repo)), edges: arch.graph.edges.filter((e) => !hidden(e.source.split(":")[0]) && !hidden(e.target.split(":")[0])) },
    unread: arch.unread.filter((u) => !hidden(u.repo)),
  };
  return scrub(kept, { hidden, words });
}
