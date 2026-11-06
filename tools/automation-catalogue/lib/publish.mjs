// Publishes the catalogue where the matrix is published: the data branch `conformance-matrix` of krizaka/.github, under
// `automation/` (catalogue.json, catalogue.md, history.json). Reads the previous catalogue and history from the public raw
// address (no API quota), writes with the contents API (one request per file). The branch is data only, never merged.
import { BRANCH, REPO, gh, put } from "../../../scripts/conformance-publish.mjs";

export const FILES = { json: "automation/catalogue.json", md: "automation/catalogue.md", history: "automation/history.json" };
export const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
export const URL_MD = `https://github.com/${REPO}/blob/${BRANCH}/${FILES.md}`;

/** A published JSON file, or null (not published yet, or unreadable: the next daily run starts the history again). */
export async function readPublished(path) {
  try {
    const res = await fetch(`${RAW}/${path}`, { signal: AbortSignal.timeout(30_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Writes the three files on the data branch (the branch exists: the matrix publishes first, else it is created from main). */
export async function publish({ catalogue, markdown, history }) {
  if (!(await gh(`/repos/${REPO}/branches/${BRANCH}`))) {
    const main = await gh(`/repos/${REPO}/git/ref/heads/main`);
    await gh(`/repos/${REPO}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main.object.sha }) });
  }
  const message = `chore(automation): the catalogue of ${catalogue.generatedAt.slice(0, 10)}`;
  await put(FILES.json, `${JSON.stringify(catalogue)}\n`, message);
  await put(FILES.md, markdown, message);
  await put(FILES.history, `${JSON.stringify(history, null, 1)}\n`, message);
  return URL_MD;
}
