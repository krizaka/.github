import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const action = readFileSync(new URL("../actions/sonar-scan/action.yml", import.meta.url), "utf8");

test("the shared Sonar action pins the scanner by commit and takes the token as an input", () => {
  assert.match(action, /SonarSource\/sonarqube-scan-action@[0-9a-f]{40}/);
  assert.match(action, /token:\n\s+description:[^\n]*\n\s+required: true/);
  assert.match(action, /SONAR_TOKEN: \$\{\{ inputs\.token \}\}/);
});
