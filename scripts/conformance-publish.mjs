#!/usr/bin/env node
// The matrix is the proof (krizaka-internal#883): the daily run writes it where the founder and the cockpit read it, the
// branch `conformance-matrix` of krizaka/.github (conformance/matrix.md and conformance/matrix.json). The branch is data
// only, never merged; each run replaces both files.
//
//   GH_TOKEN=... node scripts/conformance-publish.mjs matrix.md matrix.json [--dry-run]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const REPO = "krizaka/.github";
export const BRANCH = "conformance-matrix";
export const FILES = { md: "conformance/matrix.md", json: "conformance/matrix.json" };
export const URL_MD = `https://github.com/${REPO}/blob/${BRANCH}/${FILES.md}`;

/** The markdown page: when, which run, then the matrix. */
export const pageOf = ({ generatedAt, runUrl, matrix }) =>
  `# Conformance matrix\n\nGenerated ${generatedAt} by ${runUrl || "a local run"} from \`docs/standards/rules.json\` against main of every active repository of \`repos.json\`. Machine-readable: [matrix.json](matrix.json).\n\n${matrix.trim()}\n`;

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GH_TOKEN ?? ""}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404 && (init.method ?? "GET") === "GET") return null;
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status}`);
  return res.json();
}

async function put(path, text, message) {
  const current = await gh(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
  const body = { message, branch: BRANCH, content: Buffer.from(text).toString("base64"), ...(current?.sha ? { sha: current.sha } : {}) };
  await gh(`/repos/${REPO}/contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function main([mdFile, jsonFile, ...rest]) {
  const json = JSON.parse(readFileSync(jsonFile, "utf8"));
  const page = pageOf({ generatedAt: json.generatedAt ?? new Date().toISOString(), runUrl: process.env.RUN_URL, matrix: readFileSync(mdFile, "utf8") });
  if (rest.includes("--dry-run")) {
    console.log(page);
    return 0;
  }
  if (!(await gh(`/repos/${REPO}/branches/${BRANCH}`))) {
    const main = await gh(`/repos/${REPO}/git/ref/heads/main`);
    await gh(`/repos/${REPO}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main.object.sha }) });
  }
  const message = `chore(conformance): the matrix of ${json.generatedAt ?? "today"}`;
  await put(FILES.md, page, message);
  await put(FILES.json, `${JSON.stringify(json, null, 2)}\n`, message);
  console.log(`Published: ${URL_MD}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
