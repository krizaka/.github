import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCTS, blockingAlerts } from "../scripts/dev-preview-probe.mjs";

test("only high and critical CodeQL and Dependabot alerts block; Scorecard findings do not", () => {
  const r = blockingAlerts({
    codeql: [
      { tool: { name: "CodeQL" }, rule: { security_severity_level: "high" } },
      { tool: { name: "CodeQL" }, rule: { security_severity_level: "medium" } },
      { tool: { name: "Scorecard" }, rule: { security_severity_level: "high" } },
    ],
    dependabot: [{ security_advisory: { severity: "critical" } }, { security_advisory: { severity: "low" } }],
    secrets: [{}],
  });
  assert.deepEqual(r, { codeql: 1, dependabot: 1, secrets: 1 });
});

test("the products in focus are known, each with a dev host and at least one repository; the paused ones are not probed", () => {
  assert.deepEqual(Object.keys(PRODUCTS).sort(), ["akinaza", "orazaka", "yomizaka"]);
  for (const [name, p] of Object.entries(PRODUCTS)) assert.ok(p.host.startsWith("dev.") && p.repos.length >= 1, name);
});

test("mobile.app-links: the probe knows which products have a native app", () => {
  assert.equal(PRODUCTS.orazaka.mobile, true);
});
