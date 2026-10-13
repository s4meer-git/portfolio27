import type { APIRoute } from "astro";
import { imageResponse } from "@/lib/image-cache";
import { normalizeOrganizationUrl, organizationLogo } from "@/lib/organization-logo";

export const GET: APIRoute = async ({ locals, url }) => {
  const target = normalizeOrganizationUrl(url.searchParams.get("url"));
  const entries = [...locals.portfolio.experiences, ...locals.portfolio.education];
  if (!target || !entries.some(item => normalizeOrganizationUrl(item.linkedinUrl) === target))
    return new Response("Not a published organisation URL", { status: 404 });
  const image = await organizationLogo(target);
  return image ? imageResponse(image) : new Response("Organisation logo unavailable", {
    status: 404, headers: { "Cache-Control": "public, max-age=3600" },
  });
};
