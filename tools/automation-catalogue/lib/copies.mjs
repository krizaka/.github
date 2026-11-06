// Finds copies between scripts of the org (ADR-026 principle 1: nothing is copied from one repository to another). Two measures:
// the same content hash (an exact copy), and the same file name in another repository whose lines are at least 80 % alike
// (a diverged twin). Reads the units and the texts, writes `copies` on each unit: [{ repo, path, similarity }].

export const MIN_LINES = 15;
export const TWIN_SIMILARITY = 0.8;
const MAX_LISTED = 10;
const NOISE = ["", "}", "{", "});", "fi", "done", "esac", "else", "then"];

const linesSet = (text) => new Set(text.split("\n").map((l) => l.trim()).filter((l) => l.length > 3 && !NOISE.includes(l)));

/** Share of the lines of two files that both hold (Jaccard over their sets of significant lines). */
export function similarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const line of a) if (b.has(line)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** Marks `copies` on the script units. `texts`: Map(unit id -> text). Returns the units. */
export function markCopies(units, texts) {
  const candidates = units.filter((u) => u.type === "script" && u.lines >= MIN_LINES && texts.has(u.id));
  const byHash = new Map();
  const byName = new Map();
  for (const u of candidates) {
    byHash.set(u.hash, [...(byHash.get(u.hash) ?? []), u]);
    const name = u.path.slice(u.path.lastIndexOf("/") + 1);
    byName.set(name, [...(byName.get(name) ?? []), u]);
  }
  for (const u of candidates) {
    const copies = new Map();
    for (const other of byHash.get(u.hash)) if (other !== u && other.repo !== u.repo) copies.set(other.id, { repo: other.repo, path: other.path, similarity: 1 });
    const mine = linesSet(texts.get(u.id));
    const name = u.path.slice(u.path.lastIndexOf("/") + 1);
    for (const other of byName.get(name)) {
      if (other === u || other.repo === u.repo || copies.has(other.id)) continue;
      const score = similarity(mine, linesSet(texts.get(other.id)));
      if (score >= TWIN_SIMILARITY) copies.set(other.id, { repo: other.repo, path: other.path, similarity: Math.round(score * 100) / 100 });
    }
    u.copies = [...copies.values()].slice(0, MAX_LISTED);
  }
  return units;
}
