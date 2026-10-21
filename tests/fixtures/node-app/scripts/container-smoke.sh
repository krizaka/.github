#!/usr/bin/env bash
# Runs against the image (node-ci `container-smoke`, from the repository root): proves CI_IMAGE reaches the script.
set -euo pipefail
name=fixture-smoke
docker run -d --name "$name" -p 3000:3000 "${CI_IMAGE:?}" >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 20); do curl -fsS http://localhost:3000/ && exit 0; sleep 1; done
docker logs "$name" | tail -20
exit 1
