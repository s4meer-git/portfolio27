import type { APIRoute } from "astro";
import { cachedImage, fetchImage, imageResponse, unavailable } from "@/lib/image-cache";
import { findPlacePhoto } from "@/lib/place-photo";

/**
 * The photo shown when hovering the location in the profile: a landmark of the city
 * in Website settings → Profile → Location, or of Location photo subject when set.
 * Found on Wikipedia (lib/place-photo) once, kept on disk (lib/image-cache) and
 * served from there; refreshed monthly. Takes no input beyond the profile, so it can
 * only ever fetch that one place. The `for` parameter only changes the address when
 * the location does, so browsers do not keep showing the previous city.
 */
const MONTH = 30 * 24 * 60 * 60 * 1000;

export const GET: APIRoute = async ({ locals }) => {
  const { location, locationPhotoSubject } = locals.portfolio.site.profile;
  if (!location?.trim()) return new Response("No location", { status: 404 });

  try {
    const image = await cachedImage(
      "location-photos",
      `${location.trim()}|${locationPhotoSubject?.trim() || ""}`,
      MONTH,
      async () => {
        const photo = await findPlacePhoto(location, locationPhotoSubject);
        return {
          image: await fetchImage(photo.url, { headers: photo.headers }),
          meta: photo.meta,
        };
      }
    );
    return imageResponse(image);
  } catch {
    // Nothing found and no copy: the component keeps the card closed.
    return unavailable();
  }
};
