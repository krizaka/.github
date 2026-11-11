import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// krizaka/sovkora became one repository (2026-11-08) and its workspace manifest is gone: actions/detect's default URL answers 404,
// and an unreadable membership is an error, so every krizaka-ci run failed at « Detect the stack », with no job of the stack started.
const src = readFileSync(new URL("../.github/workflows/krizaka-ci.yml", import.meta.url), "utf8");
const FILE = "workspace-manifest.json";

test("krizaka-ci gives actions/detect a manifest it can read: an empty membership list, written before the action runs", () => {
  const write = src.indexOf(`echo '{"repositories":[]}' > "$RUNNER_TEMP/${FILE}"`);
  const action = src.indexOf("krizaka/.github/actions/detect@");
  const input = src.indexOf(`manifest: \${{ runner.temp }}/${FILE}`);
  assert.ok(write > 0, "a step writes the empty list");
  assert.ok(write < action, "before the action runs");
  assert.ok(input > action, "the action is given that file");
});

test("krizaka-ci names no manifest address of the retired workspace", () => {
  assert.doesNotMatch(src, /raw\.githubusercontent\.com\/krizaka\/(?:orazaka|sovkora)\//);
});
