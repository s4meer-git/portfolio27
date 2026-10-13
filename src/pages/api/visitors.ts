import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { cmsApiUrl } from '@/lib/cms-origin';

export const POST: APIRoute = async ({ request, url }) => {
  const headers = { "Cache-Control": "no-store" };
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return new Response(null, { status: 403, headers });
  const body = await request.json().catch(() => ({}));
  const visitId = body?.visitId || randomUUID();
  if (typeof visitId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitId))
    return Response.json({ error: "Invalid visit ID" }, { status: 400, headers });
  try {
    const response = await fetch(`${cmsApiUrl}/api/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Compatibility with a CMS still running the earlier endpoint during deploy.
      body: JSON.stringify({ visitId, visitorId: visitId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Visitor store unavailable");
    const result = await response.json();
    if (!Number.isSafeInteger(result.ordinal) || result.ordinal < 2789) throw new Error("Invalid count");
    return Response.json({ ...result, totalVisits: result.totalVisits ?? result.ordinal }, { headers });
  } catch {
    return Response.json({ error: "Visitor count unavailable" }, { status: 503, headers });
  }
};
