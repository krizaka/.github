#!/usr/bin/env node
// Adds the Krizaka GitHub Packages repositories to a Maven settings.xml (merging into the one actions/setup-java wrote).
//
// Krizaka libraries are published to Maven Central by a human pressing Publish (a release on Central can never be deleted),
// so a development build resolves the version just released from GitHub Packages (maven.pkg.github.com/krizaka/<repository>),
// where CI publishes it first. The repositories are declared here, in the settings, never in a POM: a POM that named them
// would make every consumer of Central need a GitHub credential.
//
//   node maven-github-packages-settings.mjs --settings ~/.m2/settings.xml --repositories "krizaka-build" --username "$GITHUB_ACTOR"
//
// The credential is read by Maven from the environment of the job: the settings file holds a reference, never a value.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const SERVER_ID = "github-krizaka";
export const CREDENTIAL_ENV = "MAVEN_GITHUB_PACKAGES_TOKEN";

const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Puts `item` at the end of `<tag>…</tag>`, creating the element before `</settings>` when the file has none. */
function append(xml, tag, item) {
  const close = `</${tag}>`;
  if (xml.includes(close)) return xml.replace(close, `${item}\n  ${close}`);
  return xml.replace("</settings>", `  <${tag}>\n${item}\n  ${close}\n</settings>`);
}

const repositoryXml = (kind, repository, org) => `        <${kind}>
          <id>${SERVER_ID}-${repository}</id>
          <url>https://maven.pkg.github.com/${org}/${repository}</url>
          <releases><enabled>true</enabled></releases>
          <snapshots><enabled>false</enabled></snapshots>
        </${kind}>`;

const serverXml = (repository, username) => `    <server>
      <id>${SERVER_ID}-${repository}</id>
      <username>${escapeXml(username)}</username>
      <password>\${env.${CREDENTIAL_ENV}}</password>
    </server>`;

/** The settings with one server per repository, the profile (repositories and plugin repositories) and its activation. Idempotent. */
export function mergeSettings(xml, { repositories, username, org = "krizaka" }) {
  if (!repositories.length) throw new Error("no repository to add");
  if (xml.includes(`<id>${SERVER_ID}-${repositories[0]}</id>`)) return xml;
  const base = xml.includes("</settings>") ? xml : '<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0">\n</settings>\n';
  const servers = repositories.map((r) => serverXml(r, username)).join("\n");
  const profile = `    <profile>
      <id>${SERVER_ID}</id>
      <repositories>
${repositories.map((r) => repositoryXml("repository", r, org)).join("\n")}
      </repositories>
      <pluginRepositories>
${repositories.map((r) => repositoryXml("pluginRepository", r, org)).join("\n")}
      </pluginRepositories>
    </profile>`;
  let out = append(base, "servers", servers);
  out = append(out, "profiles", profile);
  return append(out, "activeProfiles", `    <activeProfile>${SERVER_ID}</activeProfile>`);
}

function option(argv, name, fallback) {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const settings = option(process.argv, "settings", `${process.env.HOME}/.m2/settings.xml`);
  const repositories = option(process.argv, "repositories", "krizaka-build").split(/[\s,]+/).filter(Boolean);
  const username = option(process.argv, "username", process.env.GITHUB_ACTOR ?? "krizaka-agents[bot]");
  const xml = existsSync(settings) ? readFileSync(settings, "utf8") : "";
  mkdirSync(dirname(settings), { recursive: true });
  writeFileSync(settings, mergeSettings(xml, { repositories, username }));
  console.log(`GitHub Packages repositories added to ${settings}: ${repositories.join(", ")}`);
}
