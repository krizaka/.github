# Action pinning — full SHA, exact version in the comment

<!-- summary: Every action is pinned by full commit SHA with its exact release in a comment; zizmor runs online in CI, in the hook and every week. -->

Decision of the CTO, 2026-11-06, after an independent security review ([krizaka-internal#2775](https://github.com/krizaka/krizaka-internal/issues/2775)).

## The rule

Every `uses:` of a workflow or a composite action is `owner/repo@<40-hex sha> # v8.0.2`: the commit, and the exact release it is.

- **The SHA is the pin.** A tag is a pointer anyone with write access can move: tj-actions/changed-files
  ([CVE-2025-30066](https://nvd.nist.gov/vuln/detail/CVE-2025-30066)) and reviewdog/action-setup
  ([CVE-2025-30154](https://nvd.nist.gov/vuln/detail/CVE-2025-30154)) were attacked by re-pointing tags. GitHub's own guidance:
  [pin to a full-length commit SHA, the only immutable reference](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions).
- **The comment is the exact version, never a range or a major.** Hiding the version behind `# v8` is obscurity: a SHA resolves publicly to
  its tag, and a reader (or Dependabot, or zizmor) needs the exact release to know what runs. A range such as `8.2.x` does not exist in `uses:`.
- **First-party reusable workflows** (`krizaka/.github/.github/workflows/...@<sha> # main`) are the one exception: the comment is the branch,
  and `node scripts/pin-supply-chain.mjs --refresh` (propagate-pins) moves them.
- **No tag or branch reference anywhere**, except the placeholders of `workflow-templates/`. This is what lets the organisation enable
  *Require actions to be pinned to a full-length commit SHA*.

## How it is kept

| Check | Where | What it catches |
| :--- | :--- | :--- |
| `node scripts/pin-supply-chain.mjs [dir] --exact --check` | `lint-workflows.yml` here; the weekly audit for every repository | an unpinned `uses:`, a comment that is a major (`# v7`) or an unknown release; without `--check` it rewrites the comment |
| zizmor, **online**, `--min-severity medium` | `security-scan.yml` (every pull request), the hook `krizaka-zizmor`, the weekly audit | known vulnerable actions, impostor commits (a SHA from a fork or a feature branch), ref confusion, over-privilege, injection |
| `actions/security-tools/zizmor.yml` | read by all of the above | the org configuration; `ref-version-mismatch` is off because the exact-version check above is stricter and the `# main` pins trail by design |
| Weekly audit `.github/workflows/actions-audit.yml` | Monday, every active repository, default branch | what a pull request run cannot see: an advisory published after the last merge. Red opens one issue in krizaka-internal, green closes it |
| Dependabot `github-actions` | every repository, monthly, grouped | the new release. It does **not** alert on a SHA-pinned action, hence the weekly audit |

zizmor itself is installed with `pip --require-hashes` (`actions/security-tools/zizmor-requirements.txt`); gitleaks with a sha256.
The hook needs a token for the online audits: `export GH_TOKEN=$(gh auth token)`; without one only the offline audits run.

## Move a pin

Dependabot proposes it (the group keeps the comment). By hand: take the SHA of the release tag
(`git ls-remote https://github.com/<owner>/<repo> 'refs/tags/<tag>*'`, the `^{}` line is the commit for an annotated tag), write
`@<sha> # <tag>`, then `node scripts/pin-supply-chain.mjs . --exact --check`.

## Enforced by the org

Since 2026-11-06 the org's Actions policy requires every action and reusable workflow to be pinned to a full-length commit SHA
(`sha_pinning_required`, krizaka-internal#2801). The policy was turned on after the online zizmor measure on 34 repositories
found every live `uses:` already pinned. A `uses: …@v4` or `…@main` no longer runs anywhere in the org, and that includes a
workflow copied from `workflow-templates/`, which `scripts/pin-supply-chain.mjs` now pins and refreshes too
(`tests/workflow-templates-pin.test.mjs` keeps it so).
