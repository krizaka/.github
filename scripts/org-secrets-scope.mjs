#!/usr/bin/env node
// WHY  Each org secret must reach only the repositories that use it (audit finding A-10, krizaka-restricted#372, slice 2). The scope
//      is a reviewed file, docs/standards/org-secrets-scope.json, built from the usage and checked against it, not remembered.
// WHAT Pure: `buildScope` (usage → desired scope), `renderScope`, `scopeDiff` (live → desired), `checkScope` (file ↔ usage).
//      CLI (GH_TOKEN = app token with organization secrets: read, live reads):
//        node scripts/org-secrets-scope.mjs --write   regenerates the file from the live usage
//        node scripts/org-secrets-scope.mjs --check   exit 1 when the file differs from the live usage
//      A secret nobody uses is `selected` with zero repositories (not deleted: its revocation is the rotation of krizaka-restricted#383).
//      A repository whose usage could not be read counts as a user of every secret: a wrong « unused » breaks a release. Names only.
// OWNER krizaka/.github (lane security).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FILE = new URL("../docs/standards/org-secrets-scope.json", import.meta.url);
const byName = (a, b) => (a < b ? -1 : Number(a > b));

/** The desired scope { NAME: { visibility: "selected", repositories } } from `secrets` = [{ name }] and `repos` = [{ name, usage }]. */
export function buildScope(secrets, repos) {
  return Object.fromEntries(
    secrets
      .map((s) => s.name)
      .toSorted(byName)
      .map((name) => {
        const users = repos.filter((r) => r.usage.used.has(name.toUpperCase()) || r.usage.unknown.length > 0).map((r) => r.name);
        return [name, { visibility: "selected", repositories: users.toSorted(byName) }];
      }),
  );
}

/** The file's text: `{ "secrets": { ... } }`, sorted by name, ends with a newline. */
export function renderScope(scope) {
  const sorted = Object.fromEntries(Object.keys(scope).toSorted(byName).map((k) => [k, scope[k]]));
  return `${JSON.stringify({ secrets: sorted }, null, 2)}\n`;
}

/** Per live secret `current` = [{ name, visibility, repos }]: what the apply changes to reach `desired`; a mismatch of names is a `problem`. */
export function scopeDiff(current, desired) {
  const rows = current.map((s) => {
    const want = desired[s.name];
    if (!want) return { name: s.name, before: s.visibility, problem: "not in the scope file" };
    const have = s.visibility === "selected" ? (s.repos ?? []) : [];
    const add = want.repositories.filter((r) => !have.includes(r));
    const remove = have.filter((r) => !want.repositories.includes(r));
    return { name: s.name, before: s.visibility, after: want.visibility, add, remove, changed: s.visibility !== want.visibility || add.length > 0 || remove.length > 0 };
  });
  const live = new Set(current.map((s) => s.name));
  const missing = Object.keys(desired).filter((n) => !live.has(n)).map((name) => ({ name, problem: "in the scope file, not in the organization" }));
  return [...rows, ...missing];
}

/** The differences between the checked-in scope and the scope the usage gives, one line each; empty when they agree. */
export function checkScope(file, want) {
  const out = [];
  for (const name of [...new Set([...Object.keys(file), ...Object.keys(want)])].toSorted(byName)) {
    if (!file[name]) out.push(`${name}: the usage has it, the file does not`);
    else if (!want[name]) out.push(`${name}: the file has it, the usage does not`);
    else {
      for (const r of file[name].repositories.filter((x) => !want[name].repositories.includes(x))) out.push(`${name}: the file lists ${r}, the usage does not`);
      for (const r of want[name].repositories.filter((x) => !file[name].repositories.includes(x))) out.push(`${name}: the usage needs ${r}, the file does not list it`);
      if (file[name].visibility !== want[name].visibility) out.push(`${name}: the file says ${file[name].visibility}, the usage says ${want[name].visibility}`);
    }
  }
  return out;
}

export const readScope = () => JSON.parse(readFileSync(FILE, "utf8")).secrets;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { inventory } = await import("./org-secrets-inventory.mjs");
  const { secrets, repos, unread: all } = await inventory();
  // An empty repository (no commit yet) has no workflow, so it uses nothing; any other read failure makes the scope unsafe.
  const unread = all.filter((u) => !u.endsWith("no default branch commit"));
  if (unread.length) {
    console.error(`unread repositories, the scope would be wrong: ${unread.join("; ")}`);
    process.exit(2);
  }
  const want = buildScope(secrets, repos);
  if (process.argv.includes("--write")) {
    writeFileSync(FILE, renderScope(want));
    console.log(`wrote docs/standards/org-secrets-scope.json (${Object.keys(want).length} secrets)`);
  } else {
    const problems = checkScope(readScope(), want);
    for (const p of problems) console.log(`FAIL  ${p}`);
    console.log(problems.length ? `${problems.length} difference(s): regenerate with --write and review.` : "The org-secrets scope file matches the usage.");
    process.exit(problems.length ? 1 : 0);
  }
}
