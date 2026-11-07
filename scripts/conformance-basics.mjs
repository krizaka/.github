// WHY  The conformance matrix is read by several scripts (checks, registry, live reading, report); the few things they all share have one home, so none imports another in a circle.
// WHAT The check types, the cell states, the sort that ignores the locale, the SHA-256, and the file-name tests (workflow, test config, package manifest).
// HOW  Imported by the conformance-*.mjs scripts (and re-exported by scripts/conformance.mjs); nothing to run. Tests: tests/conformance.test.mjs.
// OWNER krizaka/.github (lane platform), ADR-026 phase D. Entry point: scripts/conformance.mjs.

import { createHash } from "node:crypto";

export const CHECK_TYPES = ["path-matches", "lists-rule-ids", "manual", "workflow-calls", "workflow-matches", "workflow-forbids", "file-exists", "file-matches", "manifests-forbid", "no-mention", "no-public-email", "published-no-mention", "all-of", "any-of", "agents-template", "required-check", "merged-result", "queue-reports", "required-profile", "time-limits", "versions-current", "format-declared"];
/** The states of a cell. `unknown` and `manual` are never counted as pass nor as fail. */
export const STATUSES = ["pass", "fail", "unknown", "manual", "n/a"];
/** A sort order that does not depend on the machine's locale (determinism). */
export function byCodePoint(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
export const sha256 = (text) => createHash("sha256").update(text ?? "").digest("hex");
export const FIX_TYPES = ["copy", "append-section", "settings-hook", "agents-template", "manual"];
/** `.github/workflows/<file>.yml` (or `.yaml`): a workflow of the repository. */
export const WORKFLOW_PATH = /^\.github\/workflows\/[^/]+\.ya?ml$/;

/** The test runners' config files that must carry a per-test timeout: playwright, vitest, jest (any module flavour). */
const TEST_RUNNER_CONFIG = /^(playwright|vitest|jest)\.config\.[cm]?[jt]s$/;
/** The file name of a path (after the last slash). */
const baseName = (path) => path.slice(path.lastIndexOf("/") + 1);
/** A test runner's config file, or Maven's `junit-platform.properties`, in any folder. */
export const isTestConfig = (path) => TEST_RUNNER_CONFIG.test(baseName(path)) || baseName(path) === "junit-platform.properties";
/** A `package.json` outside `node_modules`. */
export const isPackageManifest = (path) => baseName(path) === "package.json" && !path.includes("node_modules");
