// Every identity a workflow commits with is one of the org's allowed identities (scripts/commit-identities.json,
// krizaka-internal#2433). A workflow left on an old identity has its push refused by the org's rules: profile.yml committed as
// a prefix-less krizaka-release[bot] after the list was tightened, and the org profile stopped updating (2026-11-05).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const identities = JSON.parse(readFileSync("scripts/commit-identities.json", "utf8"));
const allowed = new Set([...identities.bots, ...identities.humans].flatMap((who) => who.emails));

const workflowFiles = [".github/workflows", "workflow-templates"].flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(dir, name)),
);

test("every workflow commits with an allowed identity", () => {
  const wrong = [];
  for (const file of workflowFiles) {
    for (const match of readFileSync(file, "utf8").matchAll(/user\.email\s+["']?([^"'\s]+)["']?/g)) {
      if (!allowed.has(match[1])) wrong.push(`${file}: ${match[1]}`);
    }
  }
  assert.deepEqual(wrong, []);
});
