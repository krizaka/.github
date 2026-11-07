import test from "node:test";
import assert from "node:assert/strict";
import { countSignals, parseTerm, WORD_CHAR } from "../scripts/signal-match.mjs";
import {
  DOLLAR_AMOUNT,
  IPV4_ADDRESS,
  NYC_REGION,
  SONAR_WITH_VULNERABILITIES,
  SSH_COMMAND,
  VULNERABILITY_NOT_COUNTED,
} from "../scripts/public-issue-rules.mjs";

test("a plain term is a case-insensitive substring", () => {
  assert.equal(countSignals("A Fraud and FRAUDULENT", ["fraud"]), 2);
  assert.equal(countSignals("nothing", ["fraud"]), 0);
});

test("| marks the edge of a word, at the start and at the end", () => {
  assert.equal(countSignals("cve CVE-1 xcve cve2", ["|cve|"]), 2);
  assert.equal(countSignals("leak leaked xleak", ["|leak"]), 2);
  assert.equal(countSignals("_api_key STRIPE_API_KEY_X x_API_KEY", ["_api_key|"]), 2);
});

test("^ anchors the start of the text", () => {
  assert.equal(countSignals("security first", ["^security|"]), 1);
  assert.equal(countSignals("a security first", ["^security|"]), 0);
  assert.equal(countSignals("securityx", ["^security|"]), 0);
});

test("? stands for any one character but a line break", () => {
  assert.equal(countSignals("false positive, false-positive, falsepositive, false\npositive", ["false?positive"]), 2);
});

test("matches do not overlap, and the first signal that matches at a position wins", () => {
  assert.equal(countSignals("aaaa", ["aa"]), 2);
  assert.equal(countSignals("margin marge", ["|margin", "|marge|"]), 2);
  assert.equal(countSignals("", ["x"]), 0);
});

test("a RegExp signal is matched at each position, case-insensitively", () => {
  assert.equal(countSignals("29 $ and $5", [DOLLAR_AMOUNT]), 2);
  assert.equal(countSignals("Fraud 10.0.0.1 x", ["fraud", IPV4_ADDRESS]), 2);
});

test("parseTerm reads the markers and lower-cases the rest", () => {
  assert.deepEqual(parseTerm("^Sec|"), { text: "sec", atStart: true, wordStart: false, wordEnd: true });
  assert.deepEqual(parseTerm("|Pric"), { text: "pric", atStart: false, wordStart: true, wordEnd: false });
  assert.deepEqual(parseTerm("a?b"), { text: "a?b", atStart: false, wordStart: false, wordEnd: false });
});

test("WORD_CHAR: one letter, digit or underscore", () => {
  for (const c of ["a", "Z", "0", "_"]) assert.ok(WORD_CHAR.test(c), c);
  for (const c of ["-", " ", ".", "é", "ab"]) assert.ok(!WORD_CHAR.test(c), c);
});

test("the named patterns of the rules", () => {
  assert.ok(VULNERABILITY_NOT_COUNTED.test("3 vulnerabilities") === false);
  assert.ok(VULNERABILITY_NOT_COUNTED.test("a vulnerability"));
  assert.ok(SONAR_WITH_VULNERABILITIES.test("static analysis findings (22 bugs, 59 vulnerabilities)"));
  assert.ok(SONAR_WITH_VULNERABILITIES.test("static analysis findings (1 bug, 1 vulnerability)"));
  assert.ok(!SONAR_WITH_VULNERABILITIES.test("static analysis findings (1 bugs, 0 vulnerabilities)"));
  assert.ok(DOLLAR_AMOUNT.test("29 $") && DOLLAR_AMOUNT.test("$29") && !DOLLAR_AMOUNT.test("$ x"));
  assert.ok(IPV4_ADDRESS.test("host 192.168.1.255.") && !IPV4_ADDRESS.test("1.2.3"));
  assert.ok(NYC_REGION.test("nyc1") && !NYC_REGION.test("nyc12"));
  assert.ok(SSH_COMMAND.test("ssh root") && !SSH_COMMAND.test("sshd"));
});
