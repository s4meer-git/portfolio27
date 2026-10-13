import { locationTimezone } from "./location-timezone";
import { cmsApiUrl, cmsPublicUrl } from "./cms-origin";

/** Turns a CMS media object (or an upload path) into an absolute URL. Idempotent. */
export function mediaUrl(file: any): string | undefined {
  const url = typeof file === "string" ? file : file?.url;
  return url ? new URL(url, cmsPublicUrl).href : undefined;
}

const labels = (tags: any[] | undefined) => (tags || []).map(tag => tag.label);
const pageSeo = (value: any) => value ? { ...value, socialImage: mediaUrl(value.socialImage) } : undefined;

/**
 * Reshapes an article or project into the `{ id, body, data }` form the page components
 * expect, resolving media URLs along the way.
 */
function toEntry(item: any, kind: "article" | "project") {
  const extra =
    kind === "article"
      ? { pubDatetime: new Date(item.pubDatetime), tags: labels(item.tags), hashtags: labels(item.hashtags),
          attachments: (item.attachments || []).map((attachment: any) => ({ ...attachment,
            width: attachment.image?.width, height: attachment.image?.height,
            image: mediaUrl(attachment.image) })),
          movieMoments: (item.movieMoments || []).map((moment: any) => ({ ...moment,
            width: moment.video?.width || moment.poster?.width || moment.gif?.width,
            height: moment.video?.height || moment.poster?.height || moment.gif?.height,
            gif: mediaUrl(moment.gif), video: mediaUrl(moment.video), poster: mediaUrl(moment.poster) })) }
      : { technologies: labels(item.technologies) };

  return {
    id: item.slug,
    body: item.body || "",
    data: { ...item, seo: pageSeo(item.seo), image: mediaUrl(item.image), ...extra },
  };
}

export async function loadPortfolio() {
  const response = await fetch(`${cmsApiUrl}/api/portfolio`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(
      `CMS returned ${response.status}. Start the CMS with npm run cms:dev.`
    );
  }

  const content = await response.json();
  if (!content.site)
    throw new Error("Publish Website settings in the CMS first.");

  const { site } = content;
  site.seo ||= {};
  site.seo.pages = (site.seo.pages || []).map((page: any) => ({ ...page, metadata: pageSeo(page.metadata) }));
  site.profile.resolvedTimeZone = await locationTimezone(
    site.profile.location,
    site.profile.timeZone
  );
  site.profile.avatarUpdatedAt = site.profile.avatar?.updatedAt;
  site.profile.avatarDarkUpdatedAt = site.profile.avatarDark?.updatedAt;
  site.profile.avatar = mediaUrl(site.profile.avatar);
  site.profile.avatarDark = mediaUrl(site.profile.avatarDark);
  site.profile.namePronunciation = mediaUrl(site.profile.namePronunciation);
  site.profile.locationPhoto = mediaUrl(site.profile.locationPhoto);
  site.seo.ogImage = mediaUrl(site.seo.ogImage);
  // Replacing a file in the media library keeps its URL, and browsers hold on to
  // favicons; the upload time in the address makes them fetch a replaced one.
  const faviconVersion = Date.parse(site.seo.favicon?.updatedAt ?? "");
  site.seo.favicon = mediaUrl(site.seo.favicon);
  if (site.seo.favicon && faviconVersion)
    site.seo.favicon += `?v=${faviconVersion.toString(36)}`;
  for (const link of site.socialLinks ?? [])
    link.previewImage = mediaUrl(link.previewImage);

  return {
    site,
    categories: (content.categories ?? []).map((item: any) => ({ ...item, seo: pageSeo(item.seo) })),
    series: (content.series ?? []).map((item: any) => ({ ...item, seo: pageSeo(item.seo) })),
    experiences: content.experiences.map((experience: any) => ({
      ...experience,
      positions: (experience.positions || []).map((position: any) => ({
        ...position,
        skills: labels(position.skills),
      })),
    })),
    education: (content.education ?? []).map((item: any) => ({
      ...item,
      skills: labels(item.skills),
    })),
    certifications: (content.certifications ?? [])
      .filter((item: any) => item.badge)
      .map((item: any) => ({
        ...item,
        badge: mediaUrl(item.badge),
        issuerLogo: mediaUrl(item.issuerLogo),
      })),
    articles: content.articles.map((article: any) =>
      toEntry(article, "article")
    ),
    publications: (content.publications ?? []).map((item: any) => ({
      id: item.slug as string,
      body: (item.body || "") as string,
      data: {
        ...item,
        seo: pageSeo(item.seo),
        publishedOn: new Date(item.publishedOn),
        tags: labels(item.tags),
        image: mediaUrl(item.image),
        pdf: mediaUrl(item.pdf),
      },
    })),
    projects: content.projects.map((project: any) =>
      toEntry(project, "project")
    ),
  };
}

export type Portfolio = Awaited<ReturnType<typeof loadPortfolio>>;

/**
 * How long a fetched copy is served without asking the CMS again. Past this it is
 * still served, while a fresh copy loads in the background (stale-while-revalidate),
 * so no visitor waits on the CMS once the server is warm.
 */
const FRESH_MS = 30_000;

let cached: { value: Portfolio; at: number } | undefined;
let pending: Promise<Portfolio> | undefined;
/** Bumped by every invalidation, so a fetch that started earlier cannot win. */
let generation = 0;

function refresh(): Promise<Portfolio> {
  if (pending) return pending;
  const started = generation;
  const request: Promise<Portfolio> = loadPortfolio()
    .then(value => {
      // A publish may finish while this read is in flight. That response must
      // not reach a crawler or replace the newer generation's cache.
      if (started !== generation) return refresh();
      cached = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      if (pending === request) pending = undefined;
    });
  pending = request;
  return request;
}

/**
 * The CMS content for a request. Every page and client-side navigation used to fetch
 * the whole CMS payload (article bodies included) before rendering; this shares one
 * copy across requests. The CMS calls `/api/revalidate` after each save, which drops
 * the copy so edits still show up on the next page load.
 */
export async function getPortfolio({ waitForFresh = false } = {}): Promise<Portfolio> {
  if (!cached) return refresh();
  if (Date.now() - cached.at > FRESH_MS) {
    if (waitForFresh) {
      const previous = cached.value;
      try { return await refresh(); }
      catch { return previous; }
    }
    // A failed background refresh keeps serving the last good copy.
    refresh().catch(() => {});
  }
  return cached.value;
}

export function invalidatePortfolio() {
  generation += 1;
  cached = undefined;
  pending = undefined;
}
