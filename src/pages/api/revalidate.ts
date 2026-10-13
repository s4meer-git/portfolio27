import type { APIRoute } from "astro";
import { invalidatePortfolio } from "@/lib/cms";

/**
 * Called by the CMS after every save so the next page load reads fresh content.
 * When REVALIDATE_SECRET is set, the CMS must send the same value.
 */
export const POST: APIRoute = ({ request }) => {
  const secret = process.env.REVALIDATE_SECRET || "";
  if (secret && request.headers.get("x-revalidate-secret") !== secret)
    return new Response(null, { status: 401 });
  invalidatePortfolio();
  return new Response(null, { status: 204 });
};
