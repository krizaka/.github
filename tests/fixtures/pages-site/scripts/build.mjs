import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("out", { recursive: true });
writeFileSync("out/index.html", "<!doctype html><title>fixture</title><p>fixture site</p>\n");
writeFileSync("out/404.html", "<!doctype html><title>404</title>\n");
console.log(`build ok (${process.env.FIXTURE_FLAG ?? "no flag"})`);
