import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { cmsFetchUrl } from './cms-origin';

/**
 * Images fetched from other services and kept on this server, so the site keeps
 * showing them when the service is slow or gone: the link previews and the location
 * photo. `IMAGE_CACHE_DIR` moves the folder (default `.cache/`); keep it on
 * persistent storage in production.
 */
const ROOT = process.env.IMAGE_CACHE_DIR || path.join(process.cwd(), ".cache");

// Share cold loads as well as refreshes: concurrent requests must not overwrite
// the same temporary file or download/encode the same image repeatedly.
const writing = new Map<string, Promise<Buffer>>();

/** PNG, JPEG or WebP, told apart by their first bytes. */
const imageType = (image: Buffer) =>
  image[0] === 0x89 ? "image/png" : image[0] === 0xff ? "image/jpeg" : "image/webp";

export const imageResponse = (image: Buffer) =>
  new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": imageType(image),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });

export const unavailable = () =>
  new Response("Image unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });

/** Fetches an image, refusing anything that is not one. */
export async function fetchImage(url: string, init?: RequestInit) {
  const response = await fetch(cmsFetchUrl(url), { signal: AbortSignal.timeout(20_000), ...init });
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.startsWith("image/"))
    throw new Error(`${new URL(url).host} answered ${response.status} ${type}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * The image stored under `key` in `folder`, fetched with `load` the first time. A
 * copy older than `maxAgeMs` is still served while a fresh one loads in the
 * background; if that fails, the old copy stays. `load` may also return details
 * about the image (its source, say), stored beside it as JSON.
 */
export async function cachedImage(
  folder: string,
  key: string,
  maxAgeMs: number,
  load: () => Promise<{ image: Buffer; meta?: unknown }>
): Promise<Buffer> {
  const dir = path.join(ROOT, folder);
  const file = path.join(dir, `${createHash("sha256").update(key).digest("hex").slice(0, 32)}.img`);

  const save = () => {
    const pending = writing.get(file);
    if (pending) return pending;
    const request = Promise.resolve().then(async () => {
      const { image, meta } = await load();
      await mkdir(dir, { recursive: true });
      // Written aside and renamed, so a reader never sees half an image.
      await writeFile(`${file}.tmp`, image);
      await rename(`${file}.tmp`, file);
      if (meta !== undefined)
        await writeFile(file.replace(/\.img$/, ".json"), JSON.stringify({ key, ...meta }, null, 2));
      return image;
    });
    writing.set(file, request);
    const settled = () => { if (writing.get(file) === request) writing.delete(file); };
    void request.then(settled, settled);
    return request;
  };

  const cached = await stat(file).catch(() => null);
  if (!cached) return save();
  if (Date.now() - cached.mtimeMs > maxAgeMs && !writing.has(file))
    void save().catch(() => {});
  return readFile(file);
}
