import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// A bug means a missing guard: the reusable workflow kept pinning the FIRST version of its action (d96437b, uploads under
// site/products/…) after the action moved to sites/<product>/download (7b3a4f39), so every caller's PR carried wrong paths.
const root = new URL("..", import.meta.url).pathname;
const workflow = readFileSync(`${root}.github/workflows/app-videos.yml`, "utf8");

describe("the app-videos reusable workflow", () => {
  it("pins its action to a commit that carries the current action", () => {
    const pin = /actions\/app-videos@([0-9a-f]{40})/.exec(workflow)?.[1];
    assert.ok(pin, "the workflow pins actions/app-videos by commit");
    assert.notEqual(pin, "d96437b6681524d470ca5050f91c1961a45c5906", "the first version of the action (site/products/… paths) is superseded");
    // CI checks out one commit: the history check needs a full clone (it runs locally and in a full checkout).
    if (execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: root, encoding: "utf8" }).trim() === "true") return;
    // What matters is the action's content at the pin, not which commit carries it: Dependabot bumps this self-reference to the
    // newest commit of main (8a90a66 after #426) and the action did not change. The pin is current when the action is identical at
    // the pin and in the working tree (so an old pin, or an action edited without bumping the pin, fails).
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    assert.equal(git(["cat-file", "-t", pin]), "commit", `the pin ${pin.slice(0, 8)} is a commit of this repository`);
    assert.equal(
      git(["rev-parse", `${pin}:actions/app-videos`]),
      git(["rev-parse", "HEAD:actions/app-videos"]),
      `the action at the pin ${pin.slice(0, 8)} differs from the action in this tree: bump the pin to the commit that last changed actions/app-videos`,
    );
  });
});
