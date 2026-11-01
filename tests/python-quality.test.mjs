import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/python-quality.yml", import.meta.url), "utf8");

test("install-requirements defaults to true and is read through an env variable", () => {
  assert.match(wf, /install-requirements:\n\s+description:[^\n]*\n\s+type: boolean\n\s+default: true/);
  assert.match(wf, /INSTALL: \$\{\{ inputs\.install-requirements \}\}/);
  assert.match(wf, /\[ "\$INSTALL" = "true" \]/);
});

test("pip-audit still reads the requirements when they are not installed", () => {
  assert.match(wf, /name: pip-audit\n\s+if: \$\{\{ inputs\.requirements != '' \}\}/);
});
