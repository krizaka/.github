import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const MARKER = "à valider par l'avocat";
const ROOTS = ["docs/legal", "docs/privacy", "docs/security/isms"];

// What must never reach a public repository.
export const PRIVATE_PATTERNS = [
  ["postal code", /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/],
  ["ten-digit number (NEQ)", /\b\d{10}\b/],
  ["phone number", /\b\d{3}[ .-]\d{3}[ .-]\d{4}\b/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["secret token", /\b(sk_live_|ghp_|xox[bp]-|AKIA)[A-Za-z0-9]{8,}/],
];
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

export function leaks(text) {
  const found = PRIVATE_PATTERNS.filter(([, re]) => re.test(text)).map(([n]) => n);
  for (const m of text.matchAll(EMAIL)) {
    if (!/(^|\.)krizaka\.com$/.test(m[1]) && !/(^|\.)users\.noreply\.github\.com$/.test(m[1])) found.push(`e-mail ${m[0]}`);
  }
  return found;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("leak detector catches private data and lets public data through", () => {
  assert.deepEqual(leaks("Write to privacy@krizaka.com"), []);
  assert.ok(leaks("H2X 1Y4").length);
  assert.ok(leaks("NEQ 1234567890").length);
  assert.ok(leaks("call 514-555-1234").length);
  assert.ok(leaks("me@gmail.com").length);
  assert.ok(leaks("sk_live_abcdefgh1234").length);
});

test("every legal / privacy / ISMS document is marked and leaks nothing", () => {
  const files = ROOTS.flatMap(walk).filter((f) => /\.(md|json)$/.test(f));
  assert.ok(files.length > 0);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    assert.deepEqual(leaks(text), [], `${f} holds private data`);
    if (f.endsWith(".md")) assert.ok(text.includes(MARKER), `${f} lacks « ${MARKER} »`);
  }
});
