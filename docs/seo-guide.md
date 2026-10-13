# CMS-managed search and AI discovery

Primary domain: **https://s4meer.com**. Implemented locally; deployment, registrar/DNS changes and search-console submissions are separate steps. Rankings and sitelinks are selected by search engines, not guaranteed by this implementation.

## What changed

- All public page metadata uses one CMS-managed canonical origin, never the incoming preview/alias host. Pagination has distinct titles and canonical URLs. `/articles/1`, leading-zero page numbers and trailing-slash page duplicates permanently redirect to their normalized URLs.
- Replaced the blanket `BlogPosting` schema with a linked JSON-LD graph: `Person`, `WebSite`, appropriate `ProfilePage` / `CollectionPage` / `WebPage`, `BreadcrumbList`, plus `BlogPosting`, `ScholarlyArticle` or `CreativeWork` for the corresponding content. Publications retain their listed authors. No invented ratings, affiliations or credentials are added.
- XML sitemap/index are generated from published routes. They exclude noindex pages, alternate-canonical pages, explicitly excluded pages, redirect sources and unused categories/series. Last-modified dates use stored content timestamps where available, not the time of the crawl.
- Added visible breadcrumbs, a linked `/sitemap` directory, an `/about` page presenting the biography and owned domains, and editable footer links. Page headings are H1s; imported Markdown headings nest underneath them.
- Added title templates, descriptions, social-sharing overrides, image alternative text, locale, X creator tags, Google/Bing verification, global and per-page indexing controls, permanent redirects and crawler settings.
- Updated `/llms.txt` and `/index.md` to use canonical URLs, real project names and the same discovery exclusions as the sitemap. These contain published facts and links, not instructions asking AI systems to rank the site. Markdown is a companion representation with an HTTP canonical link to home and noindex to avoid competing search results.
- Unknown/preview hosts, errors and non-image API responses receive HTTP noindex. `SEO_INDEXING_DISABLED=true` provides an additional staging safeguard.

## Where to edit

Go to **Content Manager → Website settings → Search & sharing** and publish changes.

| Control | Effect |
| --- | --- |
| Primary domain | Canonical origin for metadata, schema, sitemap, AI files and domain redirects. Enter only an HTTPS origin. |
| Site title / Site description | Homepage metadata and site-wide fallbacks. |
| Author / Site name | Identity name in Person metadata, and site brand/title-template name. Keep these consistent with your visible profile. |
| Page title template | `%s` = page title; `%n` = site name. Default `%s \| %n`. Homepage keeps its own title. |
| Name variations | Genuine aliases, one per line. Visible on About and included in Person schema. |
| Official identity profiles | Verified personal URLs, one per line. Linked on About and used in `sameAs`. |
| Owned domains | Visible list of domains you own. Choose alias or separate site, and whether an alias should redirect. |
| Page overrides | Exact existing path such as `/`, `/about`, `/articles`, `/projects`, or a specific article. Does not create pages. |
| Allow search indexing | Off emits noindex and empties discovery lists. Robots remains crawlable so crawlers can observe noindex. |
| Allow ChatGPT search crawler | Controls `OAI-SearchBot`; this is separate from model training. |
| Allow AI training crawlers | Controls `GPTBot` and `Google-Extended`. Google-Extended also covers certain Gemini/Vertex AI uses; it does not control ordinary Google Search. |
| Publish AI-readable discovery files | Enables `/llms.txt` and `/index.md`. Turning it off returns 404 for these files. |
| Verification fields | Paste only the token from Google's or Bing's HTML verification tag. |
| Permanent URL redirects | Map old paths to existing new paths after slug changes. Exact same-site paths only; chains resolve and cycles are ignored. Query strings are preserved. |
| Wording and directory-link controls | Edit About, Site map, Home, official website/profile headings, and footer-link visibility. |

Articles, projects, publications, categories and series each have their own **Search & sharing** component. Use it for a title, description, canonical override, sharing image, image description, noindex, nofollow or discovery inclusion.

Precedence is: **exact-path override → entry SEO → content fields → site defaults**. Blank text fields inherit. Explicit boolean settings apply. A canonical override is for genuinely duplicated/syndicated content, not a way to target unrelated keywords. Noindex and exclusion settings do not make public content private.

The existing CMS revalidation integration refreshes these settings after publishing; the server also refreshes cached content after its short cache interval. No website rebuild is needed for content changes. Schema/code changes still require deployment.

### Automatic updates

`/llms.txt`, `/index.md`, `/robots.txt`, `/sitemap.xml`, `/sitemap-index.xml`, the visible site directory, and page metadata are generated at request time from published CMS content. There are no static copies to edit or regenerate manually.

The CMS notifies the website after a content write has committed, including publishing, unpublishing, deleting and media changes. Transactions that roll back do not trigger a refresh. An in-flight read from before a publish cannot overwrite or return an obsolete content generation. Draft edits remain absent from the public output until published.

If the notification fails, SEO documents await a fresh CMS read once the shared cache is older than 30 seconds; they do not return the expired copy while refreshing in the background. A temporary CMS outage preserves the last successful content so discovery files remain available. The notification checks HTTP status and recovers after a bounded cooldown. Configure the CMS `SITE_URL` and matching `REVALIDATE_SECRET` for the deployed website; CDN rules must respect the responses' `Cache-Control: no-cache`.

Changes to the canonical domain update every discovery URL, crawler preferences update robots.txt, and published SEO titles/descriptions update the AI discovery lists. Google and other external services refresh their own indexes on their crawl schedules.

## Domain setup

The seven user-supplied secondary domains were saved as redirecting aliases:

- sameerchauhan.com
- sameerchauhan.in
- sameer.com
- sameer.in
- sameerchauhan.de
- sameerbitspilani.com
- sameermanipal.com

The application permanently redirects requests from configured aliases (and their www forms) to the matching path on `s4meer.com`, preserving the query. `www.s4meer.com` also redirects to the primary host. This was tested locally using the alias Host header.

For the public internet, each alias must have valid DNS, a hosting domain binding and HTTPS certificate, and reach this application. Alternatively configure equivalent permanent redirects at the hosting/CDN layer. Preserve the original public Host header at reverse proxies. An alias that hosts an independent project should be marked **separate site** with redirects off. Owning a `.de` or `.in` domain does not mean the website has translated content, so no fabricated hreflang variants are emitted.

Consolidating duplicates supports one primary search identity. It cannot guarantee that a search for every alias returns the primary domain first.

## Identity consistency

Keep the CMS Author and Profile → Display name aligned, and maintain your real public URLs in Official identity profiles. Update social links and authored content through the CMS when details change.

## Launch and measurement

1. Deploy the website and CMS, and ensure public media URLs are reachable from the internet (not `127.0.0.1` or an internal-only CMS address). Check home, a detail page, social images and every sitemap URL over public HTTPS.
2. Set up the domain bindings/HTTPS redirects above. Keep staging under noindex and production indexable.
3. Verify the primary site in Google Search Console and Bing Webmaster Tools using their supplied tokens or DNS verification. Submit `https://s4meer.com/sitemap-index.xml`.
4. Use Google's URL Inspection and Rich Results Test on home, an article and a publication. Check the CDN/firewall permits legitimate search bots; a robots allowance cannot bypass a firewall block.
5. Keep the same accurate identity and canonical website link on your real public profiles. Earn relevant references through original work, project documentation and publications.
6. Track branded queries, indexed pages, selected canonicals, crawl issues and impressions/clicks. Revisit titles/content based on evidence, not keyword repetition.

Google's grouped links are **sitelinks**. Logical navigation, informative titles, breadcrumbs and crawlable internal links support them, but Google decides when they appear. XML sitemaps help discovery; they do not prescribe the search-results layout. AI search also relies on crawlable, accurate content and conventional SEO; `llms.txt` is an optional discovery aid, not a proven ranking switch.

## Validation

Run `npm run test:seo` and `node tests/admin-fields.mjs` against local services. The CMS update integration check (`npm run test:seo-cms`) creates and removes its own temporary article; use a development database. It checks publishing, SEO edits, noindex exclusions and unpublishing against CMS-driven discovery documents.

## Primary references

- [Google sitelinks guidance](https://developers.google.com/search/docs/appearance/sitelinks)
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Google breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI crawler controls](https://developers.openai.com/api/docs/bots)
