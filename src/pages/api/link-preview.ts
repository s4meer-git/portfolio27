import type { APIRoute } from "astro";
import { encode } from "qss";
import { cachedImage, fetchImage, imageResponse, unavailable } from "@/lib/image-cache";

/**
 * Screenshots for the link previews under the profile (components/ui/link-preview).
 *
 * Aceternity's component asks api.microlink.io for a fresh screenshot from the
 * visitor's browser every time. Here the server asks once, keeps the image on disk
 * (lib/image-cache), and serves that copy from then on, so previews keep working if
 * Microlink is slow, rate-limited or gone. Copies are refreshed weekly.
 *
 * Only URLs listed as profile links in the CMS are accepted, so this cannot be used
 * to screenshot arbitrary sites.
 */
const WEEK = 7 * 24 * 60 * 60 * 1000;
// The size the component displays (200×125), captured at 3× like the original.
const WIDTH = 200;
const HEIGHT = 125;

export const GET: APIRoute = async ({ url, locals }) => {
  const target = url.searchParams.get("url") || "";
  const allowed = (locals.portfolio.site.socialLinks ?? []).some(
    (link: any) => link.showInProfile && link.href === target
  );
  if (!allowed || !/^https?:\/\//.test(target))
    return new Response("Not a profile link", { status: 404 });

  try {
    const image = await cachedImage("link-previews", target, WEEK, async () => {
      const params = encode({
        url: target,
        screenshot: true,
        meta: false,
        embed: "screenshot.url",
        colorScheme: "dark",
        // Many pages (Credly, for one) draw themselves with JavaScript after loading.
        waitForTimeout: 2000,
        "viewport.isMobile": true,
        "viewport.deviceScaleFactor": 1,
        "viewport.width": WIDTH * 3,
        "viewport.height": HEIGHT * 3,
      });
      return { image: await fetchImage(`https://api.microlink.io/?${params}`) };
    });
    return imageResponse(image);
  } catch {
    // No copy and no Microlink: the component hides the card.
    return unavailable();
  }
};
