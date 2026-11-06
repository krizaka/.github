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

test("the products in focus are known, each with a host and at least one repository; the paused ones are not probed", () => {
  assert.deepEqual(Object.keys(PRODUCTS).sort(), ["folioviv", "sovkora", "verikora"]);
  for (const [name, p] of Object.entries(PRODUCTS)) assert.ok(p.host.startsWith("dev.") && p.repos.length >= 1, name);
});

test("every app is probed on dev.<product>.com: www is the coming-soon face (krizaka-internal#2659)", () => {
  assert.equal(PRODUCTS.sovkora.host, "dev.sovkora.com");
});

test("mobile.app-links: the probe knows which products have a native app", () => {
  assert.equal(PRODUCTS.sovkora.mobile, true);
});
