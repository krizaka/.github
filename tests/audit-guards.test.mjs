import assert from "node:assert/strict";
import { test } from "node:test";
import { missingRequiredChecks, releaseTokenProblems } from "../scripts/audit-guards.mjs";

test("a main without required checks is refused", () => {
  assert.equal(missingRequiredChecks([]).length, 2);
  assert.deepEqual(missingRequiredChecks(["CI gate", "SonarCloud Code Analysis"]), []);
  assert.deepEqual(missingRequiredChecks(["CI gate"]), ["Sonar is not a required check of main"]);
});

const app = `      - id: app
        uses: actions/create-github-app-token@v3
      - uses: googleapis/release-please-action@v5
        with:
          token: \${{ steps.app.outputs.token }}
`;
test("a release workflow with an app token passes", () => assert.deepEqual(releaseTokenProblems(app), []));
test("a fallback to the workflow token after the app token passes", () =>
  assert.deepEqual(releaseTokenProblems(app.replace("token }}", "token || secrets.GITHUB_TOKEN }}")), []));
test("release-please with the workflow token alone is refused", () => {
  const bad = "      - uses: googleapis/release-please-action@v5\n        with:\n          token: ${{ secrets.GITHUB_TOKEN }}\n";
  assert.equal(releaseTokenProblems(bad).length, 2);
});
test("changesets without an app step is refused", () =>
  assert.equal(releaseTokenProblems("      - uses: changesets/action@v2\n        with:\n          github-token: x\n").length, 1));
test("a workflow that is not a release one is ignored", () => assert.deepEqual(releaseTokenProblems("run: echo"), []));
