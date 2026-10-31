import assert from "node:assert/strict";
import test from "node:test";
import { MIN_MAVEN_PIN, mavenPins, pinIsCurrent, problems } from "./check-maven-pin.mjs";

const OLD = "99281c3f4b46dbe4c645dff053b4bfb387a1403d";
const NEW = "6bfc6ea4053a7e6378e0af9a0ec7ef95f963c30a";
const call = (sha) => `    uses: krizaka/.github/.github/workflows/maven.yml@${sha} # main\n`;

test("reads the pins of maven.yml only", () => {
  assert.deepEqual(mavenPins(call(OLD) + "uses: krizaka/.github/.github/workflows/node-ci.yml@" + NEW), [OLD]);
});

test("a pin behind the minimum is refused, the minimum and later pass", () => {
  const status = (pin) => (pin === OLD ? "behind" : "ahead");
  assert.equal(problems("ci.yml", call(OLD), status).length, 1);
  assert.match(problems("ci.yml", call(OLD), status)[0], /predates be08be83/);
  assert.deepEqual(problems("ci.yml", call(NEW), status), []);
  assert.deepEqual(problems("ci.yml", call(MIN_MAVEN_PIN), () => "unknown"), []);
});

test("an unknown compare fails closed", () => {
  assert.equal(pinIsCurrent(OLD, "unknown"), false);
});
