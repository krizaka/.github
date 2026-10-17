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

test("the seven products are known, each with a host and at least one repository", () => {
  assert.deepEqual(Object.keys(PRODUCTS).sort(), ["akinaza", "kachizaka", "orazaka", "orochia", "yasakia", "yomizaka", "yororis"]);
  for (const p of Object.values(PRODUCTS)) assert.ok(p.host.startsWith("dev.") && p.repos.length >= 1);
});

test("mobile.app-links: Orochia declares its app-links contract, the probe knows which products have a native app", () => {
  assert.equal(PRODUCTS.orochia.appLinks.iosBundleId, "com.krizaka.orochia");
  assert.ok(PRODUCTS.orochia.appLinks.paths.includes("/@*"));
  assert.equal(PRODUCTS.orazaka.mobile, true);
});
