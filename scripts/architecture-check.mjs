// The cell of the rule `architecture-model` (ADR-027, krizaka-internal#2810): the repository's verdict written by
// tools/architecture, read at the SAME commit as the matrix. The tool runs first in the same job (Conformance workflow, step « The
// architecture »); another commit, or no verdict, is unknown, never green. Dependency-free: the verdicts are a JSON file.
import { readFileSync } from "node:fs";

/** Where the step « The architecture » writes its output (the job's working directory), unless ARCHITECTURE_JSON says otherwise. */
export const DEFAULT_PATH = "architecture/architecture.json";

/** The verdicts of a run of tools/architecture, by repository; null when the file is missing or unreadable. */
export function loadVerdicts(path = process.env.ARCHITECTURE_JSON || DEFAULT_PATH, read = (p) => readFileSync(p, "utf8")) {
  try {
    const arch = JSON.parse(read(path));
    return arch?.schema === "krizaka.architecture/1" ? new Map(arch.verdicts.map((v) => [v.repo, v])) : null;
  } catch {
    return null;
  }
}

const short = (sha) => String(sha ?? "").slice(0, 7);

/** The check's answer for one snapshot: { ok: true | false | null, why, evidence }. */
export function architectureVerdict(verdicts, snap) {
  if (!verdicts) return { ok: null, why: "no architecture verdicts: tools/architecture did not run before the matrix" };
  const v = verdicts.get(snap.name);
  if (!v) return { ok: null, why: `tools/architecture gave no verdict for ${snap.name}` };
  if (v.status === "unknown" || !v.commit) return { ok: null, why: `tools/architecture could not read ${snap.name}: ${v.why ?? "unknown"}` };
  if (snap.commit && v.commit !== snap.commit) return { ok: null, why: `the architecture read ${short(v.commit)}, the matrix ${short(snap.commit)}: not the same commit` };
  const evidence = (v.evidence ?? []).map((e) => ({ path: `${e.repo}:${e.path}`, sha256: e.sha256 }));
  if (v.status === "pass") return { ok: true, why: "", evidence };
  const why = v.items.slice(0, 3).map((i) => `${i.kind}: ${i.why}`).join("; ") + (v.items.length > 3 ? ` (+${v.items.length - 3} more)` : "");
  return { ok: false, why, evidence };
}

let cached;
/** The check handler: the verdicts are read once per run. */
export async function architectureCheck(_check, snap) {
  cached ??= loadVerdicts();
  return architectureVerdict(cached, snap);
}
