// WHY  Each type of check of the conformance matrix (a file exists, a workflow calls, a setting holds, a pin is current…) is one small handler; they live together, apart from the registry that names them and the live reading that feeds them.
// WHAT CHECKS (one handler per check type), `runCheck`, and the verdicts they use (queue reports, merged result, required profile, register, versions).
// HOW  Imported by scripts/conformance-registry.mjs and scripts/conformance.mjs (which re-export it); nothing to run. Tests: tests/conformance.test.mjs.
// OWNER krizaka/.github (lane platform), ADR-026 phase D. Entry point: scripts/conformance.mjs.

import { readFileSync } from "node:fs";
import { problemsOf, warningsOf } from "./agents-md.mjs";
import { problemsOf as readmeProblemsOf, renderRepoBlocks } from "./product-readme.mjs";
import { detectRepoInfo, findRepository, resolveVariant } from "./readme-variants.mjs";
import { formatVerdict } from "./format-declared.mjs";
import { jobsWithoutTimeout, configWithoutTestTimeout, nodeTestWithoutTimeout } from "./check-timeouts.mjs";
import { behind, compareVersions, pinsOf, versionsVerdict } from "./conformance-versions.mjs";
import { candidateOf, isPublicSource, publicEmailHits } from "./public-email.mjs";
import { probeOnlyJobs } from "./scheduled-probe.mjs";
import { tokenPermissionProblems } from "./token-permissions.mjs";
import { callerPermissionProblems } from "./caller-permissions.mjs";
import { orgSecretVerdict, secretUsage } from "./org-secrets.mjs";
import { byCodePoint, isPackageManifest, isTestConfig, WORKFLOW_PATH } from "./conformance-basics.mjs";

/** A workflow step that installs Playwright's browsers. */
const PLAYWRIGHT_INSTALL = /playwright(?:@[\w.^~-]+)?\s+install\b/;
const isLockfile = (path) => /(^|\/)(pnpm-lock\.yaml|package-lock\.json)$/.test(path) && !path.includes("node_modules");
const PNPM_PLAYWRIGHT = /^ {2}'?(playwright|playwright-core|@playwright\/test)@(\d+\.\d+\.\d+)'?:/gm;
const NPM_PLAYWRIGHT = /"node_modules\/(?:[^"]*\/)?(playwright|playwright-core|@playwright\/test)":\s*\{\s*"version":\s*"(\d+\.\d+\.\d+)"/g;
/** The Playwright versions one lockfile locks. */
export function lockedPlaywright(path, body) {
  const re = path.endsWith(".yaml") ? PNPM_PLAYWRIGHT : NPM_PLAYWRIGHT;
  return [...body.matchAll(re)].map((m) => ({ path, name: m[1], version: m[2] }));
}

/** The files that can name a dependency: npm, pnpm workspaces, git submodules, Maven, Gradle (by file name, in any folder). */
export const MANIFEST_FILES = ["package.json", "pnpm-workspace.yaml", ".gitmodules", "pom.xml", "build.gradle", "build.gradle.kts"];
export const isManifest = (path) => MANIFEST_FILES.some((name) => path === name || path.endsWith(`/${name}`));

/** The org repositories whose reusable workflows count as the org's own CI (`uses: krizaka/<repo>/.github/workflows/x.yml@…`). */
export const REUSABLE_WORKFLOW_REPOS = [".github", "sovkora"];
/** `uses: krizaka/<repo>/.github/workflows/<file>.yml@`: a call to a reusable workflow of the org. */
const WORKFLOW_USE = /uses:\s*krizaka\/([\w.-]+)\/\.github\/workflows\/([\w.-]+\.ya?ml)@/g;
const callsOf = (text) =>
  new Set([...text.matchAll(WORKFLOW_USE)].filter((m) => REUSABLE_WORKFLOW_REPOS.includes(m[1])).map((m) => m[2]));

/** The files a secret can be named in for a job: the workflows and the composite actions (`action.yml` anywhere). */
const isSecretSource = (path) => WORKFLOW_PATH.test(path) || /(^|\/)action\.ya?ml$/.test(path);

const verdict = (ok, why) => ({ ok, why: ok ? "" : why });
/** A check that has nothing to read (offline, no token): neither pass nor fail. */
const unread = (what) => ({ ok: null, why: `not read: ${what}` });
const lineOf = (body, re) => {
  const m = re.exec(body);
  return m ? body.slice(0, m.index).split("\n").length : null;
};

/** The ids of the org rules a register lists: the first cell (`id` in backticks) of each table row between the markers. */
export const REGISTER_START = "<!-- org-rules:start -->";
export const REGISTER_END = "<!-- org-rules:end -->";
export function registerIds(text) {
  const from = text.indexOf(REGISTER_START);
  const to = text.indexOf(REGISTER_END);
  if (from < 0 || to < from) return null;
  return text
    .slice(from, to)
    .split("\n")
    .map((l) => /^\|\s*`([\w.-]+)`\s*\|/.exec(l)?.[1])
    .filter(Boolean);
}
export function registerVerdict(text, ids) {
  const listed = registerIds(text ?? "");
  if (!listed) return { ok: false, why: `no ${REGISTER_START} … ${REGISTER_END} table` };
  const missing = ids.filter((id) => !listed.includes(id));
  const extra = listed.filter((id) => !ids.includes(id));
  const twice = listed.filter((id, i) => listed.indexOf(id) !== i);
  const problems = [missing.length && `missing: ${missing.join(", ")}`, extra.length && `not in rules.json: ${extra.join(", ")}`, twice.length && `twice: ${twice.join(", ")}`].filter(Boolean);
  return verdict(problems.length === 0, problems.join("; "));
}

const SONAR_APP_CHECK = /^SonarCloud Code Analysis$/;
const triggersOf = (text) => (text.split(/^jobs:/m)[0].match(/^ {2}([a-z_]+):/gm) ?? []).map((t) => t.trim().replace(":", ""));
const nameOf = (text) => {
  const raw = /^name:[ \t]*["']?([^"'\n#]*)/m.exec(text)?.[1];
  return raw?.trim().toLowerCase() || undefined;
};
const jobKeys = (text) => (text.split(/^jobs:/m)[1]?.match(/^ {2}([\w-]+):/gm) ?? []).map((k) => k.trim().replace(":", "").toLowerCase());

/** Which workflow files produce a required check, and do they run in the queue? */
export function queueReportsVerdict(required, workflows) {
  const problems = [];
  const heads = required.filter((c) => !SONAR_APP_CHECK.test(c)).map((c) => c.split(" / ")[0].trim().toLowerCase());
  const scans = workflows.filter((w) => /sonar-scan@|^[ \t]+sonar:[ \t]*true/m.test(w.text));
  for (const w of workflows) {
    const triggers = triggersOf(w.text);
    if (!triggers.includes("pull_request") || triggers.includes("merge_group")) continue;
    const produces = heads.includes(nameOf(w.text)) || jobKeys(w.text).some((k) => heads.includes(k));
    if (produces || scans.includes(w)) problems.push(`${w.path} produces a required check but has no merge_group trigger`);
  }
  if (required.some((c) => SONAR_APP_CHECK.test(c)) && scans.length === 0) problems.push("« SonarCloud Code Analysis » is required but no CI scan job (sonar-scan) exists: the app does not analyse a merge queue SHA");
  return verdict(problems.length === 0, problems.join("; "));
}

/** How many minors a pin is behind: 0 when current, Infinity when a major behind. */
export function minorsBehind(have, latest) {
  const [hMajor, hMinor] = have.split(".").map(Number);
  const [lMajor, lMinor] = latest.split(".").map(Number);
  if (compareVersions(have, latest) >= 0) return 0;
  return hMajor === lMajor ? lMinor - hMinor : Infinity;
}

/** A site's sources: `app/**`, `lib/**` (at the root or in `site/`, `apps/site/`) and every stylesheet, never dependencies or build output. */
const SITE_SOURCE = /(?:(?:^|\/)(?:app|lib)\/.*\.(?:tsx?|jsx?|mjs|css)|\.css)$/;
const SITE_CODE = /(?:^|\/)(?:app|lib|components)\/.*\.(?:tsx?|jsx?|mjs)$/;
const NOT_SOURCE = /(?:^|\/)(?:node_modules|\.next|dist|build|coverage)\/|\.(?:test|spec)\.[jt]sx?$|(?:^|\/)__tests__\//;

/** `path:line` of what `finder` reports in the site's source files; `except` and `allow` are regexes of paths left out. */
async function sourceHits(snap, check, scope, finder) {
  const spared = [...(check.except ?? []), ...(check.allow ?? [])].map((p) => new RegExp(p));
  const hits = [];
  for (const path of snap.paths.filter((p) => scope.test(p) && !NOT_SOURCE.test(p) && !spared.some((re) => re.test(p))).sort(byCodePoint)) {
    for (const hit of finder((await snap.read(path)) ?? "")) hits.push(`${path}:${hit.line}`);
  }
  return hits;
}

const KZ_FALLBACK = /var\(--kz-[\w-]+\s?,[^)]*\)/g;
const HEX_COLOUR = /(?<![\w&/-])#([0-9a-fA-F]+)(?![\w-])/g;
const COLOUR_FUNCTION = /\b(?:rgb|hsl)a?\(/g;
const HEX_LENGTHS = new Set([3, 4, 6, 8]);
/** The lines that declare a raw colour (`#rgb`, `#rrggbb`, `rgb(`, `hsl(`), outside a `var(--kz-…, fallback)`. */
export function rawColourHits(text) {
  return text.split("\n").flatMap((raw, i) => {
    const line = raw.replace(KZ_FALLBACK, "");
    const hexes = [...line.matchAll(HEX_COLOUR)].filter((m) => HEX_LENGTHS.has(m[1].length));
    return [...hexes, ...line.matchAll(COLOUR_FUNCTION)].map(() => ({ line: i + 1 }));
  });
}

const BIRD_LITERAL = /\bbird\s?[=:]\s?\{?["'`][\w-]+["'`](?! ?\|)/;
const TONE_LITERAL = /\btone\s?[=:]\s?\{?["'`]([\w-]+)["'`]/;
/** The lines that give a mascot's bird as a string literal (`bird="duck"`, `bird: 'owl'`, not a type union), or a mascot's tone other than `own`. */
export function birdLiteralHits(text) {
  return text.split("\n").flatMap((line, i) => {
    const tone = line.includes("Mascot") ? TONE_LITERAL.exec(line)?.[1] : undefined;
    return BIRD_LITERAL.test(line) || (tone !== undefined && tone !== "own") ? [{ line: i + 1 }] : [];
  });
}

/** One handler per check type: each returns { ok, why }. */
const CHECKS = {
  // A tracked path matches `pattern` (the per-repo test a rule requires, named by convention); with `contains`, one of them also holds
  // that text. Paths are sorted, so the first match is always the same one.
  "path-matches": async (check, snap) => {
    const re = new RegExp(check.pattern);
    const hits = snap.paths.filter((p) => re.test(p)).sort(byCodePoint);
    if (hits.length === 0) return { ok: false, why: `no tracked file matches ${check.pattern}` };
    if (!check.contains) return { ok: true, why: "", evidence: [{ path: hits[0] }] };
    const body = new RegExp(check.contains);
    for (const p of hits) {
      const text = (await snap.read(p)) ?? "";
      if (body.test(text)) return { ok: true, why: "", evidence: [{ path: p, line: lineOf(text, body) }] };
    }
    return { ok: false, why: `${hits[0]} (and ${hits.length - 1} more) lack ${check.contains}` };
  },
  // No tracked path matches `pattern`, except the ones that also match `except` (krizaka-internal#3335: an ADR lives in krizaka-internal only).
  "path-forbids": async (check, snap) => {
    const re = new RegExp(check.pattern);
    const spared = check.except ? new RegExp(check.except) : null;
    const hits = snap.paths.filter((p) => re.test(p) && !spared?.test(p)).sort(byCodePoint);
    return verdict(hits.length === 0, `${hits.length} forbidden file(s), e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // The rules register (krizaka-agents docs/rules-register.md) names exactly the rules of this registry: none missing, none extra.
  "lists-rule-ids": async (check, snap) => {
    const text = await snap.read(check.path);
    if (text === null) return { ok: false, why: `no ${check.path}` };
    return registerVerdict(text, snap.ruleIds ?? []);
  },
  // No deterministic check exists yet: the cell says so and is never shown as pass.
  manual: async (check) => ({ ok: null, manual: true, why: check.note }),
  "workflow-calls": async (check, snap) => {
    const wanted = check.byKind ? (check.byKind[snap.kind] ?? []) : check.workflows;
    const calls = callsOf(await snap.workflows());
    return verdict(wanted.some((w) => calls.has(w)), `calls none of ${wanted.join(", ")}`);
  },
  // A caller job grants what the called jobs ask for (krizaka-internal#3342): the called file is read at the SHA the caller pins.
  // `reusable` is absent offline: nothing to prove.
  "caller-permissions": async (_check, snap) => {
    if (!snap.reusable) return unread("the called workflows");
    const problems = [];
    for (const p of snap.paths.filter((x) => WORKFLOW_PATH.test(x))) problems.push(...(await callerPermissionProblems(p, (await snap.read(p)) ?? "", snap.reusable)));
    return verdict(problems.length === 0, problems.slice(0, 3).join("; "));
  },
  "workflow-matches": async (check, snap) =>
    verdict(new RegExp(check.pattern).test(await snap.workflows()), `no workflow matches ${check.pattern}`),
  "workflow-forbids": async (check, snap) => {
    const found = new RegExp(check.pattern).exec(await snap.workflows());
    return { ok: !found, why: found ? `a workflow has « ${found[0]} »` : "" };
  },
  // No scheduled workflow whose only job probes a live URL (krizaka-internal#4151): monitoring lives in DigitalOcean and Grafana.
  "scheduled-probe-only": async (_check, snap) => {
    for (const p of snap.paths.filter((x) => WORKFLOW_PATH.test(x))) {
      const jobs = probeOnlyJobs((await snap.read(p)) ?? "");
      if (jobs.length) return { ok: false, why: `${p}: scheduled, and only probes a live URL (job ${jobs.join(", ")}); alert in DigitalOcean or Grafana instead` };
    }
    return { ok: true, why: "" };
  },
  // Every workflow token is read-only by default (krizaka-internal#4204, Scorecard Token-Permissions): `permissions: {}` or `read-all`
  // at the top, the rest on the job that needs it, each write with a comment saying why (scripts/token-permissions.mjs).
  "token-permissions": async (_check, snap) => {
    const problems = [];
    for (const p of snap.paths.filter((x) => WORKFLOW_PATH.test(x))) {
      for (const { line, why } of tokenPermissionProblems((await snap.read(p)) ?? "")) problems.push(`${p}:${line} ${why}`);
    }
    return verdict(problems.length === 0, `${problems.length} problem(s), e.g. ${problems.slice(0, 3).join("; ")}`);
  },
  "file-exists": async (check, snap) =>
    verdict(check.paths.some((p) => snap.paths.includes(p)), `no ${check.paths[0]}`),
  "file-matches": async (check, snap) => {
    const body = await snap.read(check.path);
    if (body === null) return { ok: false, why: `no ${check.path}` };
    const re = new RegExp(check.pattern);
    return { ...verdict(re.test(body), `${check.path} lacks ${check.pattern}`), evidence: [{ path: check.path, line: lineOf(body, re) }] };
  },
  // The manifests that can name a dependency: npm, pnpm workspaces, git submodules, Maven, Gradle.
  "manifests-forbid": async (check, snap) => {
    const re = new RegExp(check.pattern);
    for (const p of snap.paths.filter(isManifest)) {
      const found = re.exec((await snap.read(p)) ?? "");
      if (found) return { ok: false, why: `${p} names « ${found[0]} »` };
    }
    return { ok: true, why: "" };
  },
  // Several checks, all of which must hold (a rule made of a config file, a script and a CI step): the first failure is the reason.
  "all-of": async (check, snap) => {
    for (const sub of check.checks) {
      const result = await runCheck(sub, snap);
      if (!result.ok) return result;
    }
    return { ok: true, why: "" };
  },
  // Several checks, one of which must hold (the same fact done in a workflow input or in a package script).
  "any-of": async (check, snap) => {
    const results = [];
    for (const sub of check.checks) {
      const result = await runCheck(sub, snap);
      if (result.ok) return result;
      results.push(result);
    }
    // One sub-check could not be read: the cell cannot be called a failure.
    const unreadable = results.some((r) => r.ok !== false);
    return { ok: unreadable ? null : false, why: results.map((r) => r.why).join("; or ") };
  },
  // AGENTS.md rendered from docs/standards/agents-template.md: the marker, the six headings in order, at most 150 lines, the skill linked, relative links resolve, and CLAUDE.md as the one line @AGENTS.md or a symlink.
  "agents-template": async (_check, snap) => {
    const problems = problemsOf(await snap.read("AGENTS.md"), snap.paths, await snap.read("CLAUDE.md"));
    const ok = problems.length === 0;
    const warnings = warningsOf(await snap.read("AGENTS.md"));
    return ok ? { ok, why: warnings.map((w) => `warning: ${w}`).join("; ") } : verdict(ok, problems.join("; "));
  },
  // Every non-archived repository in repos.json has a conforming README and calls product-readme.yml on pull_request and merge_group (krizaka-internal#4672).
  "product-readme": async (check, snap) => readmeVerdict(snap, check),
  // The check is REQUIRED on main (ruleset or branch protection). `requiredChecks` is absent offline: nothing to prove.
  "required-check": async (check, snap) => {
    if (!snap.requiredChecks) return unread("the required checks of main");
    const required = await snap.requiredChecks();
    return verdict(required.includes(check.context), `« ${check.context} » is not a required check on main`);
  },
  // Every required check reports in the merge queue (krizaka-internal#2000): the workflow that produces a required check triggers on
  // `merge_group`, and « SonarCloud Code Analysis » (posted by the SonarCloud app, which never analyses a queue SHA) has a CI scan job.
  // `requiredChecks` is absent offline: nothing to prove.
  "queue-reports": async (_check, snap) => {
    if (!snap.requiredChecks) return unread("the required checks of main");
    return queueReportsVerdict(await snap.requiredChecks(), await Promise.all(snap.paths.filter((p) => WORKFLOW_PATH.test(p)).map(async (p) => ({ path: p, text: (await snap.read(p)) ?? "" }))));
  },
  // Every language of the repository has its formatter declared and run in CI (krizaka-internal#2813): scripts/format-declared.mjs.
  "format-declared": async (_check, snap) => formatVerdict(snap),
  // Time limits everywhere (krizaka-internal#2007): every workflow job has `timeout-minutes` (a job that only calls a reusable workflow is exempt),
  // every test config has a per-test timeout, `node --test` scripts carry --test-timeout. A longer value is fine; none is not.
  "time-limits": async (_check, snap) => {
    for (const p of snap.paths) {
      if (WORKFLOW_PATH.test(p)) {
        const missing = jobsWithoutTimeout((await snap.read(p)) ?? "");
        if (missing.length) return { ok: false, why: `${p}: job \`${missing[0].job}\` has no timeout-minutes` };
      } else if (isTestConfig(p)) {
        const why = configWithoutTestTimeout(p, (await snap.read(p)) ?? "");
        if (why) return { ok: false, why: `${p}: ${why}` };
      } else if (isPackageManifest(p) && nodeTestWithoutTimeout((await snap.read(p)) ?? "")) {
        return { ok: false, why: `${p}: \`node --test\` without --test-timeout` };
      }
    }
    return { ok: true, why: "" };
  },
  // The merged result is tested (krizaka-internal#2000): a merge queue, or branch protection that requires the branch up to date (`strict`).
  // `mergeGuard` is absent offline: nothing to prove.
  "merged-result": async (_check, snap) => {
    if (!snap.mergeGuard) return unread("the merge guard of main");
    return mergedResultVerdict(await snap.mergeGuard());
  },
  // main is protected (krizaka-restricted#368): a ruleset or branch protection that requires a pull request, refuses a force push and
  // refuses deletion. The same reader as merged-result; `mergeGuard` is absent offline: nothing to prove.
  "main-protected": async (_check, snap) => {
    if (!snap.mergeGuard) return unread("the protection of main");
    return mainProtectedVerdict(await snap.mergeGuard());
  },
  // No repository sees an org secret it does not use (krizaka-restricted#372): its workflows and composite actions name it, or a reusable
  // workflow of the org it calls with `secrets: inherit` does (read at the pinned ref). `orgSecrets` is absent offline: nothing to prove.
  "org-secret-scoped": async (_check, snap) => {
    if (!snap.orgSecrets) return unread("the org secrets");
    const seen = await snap.orgSecrets();
    if (!seen) return unread("the org secrets (the token cannot list them)");
    const files = await Promise.all(snap.paths.filter(isSecretSource).map(async (p) => ({ path: p, text: (await snap.read(p)) ?? "" })));
    return orgSecretVerdict(seen, await secretUsage(files, snap.reusable ?? (async () => null)));
  },
  // The required checks on main match the repository profile (apps: CI gate, Sonar, security scan, + journeys / visual where the repo has them;
  // libraries: CI gate, Sonar, security). Each group is a regex over the required contexts; `when` (a workflow it calls) scopes a group to repos that have the thing.
  "required-profile": async (check, snap) => {
    if (!snap.requiredChecks) return unread("the required checks of main");
    const groups = check.byKind[snap.kind] ?? [];
    const required = await snap.requiredChecks();
    const text = await snap.workflows();
    return profileVerdict(groups, required, callsOf(text), snap.name);
  },
  "no-mention": async (check, snap) => {
    // `allow`: path prefixes whose text is history (a released chapter, a changelog). `scan` is absent offline: nothing to prove.
    if (!snap.scan) return unread("the repository's files");
    const allowed = [...(check.allow ?? []), ...(check.allowIn?.[snap.name] ?? [])];
    const hits = (await snap.scan(new RegExp(patternOf(check), "i"))).filter((p) => !allowed.some((a) => p === a || p.startsWith(a) || p.endsWith(`/${a}`)));
    return verdict(hits.length === 0, `${hits.length} file(s) name a departed product, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // No Krizaka address on a public page (krizaka-internal#2764): the scan finds the files naming one, the public sources among them are
  // read and judged line by line (scripts/public-email.mjs); the privacy officer and a customer's own data are the written exceptions.
  "no-public-email": async (check, snap) => {
    if (!snap.scan) return unread("the repository's files");
    const files = (await snap.scan(candidateOf(check))).filter((p) => isPublicSource(p, check));
    const hits = [];
    for (const path of files) {
      for (const hit of publicEmailHits(path, (await snap.read(path)) ?? "", check)) hits.push(`${path}:${hit.line} ${hit.address}`);
    }
    return verdict(hits.length === 0, `${hits.length} Krizaka address(es) on a public page, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // A site stays on the kit (krizaka-internal#3783): no pin of the kit packages more than `maxMinors` minors behind the latest. Minors, not days:
  // in 0.x one minor is the breaking line, so the same count. It reuses `lateOf` (no grace: every pin behind), then measures the distance.
  "kit-lag": async (check, snap) => {
    if (!snap.latest) return unread("the published versions");
    const kit = new Set(check.packages);
    const max = check.maxMinors ?? 1;
    const late = (await lateOf(snap, { ecosystems: ["npm"], graceDays: 0 }))
      .filter((p) => kit.has(p.name))
      .map((p) => ({ ...p, minors: minorsBehind(p.have, p.latest) }))
      .filter((p) => p.minors > max);
    const named = late.map((p) => `${p.name} ${p.have} → ${p.latest}`).join(", ");
    return verdict(late.length === 0, `more than ${max} minor(s) behind the kit: ${named}`);
  },
  // A repository that installs Playwright in a workflow locks it at `minimum` or later (krizaka-internal#4129): older Playwright cannot
  // install its browsers on the Ubuntu 26.04 runners. The version is the fix, never a runs-on pin. Reads every npm and pnpm lockfile.
  "playwright-locked": async (check, snap) => {
    if (!PLAYWRIGHT_INSTALL.test(await snap.workflows())) return verdict(true, "");
    const locked = (await Promise.all(snap.paths.filter(isLockfile).map(async (p) => lockedPlaywright(p, (await snap.read(p)) ?? "")))).flat();
    if (locked.length === 0) return verdict(false, "a workflow installs Playwright but no lockfile locks it");
    const old = locked.filter((l) => compareVersions(l.version, `${check.minimum}.0`) < 0).map((l) => `${l.path} ${l.name} ${l.version}`);
    return verdict(old.length === 0, `Playwright locked below ${check.minimum}: ${old.join(", ")}`);
  },
  // No raw colour in a site's sources (krizaka-internal#3783). `known[repo]` is the ratchet: the violations that exist today, which may only go down.
  "raw-colour": async (check, snap) => {
    const hits = await sourceHits(snap, check, SITE_SOURCE, rawColourHits);
    const known = check.known?.[snap.name] ?? 0;
    return verdict(hits.length <= known, `${hits.length} raw colour(s), ratchet ${known}, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // No string literal for a mascot's bird or tone in a site's code (krizaka-internal#3783): the site renders it from the org data. `allow`: data files of content birds.
  "bird-literal": async (check, snap) => {
    const hits = await sourceHits(snap, check, SITE_CODE, birdLiteralHits);
    return verdict(hits.length === 0, `${hits.length} hard-coded bird(s), e.g. ${hits.slice(0, 3).join(", ")}`);
  },
  // What the repository PUBLISHES: the latest npm tarball of each of its public packages (built CSS/JS included), not its sources.
  // A rule change reached the repository (krizaka-internal#879): no family pin older than a version out for `graceDays`.
  // `latest` is absent offline: nothing to prove.
  "versions-current": async (check, snap) => {
    if (!snap.latest) return unread("the published versions");
    return versionsVerdict(await lateOf(snap, check));
  },
  // `published` is absent offline: nothing to prove. `allow`: files that are history inside a package (its CHANGELOG).
  "published-no-mention": async (check, snap) => {
    if (!snap.published) return unread("the published packages");
    const allowed = check.allow ?? [];
    const hits = (await snap.published(new RegExp(patternOf(check), "i"))).filter((h) => !allowed.some((a) => h.endsWith(`:${a}`) || h.includes(`:${a}`)));
    return verdict(hits.length === 0, `${hits.length} published file(s) name a departed product, e.g. ${hits.slice(0, 3).join(", ")}`);
  },
};

/** A check's pattern: `pattern`, or `patternBase64` when the words it looks for must not be spelled in the registry itself
    (the names of the products that left the org, krizaka/.github#413). */
/** The family pins of a snapshot that are behind what is published. */
export async function lateOf(snap, { ecosystems, graceDays = 7 } = {}) {
  const pins = await pinsOf(snap, ecosystems);
  const latest = {};
  for (const pin of pins) latest[`${pin.ecosystem}:${pin.name}`] = await snap.latest(pin);
  return behind(pins, latest, { now: snap.now, graceDays });
}

/** Per repository: what it pins and what is behind (the versions section of the matrix). */
export async function versionsReport(snapshots) {
  const out = {};
  for (const snap of snapshots) {
    if (!snap.latest) continue;
    out[snap.name] = { pins: await pinsOf(snap), behind: await lateOf(snap) };
  }
  return out;
}

export function patternOf(check) {
  return check.pattern ?? (check.patternBase64 ? Buffer.from(check.patternBase64, "base64").toString("utf8") : undefined);
}

/** The guard of main from what GitHub answers: `rules`, the active rules of main (`/rules/branches/main`), and `classic`, its branch
    protection (`/branches/main/protection`, null when main has none). A part holds when the ruleset or the classic protection gives it:
    GitHub applies both. */
export function guardOf(rules, classic) {
  const has = (type) => rules.some((r) => r.type === type);
  return {
    mergeQueue: has("merge_queue"),
    strict: classic?.required_status_checks?.strict === true || rules.some((r) => r.type === "required_status_checks" && r.parameters?.strict_required_status_checks_policy === true),
    protected: rules.length > 0 || classic !== null,
    pullRequest: has("pull_request") || Boolean(classic?.required_pull_request_reviews),
    forcePushBlocked: has("non_fast_forward") || (classic !== null && classic.allow_force_pushes?.enabled !== true),
    deletionBlocked: has("deletion") || (classic !== null && classic.allow_deletions?.enabled !== true),
  };
}

/** `guard` as `guardOf` reads it: red when main lacks a pull request, the force-push block or the deletion block. */
export function mainProtectedVerdict(guard) {
  if (!guard.protected) return verdict(false, "main has no ruleset and no branch protection: anyone with write access can push, force push or delete it");
  const missing = [
    !guard.pullRequest && "no pull request required",
    !guard.forcePushBlocked && "force push allowed",
    !guard.deletionBlocked && "deletion allowed",
  ].filter(Boolean);
  return verdict(missing.length === 0, `main is not fully protected: ${missing.join(", ")}`);
}

/** `guard` = { mergeQueue, strict } as read from the rulesets and the branch protection of main. */
export function mergedResultVerdict({ mergeQueue, strict }) {
  return verdict(mergeQueue || strict, "main neither has a merge queue nor requires branches to be up to date (strict): a PR can land untested against the merged result");
}

/** The groups of the profile that no required context satisfies; a group with `when` only counts when the repository calls that workflow. */
export function profileVerdict(groups, required, calls, repo = "") {
  const missing = groups
    .filter((g) => !g.when || calls.has(g.when))
    .filter((g) => !g.skipRepos?.includes(repo)) // a private repository cannot have SonarCloud: skipRepos names it, skipWhy says why
    .filter((g) => !required.some((c) => new RegExp(g.pattern).test(c)))
    .map((g) => g.name);
  return verdict(missing.length === 0, `required checks on main lack: ${missing.join(", ")}`);
}

const OWN_ROOT = new URL("../", import.meta.url);
const readOwnJson = (path) => JSON.parse(readFileSync(new URL(path, OWN_ROOT), "utf8"));
const LOCAL_README_CALL = /^[ \t]*uses:[ \t]*\.\/\.github\/workflows\/product-readme\.yml\b/m;

function liveWorkflowText(text) {
  return text.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
}

async function readmeCallerProblem(snap) {
  const workflowPaths = snap.paths.filter((p) => WORKFLOW_PATH.test(p)).sort(byCodePoint);
  let mismatch = null;
  for (const path of workflowPaths) {
    const raw = (await snap.read(path)) ?? "";
    const live = liveWorkflowText(raw);
    const calls = callsOf(live).has("product-readme.yml") || (snap.name === ".github" && LOCAL_README_CALL.test(live));
    if (!calls) continue;
    const triggers = triggersOf(raw);
    const missing = ["pull_request", "merge_group"].filter((t) => !triggers.includes(t));
    if (missing.length === 0) return null;
    mismatch = `${path} calls product-readme.yml without ${missing.join(" and ")}`;
  }
  return mismatch ?? "no workflow calls product-readme.yml on pull_request and merge_group";
}

async function snapshotRepoInfo(snap, variant) {
  const licenceTexts = new Map();
  for (const file of ["LICENSE.md", "LICENSE"]) {
    if (snap.paths.includes(file)) licenceTexts.set(file, (await snap.read(file)) ?? "");
  }
  return detectRepoInfo((p) => snap.paths.includes(p), (p) => licenceTexts.get(p) ?? null, variant.defaultLicence);
}

/** Verifies a repository's README against docs/standards/product-readme.md and its caller workflow. */
export async function readmeVerdict(snap, { reposData, productsData } = {}) {
  const repos = reposData ?? readOwnJson("repos.json");
  const products = productsData ?? readOwnJson("profile/products.json");
  let entry;
  let variant;
  try {
    entry = findRepository(repos, snap.name);
    variant = resolveVariant(entry, products);
  } catch (error) {
    return verdict(false, error.message);
  }
  const wfProblem = await readmeCallerProblem(snap);
  if (wfProblem) return verdict(false, wfProblem);
  const readme = await snap.read("README.md");
  if (readme === null) return verdict(false, "no README.md");
  const repoInfo = await snapshotRepoInfo(snap, variant);
  const schema = variant.schema === "required" ? await snap.read("docs/architecture/c1.mmd") : undefined;
  let blocks;
  try {
    blocks = renderRepoBlocks(entry, products, { schema, schemaPath: "docs/architecture/c1.mmd", repoInfo });
  } catch (error) {
    return verdict(false, error.message);
  }
  const problems = readmeProblemsOf(readme, blocks);
  return verdict(problems.length === 0, problems.join("; "));
}

/** @returns {Promise<{ ok: boolean, why: string }>} */
export async function runCheck(check, snap) {
  const handler = CHECKS[check.type];
  return handler ? handler(check, snap) : { ok: false, why: `unknown check ${check.type}` };
}

