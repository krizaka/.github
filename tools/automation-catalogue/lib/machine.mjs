// The Mac's own automation, read from the manifest every machine installs from: krizaka-agents `tools/install.json` (crons,
// machine-wide agent hooks, LaunchAgents when the manifest lists them). Read from the repository at the pinned commit, like
// everything else: the catalogue never looks at the machine itself (the cockpit's export compares the two, ADR-026 principle 7).

export const MANIFEST = { repo: "krizaka-agents", path: "tools/install.json" };

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The units of the manifest: { type: "cron" | "agent-hook" | "launchagent", id, schedule, command, what }. */
export function machineUnits(text) {
  const manifest = text ? parse(text) : null;
  if (!manifest) return [];
  const crons = (manifest.crons?.entries ?? []).map((c) => ({ type: "cron", id: `cron.${c.id}`, schedule: c.schedule ?? "", command: c.command ?? "", what: c.what ?? "", paused: c.paused ?? null }));
  const hooks = (manifest.hooks ?? []).map((h, i) => ({ type: "agent-hook", id: `hooks[${i}].${h.event}`, schedule: h.matcher ?? "", command: h.command ?? "", what: h.what ?? "", paused: null }));
  const agents = (manifest.launchAgents ?? manifest.launchagents ?? []).map((a) => ({ type: "launchagent", id: `launchagent.${a.id ?? a.label}`, schedule: a.schedule ?? a.interval ?? "", command: a.command ?? a.program ?? "", what: a.what ?? "", paused: a.paused ?? null }));
  return [...crons, ...hooks, ...agents];
}

/** What the machine's entries call, as caller entries of krizaka-agents' corpus (so the scripts they run are found). */
export function machineCorpus(text) {
  const manifest = text ? parse(text) : null;
  const git = manifest?.git ? [{ type: "hook", by: "git-config:install.json", path: MANIFEST.path, text: JSON.stringify(manifest.git) }] : [];
  return [...machineUnits(text).map((u) => ({ type: u.type === "agent-hook" ? "agent-hook" : "cron", by: `${u.type}:${u.id}`, path: MANIFEST.path, text: u.command })), ...git];
}
