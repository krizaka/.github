import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// A bug means a missing guard: the reusable workflow kept pinning the FIRST version of its action (d96437b, uploads under
// site/products/…) after the action moved to sites/<product>/download (7b3a4f39), so every caller's PR carried wrong paths.
const root = new URL("..", import.meta.url).pathname;
const workflow = readFileSync(`${root}.github/workflows/app-videos.yml`, "utf8");

describe("the app-videos reusable workflow", () => {
  it("pins its action to the commit that last changed it", () => {
    const pin = /actions\/app-videos@([0-9a-f]{40})/.exec(workflow)?.[1];
    assert.ok(pin, "the workflow pins actions/app-videos by commit");
    assert.notEqual(pin, "d96437b6681524d470ca5050f91c1961a45c5906", "the first version of the action (site/products/… paths) is superseded");
    // CI checks out one commit: the history check needs a full clone (it runs locally and in a full checkout).
    if (execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: root, encoding: "utf8" }).trim() === "true") return;
    const last = execFileSync("git", ["log", "-1", "--format=%H", "--", "actions/app-videos"], { cwd: root, encoding: "utf8" }).trim();
    // The newest commit touching the action cannot be the one that bumps the pin (its own hash is not known yet): the pin is the
    // action's last commit, or the workflow is being changed together with it.
    assert.ok(last === pin || last === "", `the pin ${pin.slice(0, 8)} is not the action's last commit ${last.slice(0, 8)}`);
  });
});
