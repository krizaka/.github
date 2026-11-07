// A small org for the tests: krizaka/.github with the real specification, one asset (Sovkora, two repositories) and one
// library (Krizaka UI). `org(overrides)` returns the arguments of buildArchitecture; each test changes one file.
import { readFileSync } from "node:fs";
import { mapSource } from "../../automation-catalogue/lib/sources.mjs";

const SPEC = readFileSync(new URL("../../../docs/architecture/specification.c4", import.meta.url), "utf8");

const ORG_C4 = `model {
  founder = person 'Founder'
  platform = system 'Krizaka platform' {
    #platform
    metadata {
      home '.github'
    }
    standards = container 'Org standards' {
      metadata {
        repo '.github'
      }
    }
  }
  founder -> platform 'approves'
}`;

export const SOVKORA_C4 = `model {
  extend sovkora {
    engine = library 'Engine' {
      technology 'Java 21'
      metadata {
        repo 'sovkora'
      }
    }
    web = app 'Web app' {
      technology 'Next.js'
      metadata {
        repo 'sovkora-web'
      }
    }
  }
  founder -> sovkora.web 'uses'
  sovkora.web -> sovkora.engine 'calls'
}`;

export const UI_C4 = `model {
  extend ui {
    core = library '@krizaka/ui' {
      metadata {
        repo 'krizaka-ui'
        path 'packages/*'
      }
    }
  }
}`;

const POM = `<project><groupId>com.krizaka.sovkora</groupId><artifactId>sovkora</artifactId><version>1.0.0</version></project>`;

export const REGISTRY = [
  { name: ".github", owner: "krizaka", kind: "none", visibility: "public", status: "Reserved", archived: false, role: "Org" },
  { name: "sovkora", owner: "sovkora", kind: "maven", visibility: "public", status: "Complies", archived: false, role: "Main" },
  { name: "sovkora-web", owner: "sovkora", kind: "app", visibility: "public", status: "Complies", archived: false, role: "Web app" },
  { name: "krizaka-ui", owner: "krizaka", kind: "npm", visibility: "public", status: "Complies", archived: false, role: "Design system" },
];

export const FAMILY = [
  { id: "sovkora", name: "Sovkora", group: "asset", url: "https://www.sovkora.com", home: "sovkora" },
  { id: "ui", name: "Krizaka UI", group: "libraries", url: "https://ui.krizaka.com", home: "krizaka-ui" },
];

function files() {
  return {
    ".github": { "docs/architecture/specification.c4": SPEC, "docs/architecture/org.c4": ORG_C4 },
    sovkora: { "pom.xml": POM, "docs/architecture/sovkora.c4": SOVKORA_C4 },
    "sovkora-web": {
      "package.json": JSON.stringify({ name: "@krizaka/sovkora-web", private: true, dependencies: { "@krizaka/ui": "^1.0.0" } }),
      "package-lock.json": JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/@krizaka/ui": { version: "1.0.0" } } }),
    },
    "krizaka-ui": {
      "package.json": JSON.stringify({ name: "krizaka-ui-repo", private: true }),
      "pnpm-workspace.yaml": "packages:\n  - \"packages/*\"\n",
      "packages/ui/package.json": JSON.stringify({ name: "@krizaka/ui", version: "1.2.0" }),
      "docs/architecture/ui.c4": UI_C4,
    },
  };
}

const TAGS = { "krizaka-ui": ["@krizaka/ui@1.1.0", "@krizaka/ui@1.2.0"], "sovkora-web": ["2026.11.06.1", "2026.11.07.2"] };

/** The arguments of buildArchitecture; `change(files)` edits the file maps before the sources are made. */
export function org(change = () => {}) {
  const all = files();
  change(all);
  const sources = Object.entries(all).map(([name, map], i) => ({ ...mapSource(name, map, String(i + 1).repeat(40)), tags: TAGS[name] ?? [] }));
  return { sources, unread: [], registry: REGISTRY, family: FAMILY, orgVersion: "1.1.0", generatedAt: "2026-11-07T00:00:00.000Z", mode: "local" };
}
