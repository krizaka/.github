import assert from "node:assert/strict";
import { test } from "node:test";

import { check, listeners, senders } from "./dispatch-contract.mjs";

const wf = (types) => `on:\n  repository_dispatch:\n    types: ${types}\n  schedule:\n    - cron: "1 1 * * *"\n`;

test("senders reads the four ways an event is written", () => {
  assert.deepEqual(senders("gh api repos/o/r/dispatches -f event_type=product-release"), ["product-release"]);
  assert.deepEqual(senders('{"event_type":"krizaka-release"}'), ["krizaka-release"]);
  assert.deepEqual(senders("event-type: brand-changed"), ["brand-changed"]);
});

test("listeners reads inline and block lists, and stops at the next trigger", () => {
  assert.deepEqual(listeners(wf("[a-b, c]")), ["a-b", "c"]);
  assert.deepEqual(listeners(wf("\n      - a-b\n      - c")), ["a-b", "c"]);
  assert.deepEqual(listeners("on:\n  push:\n"), []);
});

const W = ".github/workflows/";
test("a sender without listener and a listener nobody sends both fail", () => {
  const files = [
    { repo: "ui", path: `${W}release.yml`, text: "event_type=brand-changed" },
    { repo: ".github", path: `${W}x.yml`, text: wf("[ghost]") },
  ];
  const problems = check(files);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /sender without listener: brand-changed/);
  assert.match(problems[1], /listener nobody sends: ghost/);
});

test("a required listener missing fails even when another workflow listens", () => {
  const files = [
    { repo: "ui", path: `${W}release.yml`, text: "event_type=brand-changed" },
    { repo: ".github", path: `${W}brand-icons-sync.yml`, text: wf("[brand-changed]") },
  ];
  const required = { "brand-changed": [".github:brand-icons-sync.yml", ".github:profile.yml"] };
  assert.deepEqual(check(files, required), [".github:profile.yml must listen to brand-changed and does not"]);
  files.push({ repo: ".github", path: `${W}profile.yml`, text: wf("[brand-changed]") });
  assert.deepEqual(check(files, required), []);
});
