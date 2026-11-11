// Why: a push is refused locally when the code is not formatted, the way CI would refuse it minutes later (founder 2026-11-07,
// krizaka-internal#2813). The machine hook chain (krizaka-agents tools/fmt.py pre-push) runs the repository's OWN formatter; this
// is the matrix side: every repository declares the formatter of each of its languages and its CI runs it, so main is formatted.
// What: `formatVerdict(snap)` -> { ok, why } for the check type `format-declared` of conformance.mjs. One language, one declaration:
//   TS/JS   a root package.json: the `format:check` script is `prettier --check ...`, run in CI (the workflow, or a lint/check/ci script)
//   Java    a root pom.xml: CI runs Maven (krizaka-parent binds Spotless / google-java-format to `validate`)
//   Python  a ruff configuration: CI runs `ruff format --check`
//   Rust    a Cargo.toml: CI runs `cargo fmt --check` (rust-quality.yml does)
//   OpenTofu a .tf file: CI runs `tofu fmt -check` (krizaka-ci's iac flow does)
// A language the repository does not have asks nothing. Fixtures, templates and vendored folders are not the repository's code.
// How: `node --test tests/format-declared.test.mjs`.
// Owner: platform lane.

const NOT_CODE = /(^|\/)(node_modules|fixtures|buildpack|template|templates|docs)\//;
const JS_FORMAT_SCRIPT = /"format:check"\s*:\s*"prettier --check/;
const JS_IN_CI_SCRIPT = /"(lint|check|ci)[\w:.-]*"\s*:\s*"[^"]*format:check/;
const JS_IN_CI_WORKFLOW = /format:check|format-script/;
const MAVEN_IN_CI = /(maven|java-ci|krizaka-ci|component)\.yml|\bmvnw?\s/;
const RUFF_FORMAT_IN_CI = /ruff format/;
const RUST_FORMAT_IN_CI = /cargo fmt|rust-quality\.yml/;
const TOFU_FORMAT_IN_CI = /(tofu|terraform) fmt|krizaka-ci\.yml/;

const code = (snap) => snap.paths.filter((p) => !NOT_CODE.test(p));
const fail = (why) => ({ ok: false, why });

async function javascript(snap, workflows) {
  if (!snap.paths.includes("package.json")) return null;
  const pkg = (await snap.read("package.json")) ?? "";
  if (!JS_FORMAT_SCRIPT.test(pkg)) return fail("package.json has no `format:check` script running `prettier --check`");
  return JS_IN_CI_WORKFLOW.test(workflows) || JS_IN_CI_SCRIPT.test(pkg) ? null : fail("CI does not run `format:check`");
}

const java = (snap, workflows) => (snap.paths.includes("pom.xml") && !MAVEN_IN_CI.test(workflows) ? fail("CI does not run Maven (Spotless is bound to `validate`)") : null);

async function python(snap, workflows) {
  const configured = snap.paths.includes("ruff.toml") || /\[tool\.ruff/.test((await snap.read("pyproject.toml")) ?? "");
  return configured && !RUFF_FORMAT_IN_CI.test(workflows) ? fail("a ruff configuration, but CI does not run `ruff format --check`") : null;
}

const rust = (snap, workflows) =>
  code(snap).some((p) => /(^|\/)Cargo\.toml$/.test(p)) && !RUST_FORMAT_IN_CI.test(workflows) ? fail("CI does not run `cargo fmt --check`") : null;

const tofu = (snap, workflows) =>
  code(snap).some((p) => p.endsWith(".tf")) && !TOFU_FORMAT_IN_CI.test(workflows) ? fail("CI does not run `tofu fmt -check`") : null;

export async function formatVerdict(snap) {
  const workflows = await snap.workflows();
  for (const language of [javascript, java, python, rust, tofu]) {
    const problem = await language(snap, workflows);
    if (problem) return problem;
  }
  return { ok: true, why: "" };
}
