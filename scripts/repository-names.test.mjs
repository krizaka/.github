import test from "node:test";
import assert from "node:assert/strict";
import { isValidRepositoryName, violationsIn } from "./repository-names.mjs";

test("repository names follow the owner-role vocabulary, owners being the commercial names", () => {
  for (const name of [
    "sovkora",
    "sovkora-mobile",
    "sovkora-desktop",
    "sovkora-admin",
    "sovkora-studio-service",
    "sovkora-worker-media",
    "sovkora-packs",
    "sovkora-cli",
    "sovkora-contracts",
    "sovkora-build",
    "sovkora-web",
    "sovkora-engine",
    "sovkora-edge-service",
    "verikora",
    "folioviv",
    "kridoc",
    "kridoc-web",
    "krizaka-ui",
    "krizaka-ts",
    "krizaka-java",
    "krizaka-com",
    "krizaka-blog",
    "krizaka-infra",
    "krizaka-lab",
    "krizaka-rust",
    "krizaka-composer",
    "krizaka-cla-signatures",
    "krizaka-template-web",
    "krizaka-template-desktop",
  ]) {
    assert.equal(isValidRepositoryName(name), true, name);
  }
});

test("code names, legacy roles and unknown names are reported, but the org profile repository is excluded", () => {
  for (const name of [
    "orazaka",
    "yomizaka",
    "akinaza",
    "kachizaka",
    "orazaka-web-client",
    "sovkora-web-client",
    "sovkora-mobile-client",
    "sovkora-ui-kit",
    "sovkora-design-system",
    "krizaka-platform-kit",
    "krizaka-build",
    "krizaka-tauri-kit",
    "template-next-app",
    "sovkora_uppercase",
    "template-app",
  ]) {
    assert.equal(isValidRepositoryName(name), false, name);
  }
  assert.deepEqual(violationsIn(["sovkora", ".github", "sovkora-ui-kit", "krizaka-ui"]), ["sovkora-ui-kit"]);
});
