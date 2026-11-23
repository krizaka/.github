import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// krizaka-internal#4706: a coverage run executes the secret-scan tests, which need gitleaks on the runner.
const yml = readFileSync(new URL("../.github/workflows/python-ci.yml", import.meta.url), "utf8");

describe("python-ci security-tools input", () => {
  it("is a boolean input, off by default", () => {
    assert.match(yml, /^ {6}security-tools:\n(?: {8}.*\n)*? {8}type: boolean\n(?: {8}.*\n)*? {8}default: false\n/m);
  });

  it("installs the org tools before the tests, pinned by commit, only when asked", () => {
    const step = /- name: Security tools\n((?: {8}.*\n)+)/.exec(yml)?.[1] ?? "";
    assert.match(step, /if: .*inputs\.security-tools/);
    assert.match(step, /uses: krizaka\/\.github\/actions\/security-tools@[0-9a-f]{40} # /);
    assert.ok(yml.indexOf("- name: Security tools") < yml.indexOf("- name: Run\n"), "before the Run step");
  });
});
