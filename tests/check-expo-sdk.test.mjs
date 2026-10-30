import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { imageIsXcode, problems, sdkOf } from "../scripts/check-expo-sdk.mjs";

const POLICY = { minimumSdk: 54, minimumXcode: 26 };
const IMAGE = "macos-tahoe-26.5-xcode-26.6";

describe("the Expo SDK", () => {
  it("is read from the range", () => {
    assert.equal(sdkOf("~53.0.0"), 53);
    assert.equal(sdkOf("^57.0.27"), 57);
    assert.equal(sdkOf(undefined), null);
  });
  it("below the minimum is refused (SDK 53 builds with Xcode 16, ITMS-90725)", () => {
    const found = problems({ dependencies: { expo: "~53.0.0" } }, null, POLICY);
    assert.equal(found.length, 1);
    assert.match(found[0], /SDK 53 is below 54/);
  });
  it("at the minimum or above passes", () => {
    assert.deepEqual(problems({ dependencies: { expo: "~54.0.0" } }, null, POLICY), []);
    assert.deepEqual(problems({ dependencies: { expo: "~57.0.27" } }, null, POLICY), []);
  });
  it("an app with no expo dependency is refused, not skipped", () => {
    assert.equal(problems({ dependencies: {} }, null, POLICY).length, 1);
  });
});

describe("the EAS iOS image", () => {
  it("names Xcode 26 or later", () => {
    assert.equal(imageIsXcode(IMAGE, POLICY), true);
    assert.equal(imageIsXcode("sdk-57", POLICY), true);
    assert.equal(imageIsXcode("macos-sequoia-15.5-xcode-16.4", POLICY), false);
    assert.equal(imageIsXcode("sdk-53", POLICY), false);
  });
  it("is never latest, auto or missing", () => {
    for (const image of ["latest", "auto", undefined]) assert.equal(imageIsXcode(image, POLICY), false);
  });
  it("is required in every profile that does not extend another", () => {
    const eas = { build: { production: { ios: { image: IMAGE } }, testflight: { extends: "production" }, preview: {} } };
    const found = problems({ dependencies: { expo: "~57.0.0" } }, eas, POLICY);
    assert.equal(found.length, 1);
    assert.match(found[0], /build\.preview\.ios\.image/);
  });
});
