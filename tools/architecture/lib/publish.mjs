// Publishes the architecture where the matrix is published: the data branch `conformance-matrix` of krizaka/.github, under
// `architecture/` (architecture.json, summary.md). The branch is data only, never merged; the cockpit and the matrix read it.
import { BRANCH, REPO, gh, put } from "../../../scripts/conformance-publish.mjs";

export const FILES = { json: "architecture/architecture.json", md: "architecture/summary.md" };
export const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
export const URL_MD = `https://github.com/${REPO}/blob/${BRANCH}/${FILES.md}`;

/** Writes the two files on the data branch (created from main when the matrix has not published yet). */
export async function publish({ arch, markdown }) {
  if (!(await gh(`/repos/${REPO}/branches/${BRANCH}`))) {
    const main = await gh(`/repos/${REPO}/git/ref/heads/main`);
    await gh(`/repos/${REPO}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main.object.sha }) });
  }
  const message = `chore(architecture): the architecture of ${arch.generatedAt.slice(0, 10)}`;
  await put(FILES.json, `${JSON.stringify(arch)}\n`, message);
  await put(FILES.md, markdown, message);
  return URL_MD;
}
