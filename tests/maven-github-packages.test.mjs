import assert from "node:assert/strict";
import { test } from "node:test";
import { CREDENTIAL_ENV, SERVER_ID, mergeSettings } from "../scripts/maven-github-packages-settings.mjs";

const SETUP_JAVA = `<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0">
  <servers>
    <server>
      <id>central</id>
      <username>\${env.MAVEN_CENTRAL_USERNAME}</username>
    </server>
  </servers>
</settings>`;

const options = { repositories: ["krizaka-build"], username: "octo" };

test("adds a server, a profile with repository and plugin repository, and activates it", () => {
  const xml = mergeSettings(SETUP_JAVA, options);
  assert.match(xml, new RegExp(`<id>${SERVER_ID}-krizaka-build</id>`));
  assert.equal(xml.match(/<url>https:\/\/maven\.pkg\.github\.com\/krizaka\/krizaka-build<\/url>/g).length, 2);
  assert.match(xml, /<repositories>/);
  assert.match(xml, /<pluginRepositories>/);
  assert.match(xml, new RegExp(`<activeProfile>${SERVER_ID}</activeProfile>`));
});

test("keeps the servers setup-java wrote, inside one <servers>", () => {
  const xml = mergeSettings(SETUP_JAVA, options);
  assert.equal(xml.match(/<servers>/g).length, 1);
  assert.match(xml, /<id>central<\/id>/);
});

test("without a credential the settings hold an environment reference", () => {
  const xml = mergeSettings(SETUP_JAVA, options);
  assert.match(xml, new RegExp(`<password>\\$\\{env\\.${CREDENTIAL_ENV}\\}</password>`));
});

test("with a credential it is written escaped", () => {
  const xml = mergeSettings(SETUP_JAVA, { ...options, credential: "a<b&c" });
  assert.match(xml, /<password>a&lt;b&amp;c<\/password>/);
});

test("creates the settings from nothing", () => {
  const xml = mergeSettings("", options);
  assert.match(xml, /^<settings /);
  assert.match(xml, /<\/settings>\n?$/);
  assert.equal(xml.match(/<profiles>/g).length, 1);
});

test("is idempotent", () => {
  const once = mergeSettings(SETUP_JAVA, options);
  assert.equal(mergeSettings(once, options), once);
});

test("one server and one repository per Krizaka repository", () => {
  const xml = mergeSettings("", { repositories: ["krizaka-build", "krizaka-users"], username: "octo" });
  assert.match(xml, /krizaka-users<\/id>/);
  assert.equal(xml.match(/<server>/g).length, 2);
});

test("refuses an empty list of repositories", () => {
  assert.throws(() => mergeSettings(SETUP_JAVA, { repositories: [], username: "octo" }));
});
