// The dependency graph (ADR-027 § 9): which org packages, at which pinned version, build each unit, and where a pin is behind
// the publisher's latest tag. Generated only from the facts; the cockpit filters it and lays it out (ELK). Pure.
const byString = (a, b) => Number(a > b) - Number(a < b);
const nodeId = (repo, path) => `${repo}:${path}`;

/** The system of each repository: its asset, else the system whose model binds it, else none (unmodelled). */
export function systemOfRepo(facts, bindings, assets) {
  const out = new Map();
  for (const repo of facts.repos) {
    if (assets.has(repo.owner)) out.set(repo.name, repo.owner);
    else out.set(repo.name, bindings.find((b) => b.repo === repo.name)?.system ?? null);
  }
  return out;
}

/**
 * Nodes: every unit that pins an org package or publishes one. Edges: unit → the publishing unit, with the pinned version,
 * the latest tag, `behind`, `dev` and `internal` (both ends in one repository).
 */
export function dependencyGraph(facts, systemOf) {
  const nodes = new Map();
  const edges = [];
  const add = (repo, unit) => {
    const id = nodeId(repo.name, unit.path);
    if (!nodes.has(id)) {
      nodes.set(id, { id, repo: repo.name, system: systemOf.get(repo.name) ?? null, path: unit.path, name: unit.name, ecosystem: unit.ecosystem, language: unit.language, version: unit.version, published: unit.published, owner: repo.owner, behind: 0 });
    }
    return nodes.get(id);
  };
  const byName = new Map(facts.repos.map((r) => [r.name, r]));
  for (const repo of facts.repos) {
    for (const unit of repo.units) {
      if (unit.published) add(repo, unit);
      for (const dep of unit.dependsOn) {
        if (!dep.repo) continue;
        const publisher = byName.get(dep.repo)?.units.find((u) => u.path === dep.path && u.ecosystem === dep.ecosystem);
        if (!publisher) continue;
        const from = add(repo, unit);
        const to = add(byName.get(dep.repo), publisher);
        if (dep.behind) from.behind += 1;
        edges.push({ id: `${from.id}>${to.id}`, source: from.id, target: to.id, package: dep.name, have: dep.have, latest: dep.latest, latestTag: dep.latestTag, latestUrl: dep.latestUrl, behind: dep.behind, dev: dep.dev, internal: from.repo === to.repo });
      }
    }
  }
  const unique = new Map(edges.map((e) => [e.id, e]));
  return {
    nodes: [...nodes.values()].sort((a, b) => byString(a.id, b.id)),
    edges: [...unique.values()].sort((a, b) => byString(a.id, b.id)),
  };
}
