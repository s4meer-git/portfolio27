import { defineMiddleware } from "astro:middleware";
import { getPortfolio } from "./lib/cms";
import { originFor, ownedDomains, redirectTarget, pathKey } from "./lib/seo";

/** Endpoints that never read CMS content, so they skip loading it. */
const WITHOUT_CONTENT = new Set([
  "/api/health",
  "/api/spotify",
  "/api/spotify-preview",
  "/api/visitors",
  "/api/revalidate",
  "/api/contact",
]);
const SEO_DOCUMENTS = new Set([
  "/llms.txt", "/index.md", "/robots.txt", "/sitemap.xml", "/sitemap-index.xml",
  "/sitemap", "/about",
]);

export const onRequest = defineMiddleware(async (context, next) => {
  if (WITHOUT_CONTENT.has(context.url.pathname)) {
    const response = await next();
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }
  context.locals.portfolio = await getPortfolio({ waitForFresh: SEO_DOCUMENTS.has(pathKey(context.url.pathname)) });
  const site = context.locals.portfolio.site;
  const origin = originFor(site);
  const primaryHost = new URL(origin).hostname;
  if (["GET", "HEAD"].includes(context.request.method)) {
    const aliases = ownedDomains(site).filter((domain: any) => domain.relationship === "alias" && domain.redirectToPrimary);
    const aliasHost = context.url.hostname !== primaryHost && (context.url.hostname === `www.${primaryHost}` || aliases.some((domain: any) => {
      const host = new URL(domain.url).hostname;
      return context.url.hostname === host || context.url.hostname === `www.${host}`;
    }));
    if (aliasHost) return context.redirect(`${origin}${context.url.pathname}${context.url.search}`, 308);
    const path = pathKey(context.url.pathname);
    const target = redirectTarget(site, path);
    if (target) return context.redirect(`${target}${context.url.search}`, 308);
    const page = path.match(/^\/(articles|publications)\/(\d+)$/);
    const normalized = page && Number(page[2]) >= 1
      ? `/${page[1]}${Number(page[2]) === 1 ? "" : `/${Number(page[2])}`}` : path;
    if (normalized !== context.url.pathname && !context.url.pathname.startsWith("/api/"))
      return context.redirect(`${normalized}${context.url.search}`, 308);
  }
  const response = await next();
  if (response.status >= 400 || site.seo?.indexingEnabled === false ||
      process.env.SEO_INDEXING_DISABLED === "true" || context.url.hostname !== primaryHost ||
      (context.url.pathname.startsWith("/api/") && context.url.pathname !== "/api/portrait"))
    response.headers.set("X-Robots-Tag", "noindex, follow");
  // `no-cache` still revalidates on every visit, but unlike `no-store` it lets the
  // browser keep the page in its back/forward cache, so Back is instant.
  if (!response.headers.has("Cache-Control"))
    response.headers.set("Cache-Control", "no-cache");
  return response;
});
