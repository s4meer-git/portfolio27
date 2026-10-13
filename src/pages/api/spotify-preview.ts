import type { APIRoute } from "astro";
import { cmsApiUrl } from '@/lib/cms-origin';

/**
 * Resolves the short preview clip for a track, via the CMS.
 *
 * Kept behind our own origin so the browser never talks to Spotify directly and a
 * failure is a plain `{ url: null }` rather than a CORS error in the console.
 */
export const GET: APIRoute = async ({ url }) => {
  const track = url.searchParams.get("track") ?? "";
  const empty = Response.json(
    { url: null },
    { headers: { "Cache-Control": "no-store" } }
  );
  if (!track) return empty;

  try {
    const response = await fetch(
      `${cmsApiUrl}/api/spotify/preview?track=${encodeURIComponent(track)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return empty;
    const body = await response.json();
    return Response.json(
      { url: typeof body?.url === "string" ? body.url : null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return empty;
  }
};
