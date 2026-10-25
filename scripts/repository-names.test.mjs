import test from "node:test";
import assert from "node:assert/strict";
import { isValidRepositoryName, violationsIn } from "./repository-names.mjs";

test("repository names follow the owner-role vocabulary", () => {
  for (const name of [
    "orazaka",
    "orazaka-mobile",
    "orazaka-desktop",
    "orazaka-admin",
    "orazaka-studio-service",
    "orazaka-worker-media",
    "orazaka-packs",
    "orazaka-cli",
    "orazaka-contracts",
    "orazaka-build",
    "krizaka-ui",
    "krizaka-ts",
    "krizaka-build",
    "krizaka-billing",
    "krizaka-com",
    "krizaka-blog",
    "krizaka-infra",
    "krizaka-motion",
    "krizaka-qa",
    "krizaka-platform",
    "krizaka-desktop",
    "orazaka-web",
    "orazaka-engine",
    "orazaka-edge-service",
    "template-next-app",
  ]) {
    assert.equal(isValidRepositoryName(name), true, name);
  }
});

test("legacy and unknown roles are reported, but the org profile repository is excluded", () => {
  for (const name of [
    "orazaka-web-client",
    "orazaka-mobile-client",
    "orazaka-web-admin",
    "orazaka-ui-kit",
    "orochia-design-system",
    "krizaka-platform-kit",
    "orazaka-edge",
    "orazaka-ai-engine",
    "orazaka-studio",
    "orazaka_uppercase",
    "template-app",
  ]) {
    assert.equal(isValidRepositoryName(name), false, name);
  }
  assert.deepEqual(
    violationsIn(["orazaka", ".github", "orazaka-web-client", "krizaka-ui"]),
    ["orazaka-web-client"],
  );
});
