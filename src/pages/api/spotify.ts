import type { APIRoute } from "astro";
import { mediaUrl } from "@/lib/cms";
import { cmsApiUrl } from '@/lib/cms-origin';

export const GET: APIRoute = async () => {
  try {
    const response = await fetch(
      `${cmsApiUrl}/api/spotify`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!response.ok) throw new Error("Spotify status unavailable");
    const status = await response.json();
    status.albumCover = mediaUrl(status.albumCover);
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
};
