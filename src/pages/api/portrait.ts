import type { APIRoute } from "astro";
import sharp from "sharp";
import { cachedImage, fetchImage, imageResponse, unavailable } from "@/lib/image-cache";
import { portraitDefinitions } from "@/lib/portraits";

export const GET: APIRoute = async ({ locals, url }) => {
  const profile = locals.portfolio.site.profile;
  const portrait = portraitDefinitions(profile).find(item => item.name === (url.searchParams.get("variant") || "fortnite"));
  if (!portrait) return new Response("Portrait unavailable", { status: 404 });
  const dark = url.searchParams.get("theme") === "dark";
  const source = dark ? portrait.darkSource : portrait.lightSource;
  if (!source) return unavailable();
  const updatedAt = dark ? portrait.darkVersion : portrait.lightVersion;
  const key = `${source}|${updatedAt || ""}|480-webp-v2`;
  try {
    // The shared cache coalesces concurrent downloads and encodes.
    const image = await cachedImage("portraits", key, 86_400_000, async () => {
      const bytes = await fetchImage(source);
      const metadata = await sharp(bytes).metadata();
      // Already optimized portraits retain their exact pixels and compression.
      const image = metadata.format === "webp" && metadata.width === 480 && metadata.height === 480 && !metadata.orientation
        ? bytes : await sharp(bytes)
        .rotate()
        .resize(480, 480, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
      return { image };
    });
    return imageResponse(image);
  } catch {
    return unavailable();
  }
};
