# Docker base images: tag and digest, both

Decision of 2026-11-03 (krizaka-internal#2309). Applies to every `FROM` of every Dockerfile of the org.

## The rule

Write `FROM image:<tag>@sha256:<digest>`: the tag says which line we follow (`node:22-alpine`), the digest makes the image immutable.
This is what `scripts/pin-supply-chain.mjs` writes and checks (see [supply-chain.md](supply-chain.md), Pinned-Dependencies).

## Why not digest only

SonarCloud `docker:S8431` asks for « either the version tag or the digest, not both ». We refuse its option, because Dependabot
(the docker ecosystem of `.github/dependabot.yml`) reads the **tag** to decide where an image goes next:

- With a tag and a digest, it bumps the tag within its line and the digest together (`node:22-alpine@sha256:A` becomes
  `node:22-alpine@sha256:B`). This is the PR we merge today (for example `bump node from 0a7108b to fe4f6d7`, yomizaka#706).
- With a digest alone, it has no line to follow. `dependabot-core` (`docker/lib/dependabot/docker/update_checker.rb`, branch
  `elsif digest`) resolves a pure digest pin against the tag **`latest`**
  ([source](https://github.com/dependabot/dependabot-core/blob/main/docker/lib/dependabot/docker/update_checker.rb)).
  A `node@sha256:…` with the tag in a comment would therefore be moved to `node:latest` (Debian, newest major), not to the next
  `22-alpine`. The update stays automatic but stops being the one we verified.

A tag in a comment is not read by any updater. So option (a) breaks verifiable automatic updates, and option (b) is chosen.

## The conflict, decided once

`docker:S8431` is deactivated in the org's SonarCloud quality profile for Docker. It is never accepted issue by issue and never
excluded by `sonar.issue.ignore` in a repository.

Apply (SonarCloud organization admin; the built-in « Sonar way » cannot be edited, so it is copied once and the copy becomes the default):

```bash
# SONAR_ADMIN_TOKEN: a user token of an org admin; never printed, never committed
S=https://sonarcloud.io/api/qualityprofiles
curl -su "$SONAR_ADMIN_TOKEN:" -X POST $S/copy -d organization=krizaka -d language=docker \
  -d fromKey=<key of « Sonar way » for docker> -d toName="Krizaka way"
curl -su "$SONAR_ADMIN_TOKEN:" -X POST $S/deactivate_rule -d key=<key of Krizaka way> -d rule=docker:S8431
curl -su "$SONAR_ADMIN_TOKEN:" -X POST $S/set_default -d organization=krizaka -d language=docker -d qualityProfile="Krizaka way"
```

Keys come from `GET /api/qualityprofiles/search?organization=krizaka&language=docker`. Check afterwards that a scan of a Dockerfile
with `node:22-alpine@sha256:…` reports no `docker:S8431`.

## Guard

`pin-supply-chain.mjs --check` (every repo, in CI) fails a `FROM` without a digest. It writes `image:tag@sha256:…`, so the tag stays.
Refusing a digest-only `FROM` in the same check is a follow-up (a pin without a tag leaves Dependabot on `latest`).
