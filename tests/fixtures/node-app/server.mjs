import { createServer } from "node:http";
createServer((_, res) => res.end("fixture ok\n")).listen(3000);
