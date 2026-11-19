#!/usr/bin/env node
// WHY  Slice 2 of krizaka-restricted#372 scopes each org secret to the repositories that use it; the CTO reads this table first.
// WHAT Reads live, read-only, the org's Actions secrets (names, visibility, selected repositories) and the workflows of every
//      repository of repos.json that is not archived, and prints: secret → visibility → who uses it (the file that proves it) →
//      who sees it without using it, then the `secrets: inherit` callers. Names only: GitHub never returns a value.
// HOW  GH_TOKEN=<app token with organization secrets: read> node scripts/org-secrets-inventory.mjs [--json <file>]
//      Tests: tests/org-secrets.test.mjs (the pure parts in scripts/org-secrets.mjs).
// OWNER krizaka/.github (lane security).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { WORKFLOW_PATH } from "./conformance-basics.mjs";
import { liveSnapshot, orgSecretsOf } from "./conformance-live.mjs";
import { inventoryRows, renderInventory, secretUsage } from "./org-secrets.mjs";

const isSecretSource = (path) => WORKFLOW_PATH.test(path) || /(^|\/)action\.ya?ml$/.test(path);

export async function inventory(org = "krizaka") {
  const secrets = await orgSecretsOf(org);
  if (!secrets) throw new Error("the token cannot list the org secrets (organization secrets: read)");
  const rows = JSON.parse(readFileSync(new URL("../repos.json", import.meta.url), "utf8")).repositories.filter((r) => !r.archived);
  const repos = [];
  const unread = [];
  for (const row of rows) {
    const snap = await liveSnapshot(row, org);
    if (snap.error) {
      unread.push(`${row.name}: ${snap.error}`);
      continue;
    }
    const files = await Promise.all(snap.paths.filter(isSecretSource).map(async (p) => ({ path: p, text: (await snap.read(p)) ?? "" })));
    const usage = await secretUsage(files, snap.reusable);
    const seen = (await snap.orgSecrets()) ?? [];
    repos.push({ name: row.name, seen: seen.map((s) => s.name), usage });
  }
  return { secrets, repos, unread };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { secrets, repos, unread } = await inventory();
  console.log(renderInventory(inventoryRows(secrets, repos)));
  console.log("\n`secrets: inherit` callers (caller file, job → called workflow):\n");
  for (const r of repos) for (const i of r.usage.inherits) console.log(`- ${r.name}: \`${i.path}\` job \`${i.job}\` → \`${i.target}\``);
  for (const r of repos) for (const u of r.usage.unknown) console.log(`- not judged, ${r.name}: ${u}`);
  for (const u of unread) console.log(`- unread: ${u}`);
  const out = process.argv.indexOf("--json");
  if (out > 0) writeFileSync(process.argv[out + 1], `${JSON.stringify({ secrets, repos: repos.map((r) => ({ ...r, usage: { ...r.usage, used: Object.fromEntries(r.usage.used) } })), unread }, null, 2)}\n`);
}
