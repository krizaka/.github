#!/usr/bin/env node
// WHY  Applies docs/standards/org-secrets-scope.json to the org's Actions secrets (krizaka-restricted#372, slice 2).
// WHAT Dry-run by default: per secret, the visibility before/after and the repositories added/removed.
//        GH_TOKEN=<app token> node scripts/org-secrets-apply.mjs            prints the diff
//        GH_TOKEN=<app token> node scripts/org-secrets-apply.mjs --apply    writes, one secret at a time, re-reading after each, stopping at the first mismatch
//      GitHub has no endpoint that changes a secret's visibility without re-sending its value (PUT needs `encrypted_value`, there is no PATCH:
//      it answers 404), and the value is never readable. So a secret whose visibility is not `selected` is a MANUAL gesture (Settings →
//      Secrets → Actions → the secret → Repository access → Selected repositories); this prints it with the exact repositories. A secret
//      already `selected` gets its repository list by `PUT /orgs/{org}/actions/secrets/{name}/repositories`. Names only; no value is read or printed.
// OWNER krizaka/.github (lane security).
import { pathToFileURL } from "node:url";
import { orgSecretsOf } from "./conformance-live.mjs";
import { readScope, scopeDiff } from "./org-secrets-scope.mjs";

const ORG = "krizaka";

/** What to do per changed secret: `api` (visibility already selected: set the list) or `manual` (visibility must change in the UI). */
export function applyPlan(diff) {
  const changed = diff.filter((d) => d.changed);
  return { api: changed.filter((d) => d.before === "selected"), manual: changed.filter((d) => d.before !== "selected") };
}

export function renderDiff(diff, desired) {
  return diff.map((d) => {
    if (d.problem) return `${d.name}: PROBLEM ${d.problem}`;
    if (!d.changed) return `${d.name}: already as scoped (${d.after}, ${desired[d.name].repositories.length} repositories)`;
    return `${d.name}: visibility ${d.before} → ${d.after}; add [${d.add.join(", ")}]; remove [${d.remove.join(", ")}]`;
  });
}

export function gesture(d, desired) {
  const repos = desired[d.name].repositories;
  return `${d.name}: Repository access → Selected repositories → ${repos.length ? repos.join(", ") : "none (zero repositories)"}`;
}

/**
 * Applies the API part one secret at a time through `http(method, path, body) -> parsed JSON | null`; re-reads the list after each and
 * throws at the first mismatch (the rest stays untouched). `idOf(repo)` gives a repository id.
 */
export async function applyOne(d, desired, http, idOf, org = ORG) {
  const want = desired[d.name].repositories.toSorted();
  const path = `/orgs/${org}/actions/secrets/${encodeURIComponent(d.name)}/repositories`;
  await http("PUT", path, { selected_repository_ids: await Promise.all(want.map(idOf)) });
  const got = ((await http("GET", `${path}?per_page=100`))?.repositories ?? []).map((r) => r.name).toSorted();
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${d.name}: after the write the list is [${got.join(", ")}], expected [${want.join(", ")}]`);
}

function realHttp(token) {
  return async (method, path, body) => {
    const res = await fetch(`https://api.github.com${path}`, { method, headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`${method} ${path.split("?")[0]}: ${res.status}`);
    return res.status === 204 ? null : res.json();
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const desired = readScope();
  const current = await orgSecretsOf(ORG);
  if (!current) throw new Error("the token cannot list the org secrets");
  const diff = scopeDiff(current, desired);
  for (const line of renderDiff(diff, desired)) console.log(line);
  if (diff.some((d) => d.problem)) process.exit(1);
  const plan = applyPlan(diff);
  if (plan.manual.length) {
    console.log("\nManual gestures (GitHub cannot change a visibility without the value):");
    for (const d of plan.manual) console.log(`- ${gesture(d, desired)}`);
  }
  if (process.argv.includes("--apply")) {
    const http = realHttp(process.env.GH_TOKEN);
    const ids = new Map();
    const idOf = async (name) => ids.get(name) ?? ids.set(name, (await http("GET", `/repos/${ORG}/${name}`)).id).get(name);
    for (const d of plan.api) {
      try {
        await applyOne(d, desired, http, idOf);
        console.log(`applied ${d.name}`);
      } catch (e) {
        console.error(`stopped: ${e.message}`);
        process.exit(1);
      }
    }
  } else console.log("\nDry run: nothing written (--apply writes).");
}
