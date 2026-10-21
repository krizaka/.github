<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/krizaka/.github/main/profile/assets/krizaka-dark.svg">
  <img src="https://raw.githubusercontent.com/krizaka/.github/main/profile/assets/krizaka-light.svg" alt="Krizaka" width="96">
</picture>

# krizaka/.github

Organisation-wide defaults for every [Krizaka](https://github.com/krizaka) repository:

- `profile/README.md` — the organisation page on GitHub.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md` — community health files,
  used by any repository that does not define its own.
- `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md` — default issue forms and PR template.
- `.github/workflows/node-ci.yml`, `java-ci.yml` — the reusable CI of every Node.js / Maven repository; `deploy/` + `actions/deploy` —
  `krizaka-deploy`, the one guarded way to deploy to DigitalOcean App Platform. See [docs/standards/ci-and-deploy.md](docs/standards/ci-and-deploy.md).
