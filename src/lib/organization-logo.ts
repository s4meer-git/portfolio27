import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cachedImage } from "./image-cache";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const RETRY = 60 * 60 * 1000;
const failures = new Map<string, number>();
const root = process.env.IMAGE_CACHE_DIR || path.join(process.cwd(), ".cache");
const failureFile = (url: string) => path.join(root, "organization-logos", createHash("sha256").update(url).digest("hex") + ".retry.json");

/** Company/school URLs only. Tracking parameters never create duplicate cache entries. */
export function normalizeOrganizationUrl(value?: string | null): string | undefined {
  if (!value || value.length > 2048) return;
  try {
    const url = new URL(value.trim());
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port ||
      !/^(?:www\.|[a-z]{2,3}\.)?linkedin\.com$/i.test(url.hostname)) return;
    const match = url.pathname.match(/^\/(company|school)\/([a-z\d_-]+)(?:\/(?:about|posts|people|life))?\/?$/i);
    if (!match) return;
    return `https://www.linkedin.com/${match[1].toLowerCase()}/${match[2].toLowerCase()}/`;
  } catch { return; }
}

export const organizationLogoUrl = (value?: string | null) => {
  const target = normalizeOrganizationUrl(value);
  return target ? `/api/organization-logo?url=${encodeURIComponent(target)}` : undefined;
};

/** Accept only actual organization-logo images on LinkedIn's CDN, never banners/favicons. */
export function organizationImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value.replaceAll("&amp;", "&"));
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !(url.hostname === "licdn.com" || url.hostname.endsWith(".licdn.com")) ||
      !/\/(?:company|school)-logo(?:_|\/)/i.test(url.pathname)) return;
    return url.href;
  } catch { return; }
}

const decode = (value: string) => value.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[\da-f]+|\d+);/gi, entity => {
  const named: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  const hex = entity.slice(2, -1).toLowerCase().startsWith("x");
  const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
});

/** Extracts public company metadata; doesn't accept LinkedIn's own login-page icon. */
export function extractOrganizationImage(html: string): string | undefined {
  for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const queue: any[] = [JSON.parse(script[1])];
      while (queue.length) {
        const item = queue.shift();
        if (Array.isArray(item)) { queue.push(...item); continue; }
        if (!item || typeof item !== "object") continue;
        const types = [item["@type"]].flat();
        if (types.some((type: string) => /^(Organization|Corporation|EducationalOrganization|CollegeOrUniversity)$/.test(type))) {
          const logo = item.logo?.url ?? item.logo?.contentUrl ?? item.logo;
          const found = organizationImageUrl(logo);
          if (found) return found;
        }
        if (item["@graph"]) queue.push(item["@graph"]);
      }
    } catch { /* A malformed block doesn't prevent reading other public metadata. */ }
  }
  for (const tag of html.matchAll(/<(?:img|meta)\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(match => [match[1].toLowerCase(), decode(match[3])]));
    const values = [attrs["data-delayed-url"], attrs.src, attrs.content];
    for (const value of values) { const found = organizationImageUrl(value); if (found) return found; }
  }
}

async function limitedBody(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error("Response exceeds logo size limit");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

async function publicPageLogo(target: string, fetcher: typeof fetch): Promise<string | undefined> {
  let url = target;
  for (let i = 0; i < 3; i++) {
    const response = await fetcher(url, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { Accept: "text/html" } });
    if (response.status >= 300 && response.status < 400) {
      const next = normalizeOrganizationUrl(new URL(response.headers.get("location") || "", url).href);
      if (!next || next !== target) return;
      url = next; continue;
    }
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return;
    return extractOrganizationImage((await limitedBody(response, 2 * 1024 * 1024)).toString("utf8"));
  }
}

/** Uses the same public metadata provider as link previews; no credentials or screenshots. */
async function metadataLogo(target: string, fetcher: typeof fetch): Promise<string | undefined> {
  const params = new URLSearchParams({ url: target, meta: "true", screenshot: "false",
    "data.organizationLogo.selector": 'img[data-delayed-url*="company-logo"], img[data-delayed-url*="school-logo"]',
    "data.organizationLogo.attr": "data-delayed-url", "data.organizationLogo.type": "image" });
  const response = await fetcher(`https://api.microlink.io/?${params}`, { redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!response.ok) return;
  const data = JSON.parse((await limitedBody(response, 512 * 1024)).toString("utf8"));
  if (data.status !== "success") return;
  for (const candidate of [data.data?.organizationLogo?.url, data.data?.image?.url, data.data?.logo?.url]) {
    const found = organizationImageUrl(candidate); if (found) return found;
  }
}

/** Public-only discovery. Providers can fail independently without losing the other result. */
export async function discoverOrganizationLogo(target: string, fetcher: typeof fetch = fetch) {
  try { const direct = await publicPageLogo(target, fetcher); if (direct) return direct; } catch { /* Try metadata below. */ }
  try { return await metadataLogo(target, fetcher); } catch { return; }
}

export async function organizationLogo(target: string): Promise<Buffer | undefined> {
  const canonical = normalizeOrganizationUrl(target); if (!canonical) return;
  try {
    return await cachedImage("organization-logos", canonical + "|96-webp-v1", WEEK, async () => {
      if (!failures.has(canonical)) {
        const saved = await readFile(failureFile(canonical), "utf8").catch(() => "");
        try { failures.set(canonical, JSON.parse(saved).retryAt || 0); } catch { failures.set(canonical, 0); }
      }
      if ((failures.get(canonical) || 0) > Date.now()) throw new Error("Logo fetch cooling down");
      try {
        const source = await discoverOrganizationLogo(canonical);
        if (!source) throw new Error("No public organization logo available");
        const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(5000) });
        if (!response.ok || !/^image\/(png|jpeg|webp|avif)/.test(response.headers.get("content-type") || "")) throw new Error("Invalid logo response");
        const bytes = await limitedBody(response, 4 * 1024 * 1024);
        const image = await sharp(bytes, { limitInputPixels: 16_000_000 }).rotate()
          .resize(96, 96, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
        failures.set(canonical, 0);
        await writeFile(failureFile(canonical), JSON.stringify({ retryAt: 0 })).catch(() => {});
        return { image, meta: { organization: canonical, source, fetchedAt: new Date().toISOString() } };
      } catch (error) {
        const retryAt = Date.now() + RETRY; failures.set(canonical, retryAt);
        await mkdir(path.dirname(failureFile(canonical)), { recursive: true });
        await writeFile(failureFile(canonical), JSON.stringify({ retryAt })).catch(() => {});
        throw error;
      }
    });
  } catch { return; }
}
