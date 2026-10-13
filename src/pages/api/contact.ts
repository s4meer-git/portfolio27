import type { APIRoute } from "astro";
import { cmsApiUrl } from '@/lib/cms-origin';

/**
 * The contact form's endpoint. Forwards the message to the CMS, which validates,
 * rate-limits and stores it (Content Manager → Messages). Same-origin only, so other
 * sites cannot post through it.
 */
export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const headers = { "Cache-Control": "no-store" };
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin)
    return Response.json({ ok: false }, { status: 403, headers });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400, headers });
  }

  try {
    const response = await fetch(
      `${cmsApiUrl}/api/messages/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientAddress,
          "User-Agent": request.headers.get("User-Agent") || "",
          "Accept-Language": request.headers.get("Accept-Language") || "",
        },
        body: JSON.stringify({
          name: body.name,
          email: body.email,
          message: body.message,
          company: body.company,
          timeZone: body.timeZone,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    const result = await response.json().catch(() => ({ ok: false }));
    return Response.json(result, { status: response.status, headers });
  } catch {
    return Response.json(
      { ok: false, error: "Could not send right now. Please email me instead." },
      { status: 503, headers }
    );
  }
};
