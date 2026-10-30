#!/usr/bin/env node
// Org guard audit (docs/standards/bug-means-missing-guard.md): two checks on the focus repositories, run by
// .github/workflows/audit-guards.yml every day.
//   1. `main` requires the `CI gate` and the Sonar checks (a repository without them lets a red PR merge).
//   2. a release workflow (release-please, changesets) opens its PR with a GitHub App token: a PR opened with
//      the workflow's own token never starts CI, so the release PR sits unchecked.
// Pure rules are exported and tested (tests/audit-guards.test.mjs); the network part is `main()` only.
import { pathToFileURL } from "node:url";

export const FOCUS_REPOS = [
  "krizaka-com", "krizaka-ui", "krizaka-ts", "krizaka-build", "krizaka-accounts", "yomizaka", "akinaza",
  "orazaka", "orazaka-web-client", ".github",
];
export const REQUIRED_CHECKS = [
  { label: "CI gate", re: /^CI gate$/ },
  { label: "Sonar", re: /sonar/i },
];

/** @param {string[]} contexts required check names of the branch. @returns {string[]} problems. */
export function missingRequiredChecks(contexts) {
  return REQUIRED_CHECKS.filter(({ re }) => !contexts.some((c) => re.test(c))).map(
    ({ label }) => `${label} is not a required check of main`,
  );
}

const RELEASE_ACTION = /uses:\s*(googleapis\/release-please-action|google-github-actions\/release-please-action|changesets\/action)/;
const APP_TOKEN_ACTION = /uses:\s*actions\/create-github-app-token/;
const WORKFLOW_TOKEN_VALUE = /^\$\{\{\s*(github\.token|secrets\.GITHUB_TOKEN)\s*\}\}$/;

/** A `token:` / `github-token:` line whose value is the workflow token alone (read line by line: no backtracking over the whole file). */
const hasBareWorkflowToken = (yaml) =>
  yaml.split("\n").some((line) => {
    const [key, ...value] = line.trim().split(":");
    return (key === "token" || key === "github-token") && WORKFLOW_TOKEN_VALUE.test(value.join(":").trim());
  });

/** @param {string} yaml text of a workflow. @returns {string[]} problems (empty when it is not a release workflow). */
export function releaseTokenProblems(yaml) {
  if (!RELEASE_ACTION.test(yaml)) return [];
  const problems = [];
  if (!APP_TOKEN_ACTION.test(yaml)) problems.push("a release workflow without a create-github-app-token step: its PR will not run CI");
  if (hasBareWorkflowToken(yaml)) problems.push("the release action is given the workflow token alone");
  return problems;
}

async function api(path, token) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
  });
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
}

/** The gaps of one repository: the required checks of main, and the release workflows' tokens. */
async function repositoryGaps(repo, token) {
  const failures = [];
  const prot = await api(`repos/krizaka/${repo}/branches/main/protection/required_status_checks`, token);
  if (prot.status !== 200) {
    failures.push(`${repo}: required checks unreadable or absent (HTTP ${prot.status}): main is unprotected or the token cannot read it`);
  } else {
    const contexts = [...(prot.body.contexts ?? []), ...(prot.body.checks ?? []).map((c) => c.context)];
    failures.push(...missingRequiredChecks(contexts).map((p) => `${repo}: ${p}`));
  }
  const list = await api(`repos/krizaka/${repo}/contents/.github/workflows`, token);
  for (const f of (list.body ?? []).filter((x) => /\.ya?ml$/.test(x.name))) {
    const file = await api(`repos/krizaka/${repo}/contents/${f.path}`, token);
    if (!file.body) continue;
    const text = Buffer.from(file.body.content, "base64").toString("utf8");
    failures.push(...releaseTokenProblems(text).map((p) => `${repo}/${f.path}: ${p}`));
  }
  return failures;
}

export async function main(env = process.env) {
  const token = env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN (a token that can read branch protection) is required");
  const failures = [];
  for (const repo of FOCUS_REPOS) failures.push(...(await repositoryGaps(repo, token)));
  if (failures.length) {
    console.error(`${failures.length} guard gap(s):\n- ${failures.join("\n- ")}`);
    return 1;
  }
  console.log(`guards ok on ${FOCUS_REPOS.length} repositories`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(await main());
