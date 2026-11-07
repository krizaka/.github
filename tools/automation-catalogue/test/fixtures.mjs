// Fixture repositories for the catalogue's tests: small, in memory, each unit kind once, plus a copy, an unreferenced script and a
// long regex in JavaScript, Python and shell. The long patterns are built (`repeat`), so no long regex lives in this repository.
import { mapSource } from "../lib/sources.mjs";

export const LONG = `${"alpha|".repeat(20)}omega`; // 125 characters
const body = (lines) => `${lines.join("\n")}\n`;
const filler = (n) => Array.from({ length: n }, (_, i) => `  console.log("step ${i}");`);

export const checkLinks = body([
  "// Checks that every link of the docs answers, so a broken link fails the pull request. Run by the CI workflow.",
  'import { helper } from "./lib/util.mjs";',
  "const short = /^a+$/;",
  "export const run = () => helper(short);",
  ...filler(14),
]);

export const appFiles = {
  "package.json": JSON.stringify({ scripts: { lint: "eslint .", "check:links": "node scripts/check-links.mjs", "docs:gen": "node scripts/gen-docs.mjs", unused: "echo nobody", prepare: "git config core.hooksPath .githooks" } }),
  "README.md": "# fx-app\n\nThe old migration is `scripts/old-migration.mjs`, kept for the record.\n",
  ".github/workflows/ci.yml": "name: CI\non:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ./.github/actions/setup\n      - run: node scripts/check-links.mjs\n      - run: grep -E '" + LONG + "' out.txt\n",
  ".github/workflows/nightly.yml": "name: Nightly\non:\n  schedule:\n    - cron: '0 6 * * *'\njobs:\n  backup:\n    runs-on: ubuntu-latest\n    steps:\n      - run: bash scripts/backup.sh\n",
  ".github/workflows/deploy.yml": "name: Deploy\non:\n  release:\n    types: [published]\njobs:\n  go:\n    runs-on: ubuntu-latest\n    steps:\n      - run: ./docker-entrypoint.sh\n",
  ".github/workflows/reusable.yml": "name: Reusable\non:\n  workflow_call:\njobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n",
  ".github/actions/setup/action.yml": "name: Setup\nruns:\n  using: composite\n  steps:\n    - run: echo setup\n      shell: bash\n",
  "scripts/check-links.mjs": checkLinks,
  "scripts/check-links.test.mjs": "import test from 'node:test';\ntest('x', () => {});\n",
  "scripts/lib/util.mjs": "export const helper = (x) => x;\n",
  "scripts/gen-docs.mjs": body(["// Generates the docs pages from the code so they never fall behind; run by `npm run docs:gen`.", ...filler(4)]),
  "scripts/long-regex.mjs": body(["// Reads a list written as one alternation, the thing ADR-026 asks to turn into data. Manual.", `export const words = new RegExp("${LONG}");`, `export const other = /${LONG}/;`]),
  "scripts/legacy.py": `import re\nPATTERN = "${LONG}"\nrx = re.compile(PATTERN)\n`,
  "scripts/lint-sh.sh": `#!/bin/sh\n# Lints the shell scripts of the repository; run by the lint:sh npm script, never by hand.\ngrep -E '${LONG}' file.txt\n[[ $x =~ ^a+$ ]]\n`,
  "scripts/old-migration.mjs": "export const done = true;\n",
  "scripts/backup.sh": "#!/bin/sh\n# Backs up the database each night; started by the nightly workflow only.\ncp a b\n",
  ".githooks/pre-push": "#!/bin/sh\n# Runs the checks before a push; installed by the prepare script.\nnpm run lint\n",
  "docker-entrypoint.sh": "#!/bin/sh\n# The container's entrypoint: starts the service after the checks. Run by the image.\nexec node server.js\n",
  Dockerfile: "FROM node:22\nENTRYPOINT [\"./docker-entrypoint.sh\"]\n",
  ".claude/settings.json": JSON.stringify({ hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "npx krizaka-edit-check" }] }] } }),
  "scripts/__fixtures__/skipped.mjs": "export const x = 1;\n",
};

export const copyFiles = { "scripts/check-links.mjs": checkLinks };

export const agentsFiles = {
  "tools/install.json": JSON.stringify({
    crons: { entries: [{ id: "board-sync", schedule: "17 * * * *", command: "$HOME/.local/bin/kz-run --log board-sync board-sync.py", what: "reconciles the board" }] },
    hooks: [{ event: "PreToolUse", matcher: "Bash", command: "rtk hook claude", what: "token proxy" }],
    git: { path: "~/.config/krizaka/gitconfig-agents" },
  }),
  "tools/board-sync.py": '"""Reconciles the board with the issues and the pull requests; run by the board-sync cron every hour."""\nimport re\nrx = re.compile("a+")\n',
  "tools/githooks/run": "#!/bin/sh\n# The one hook runner: every git hook is a link to it, and it chains the secret scan and the identity guard.\nexec true\n",
  "tools/gitconfig-agents": "[core]\n\thooksPath = ~/.config/krizaka/githooks\n",
};

export const sources = () => [mapSource("fx-app", appFiles), mapSource("fx-copy", copyFiles), mapSource("krizaka-agents", agentsFiles)];
export const owners = new Map([["fx-app", "app-team"], ["krizaka-agents", "lane"]]);
