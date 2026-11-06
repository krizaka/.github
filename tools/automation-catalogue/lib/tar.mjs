// Reads a gzipped tarball (GitHub's `tarball/<sha>` of a repository: one top folder, ustar headers, pax records) into a map
// path -> text. One job: bytes in, tracked text files out. Binary files, links and files over the size cap are left out.
import { gunzipSync } from "node:zlib";

export const MAX_FILE_BYTES = 1_000_000;
const BLOCK = 512;
const field = (head, from, to) => head.subarray(from, to).toString("utf8").split("\0", 1)[0];

/** The `path=` record of a pax extended header ("<length> key=value\n" records), or null. */
export function paxPath(body) {
  const text = body.toString("utf8");
  let at = 0;
  while (at < text.length) {
    const space = text.indexOf(" ", at);
    const length = Number.parseInt(text.slice(at, space), 10);
    if (!(length > 0)) return null;
    const record = text.slice(space + 1, at + length - 1);
    if (record.startsWith("path=")) return record.slice(5);
    at += length;
  }
  return null;
}

/** Every regular text file of the archive, keyed by its path below the top folder. */
export function readTar(gz) {
  const tar = gunzipSync(gz);
  const files = new Map();
  let offset = 0;
  let longPath = null;
  while (offset + BLOCK <= tar.length) {
    const head = tar.subarray(offset, offset + BLOCK);
    if (head[0] === 0) break;
    const size = Number.parseInt(field(head, 124, 136).trim() || "0", 8);
    const type = String.fromCharCode(head[156] || 48);
    const body = tar.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
    if (type === "x") {
      longPath = paxPath(body);
      continue;
    }
    const prefix = field(head, 345, 500);
    const own = field(head, 0, 100);
    const full = longPath ?? (prefix ? `${prefix}/${own}` : own);
    longPath = null;
    if (type !== "0" || size > MAX_FILE_BYTES || body.includes(0)) continue;
    const path = full.split("/").slice(1).join("/");
    if (path) files.set(path, body.toString("utf8"));
  }
  return files;
}
