import test from "node:test";
import assert from "node:assert/strict";
import { hasReuse, withReuse } from "./devx-local.mjs";

test("devx-local: adds the setting to an empty or existing file, keeping the other lines", () => {
  assert.equal(withReuse(""), "testcontainers.reuse.enable=true\n");
  assert.equal(withReuse("a=b\n"), "a=b\ntestcontainers.reuse.enable=true\n");
  assert.equal(withReuse("a=b"), "a=b\ntestcontainers.reuse.enable=true\n");
});
test("devx-local: flips a false value, and is idempotent", () => {
  const once = withReuse("x=1\ntestcontainers.reuse.enable=false\ny=2\n");
  assert.equal(once, "x=1\ntestcontainers.reuse.enable=true\ny=2\n");
  assert.equal(withReuse(once), once);
});
test("devx-local: hasReuse reads the setting", () => {
  assert.equal(hasReuse("testcontainers.reuse.enable=true\n"), true);
  assert.equal(hasReuse("testcontainers.reuse.enable=false\n"), false);
  assert.equal(hasReuse(""), false);
});
