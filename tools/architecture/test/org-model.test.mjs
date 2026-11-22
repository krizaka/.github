import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { registry } from "../lib/sources.mjs";

const ORG_C4 = new URL("../../../docs/architecture/org.c4", import.meta.url);

test("every repository the org model binds is an active repository of the registry (no phantom for .github)", () => {
  // A #planned element may bind a repository that is not in scope yet; a current one may not.
  const bound = readFileSync(ORG_C4, "utf8").split(/^\s*\w+ = \w+ '/m).filter((block) => !block.includes("#planned")).flatMap((block) => [...block.matchAll(/^\s*repo '([^']+)'/gm)].map((m) => m[1]));
  const active = new Set(registry().active.map((r) => r.name));
  assert.ok(bound.length > 0);
  assert.deepEqual(bound.filter((name) => !active.has(name)), []);
});

test("the org model declares the agents system (an asset homed in krizaka-agents), the person is aiAgents and there is no platform.tooling", () => {
  const text = readFileSync(ORG_C4, "utf8");
  assert.match(text, /^\s*agents = system 'Krizaka Agents' \{\s*#asset[\s\S]*?home 'krizaka-agents'/m);
  assert.match(text, /^\s*aiAgents = person /m);
  assert.doesNotMatch(text, /^\s*agents = person /m);
  assert.doesNotMatch(text, /tooling\s*=\s*container|platform\.tooling/);
});
