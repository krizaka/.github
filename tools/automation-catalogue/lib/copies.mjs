// Finds copies between scripts of the org (ADR-026 principle 1: nothing is copied from one repository to another). Two measures:
// the same content hash (an exact copy), and the same file name in another repository whose lines are at least 80 % alike
// (a diverged twin). Reads the units and the texts, writes `copies` on each unit: [{ repo, path, similarity }].

export const MIN_LINES = 15;
export const TWIN_SIMILARITY = 0.8;
const MAX_LISTED = 10;
const NOISE = new Set(["", "}", "{", "});", "fi", "done", "esac", "else", "then"]);

const linesSet = (text) => new Set(text.split("\n").map((l) => l.trim()).filter((l) => l.length > 3 && !NOISE.has(l)));

/** Share of the lines of two files that both hold (Jaccard over their sets of significant lines). */
export function similarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const line of a) if (b.has(line)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const baseName = (path) => path.slice(path.lastIndexOf("/") + 1);
const otherRepo = (a, b) => a !== b && a.repo !== b.repo;
const entryOf = (other, similarity) => ({ repo: other.repo, path: other.path, similarity });

function groupBy(list, keyOf) {
  const groups = new Map();
  for (const item of list) groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
  return groups;
}

/** The copies of one script: same content elsewhere, or the same name elsewhere and mostly the same lines. */
function copiesOf(unit, sameHash, sameName, texts) {
  const copies = new Map();
  for (const other of sameHash.filter((o) => otherRepo(unit, o))) copies.set(other.id, entryOf(other, 1));
  const mine = linesSet(texts.get(unit.id));
  for (const other of sameName.filter((o) => otherRepo(unit, o) && !copies.has(o.id))) {
    const score = similarity(mine, linesSet(texts.get(other.id)));
    if (score >= TWIN_SIMILARITY) copies.set(other.id, entryOf(other, Math.round(score * 100) / 100));
  }
  return [...copies.values()].slice(0, MAX_LISTED);
}

/** Marks `copies` on the script units. `texts`: Map(unit id -> text). Returns the units. */
export function markCopies(units, texts) {
  const candidates = units.filter((u) => u.type === "script" && u.lines >= MIN_LINES && texts.has(u.id));
  const byHash = groupBy(candidates, (u) => u.hash);
  const byName = groupBy(candidates, (u) => baseName(u.path));
  for (const u of candidates) u.copies = copiesOf(u, byHash.get(u.hash), byName.get(baseName(u.path)), texts);
  return units;
}
