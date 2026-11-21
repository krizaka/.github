// One architecture model per system (krizaka-internal#4552): a model file lives in its system's home only. The same file name
// under docs/architecture/ in two repositories is two models of one system. Pure: the sources in, the duplicates out.
import { readFileSync } from "node:fs";
import { BASE_FILES, MODEL_DIR } from "./model.mjs";

export const PROJECTIONS_FILE = new URL("../../../docs/standards/architecture-public-projections.json", import.meta.url);
/** The known public projections, `{ path: "repo:docs/architecture/x.c4", home, reason, ticket }`: a closed set that only shrinks. */
export const loadProjections = () => JSON.parse(readFileSync(PROJECTIONS_FILE, "utf8")).projections;

const DOTGITHUB = ".github";
const byString = (a, b) => Number(a > b) - Number(a < b);
const nameOf = (path) => path.slice(MODEL_DIR.length);

/** The repository that keeps the model: the one named like the file, else the first that is not krizaka/.github, else the first. */
function keeperOf(file, holders) {
  const stem = file.replace(/\.c4$/, "");
  return holders.find((r) => r === stem) ?? holders.find((r) => r !== DOTGITHUB) ?? holders[0];
}

/** [{ file, keeper, copies: ["repo:path", …] (sorted), strays: [repo, …] }] for every model file held by two repositories or more,
    except a copy listed in `projections` (a public projection of the model kept in its home). */
export function duplicateModels(sources, projections = loadProjections()) {
  const projected = new Set(projections.map((p) => p.path));
  const holders = new Map();
  for (const { name, files } of sources) {
    for (const path of files.keys()) {
      const file = nameOf(path);
      if (!path.startsWith(MODEL_DIR) || !path.endsWith(".c4") || file.includes("/") || BASE_FILES.includes(file)) continue;
      if (projected.has(`${name}:${path}`)) continue;
      holders.set(file, [...(holders.get(file) ?? []), name]);
    }
  }
  return [...holders.entries()]
    .filter(([, repos]) => repos.length > 1)
    .map(([file, repos]) => {
      const keeper = keeperOf(file, repos);
      return { file, keeper, copies: repos.map((r) => `${r}:${MODEL_DIR}${file}`).sort(byString), strays: repos.filter((r) => r !== keeper).sort(byString) };
    })
    .sort((a, b) => byString(a.file, b.file));
}

/** The drift items (kind `invalid`) that fail each repository holding a second copy; the reason names every path. */
export function duplicateItems(duplicates) {
  return duplicates.flatMap((d) => d.strays.map((repo) => ({ kind: "invalid", repo, home: repo, path: `${MODEL_DIR}${d.file}`, why: `${d.file} has a second model: ${d.copies.join(" and ")}; the system's home is ${d.keeper}, delete the copy in ${repo}` })));
}
