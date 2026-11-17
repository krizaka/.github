// A scheduled workflow whose only job probes a live URL is refused (krizaka-internal#4151): fixtures red and green,
// then the check type through runCheck, then the registry entry (advisory: reported, never a failing security rule).
import test from "node:test";
import assert from "node:assert/strict";
import { probeOnlyJobs } from "../scripts/scheduled-probe.mjs";
import { runCheck } from "../scripts/conformance-checks.mjs";
import {
  snapshotOf,
  validateRules,
  loadRules,
  isSecurity,
} from "../scripts/conformance-registry.mjs";

const PROBE_ONLY = `name: uptime
on:
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:
permissions: {}
jobs:
  ping:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Is the site up?
        run: |
          code=$(curl -s -o /dev/null -w '%{http_code}' https://dev.example.com/api/healthz)
          [ "$code" = "200" ]
`;

const SCHEDULED_WORK = `name: nightly
on:
  schedule:
    - cron: "0 5 * * *"
jobs:
  report:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - run: node scripts/report.mjs
`;

const PUSH_PROBE = PROBE_ONLY.replace(
  /schedule:\n {4}- cron: "\*\/15 \* \* \* \*"/,
  "push:\n    branches: [main]",
);

const PROBE_AND_WORK = PROBE_ONLY.replace(
  "steps:",
  `steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - run: git push origin HEAD:alerts`,
);

test("red: a scheduled workflow whose only job curls a live URL", () => {
  assert.deepEqual(probeOnlyJobs(PROBE_ONLY), ["ping"]);
});

test("green: a scheduled workflow that does real work, a probe that is not scheduled, a probe that also acts", () => {
  assert.deepEqual(probeOnlyJobs(SCHEDULED_WORK), []);
  assert.deepEqual(probeOnlyJobs(PUSH_PROBE), []);
  assert.deepEqual(probeOnlyJobs(PROBE_AND_WORK), []);
});

test("green: a scheduled job that calls a reusable workflow is not a probe", () => {
  const text = `on:\n  schedule:\n    - cron: "0 5 * * *"\njobs:\n  x:\n    uses: krizaka/.github/.github/workflows/ci-node.yml@main\n`;
  assert.deepEqual(probeOnlyJobs(text), []);
});

const snap = (files) =>
  snapshotOf(
    "krizaka-x",
    "node",
    Object.keys(files).sort(),
    async (p) => files[p] ?? null,
    {},
  );
const CHECK = { type: "scheduled-probe-only" };

test("the check names the workflow, and passes on a repository without one", async () => {
  const red = await runCheck(
    CHECK,
    snap({
      ".github/workflows/uptime.yml": PROBE_ONLY,
      ".github/workflows/nightly.yml": SCHEDULED_WORK,
    }),
  );
  assert.equal(red.ok, false);
  assert.match(red.why, /uptime\.yml/);
  const green = await runCheck(
    CHECK,
    snap({ ".github/workflows/nightly.yml": SCHEDULED_WORK }),
  );
  assert.equal(green.ok, true);
});

test("the rule is registered, valid and advisory", () => {
  const rule = loadRules().find((r) => r.check.type === "scheduled-probe-only");
  assert.ok(rule, "rules.json has the rule");
  assert.deepEqual(validateRules([rule]), []);
  assert.equal(isSecurity(rule), false);
});
