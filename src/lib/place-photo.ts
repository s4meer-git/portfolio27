/**
 * A photo of a place, found on Wikipedia and Wikimedia Commons (free, no key).
 *
 * The place is looked up with Wikipedia's search, so "Dubai, United Arab Emirates"
 * finds the Dubai article. For a city, the photo is its Wikidata image (P18), which
 * is usually a scenic view (Dubai: the skyline with the Burj Khalifa); failing that,
 * or when it is a collage of small pictures (Jaipur's), the article's lead image
 * (Jaipur: the Hawa Mahal). A `subject` such as "Burj Khalifa"
 * is looked up instead of the city and its article's lead image is used, since that
 * is the photo of the thing itself.
 *
 * Commons photos are freely licensed but ask for credit; the file and its page are
 * returned with the image so a credit can be shown wherever the site chooses.
 */
const HEADERS = {
  // Wikimedia asks API clients to identify themselves.
  "User-Agent": "s4meer-portfolio/1.0 (+https://github.com/s4meer-git/portfolio27)",
};
const WIDTH = 800;

async function json(url: string) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return response.json();
}

const wikipedia = (params: Record<string, string>) =>
  json(
    `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
      format: "json",
      formatversion: "2",
      origin: "*",
      ...params,
    })}`
  );

export async function findPlacePhoto(place: string, subject?: string) {
  const query = (subject || place).trim();
  const search = await wikipedia({ action: "query", list: "search", srsearch: query, srlimit: "1" });
  const title: string | undefined = search.query?.search?.[0]?.title;
  if (!title) throw new Error(`No Wikipedia article for "${query}"`);

  const info = await wikipedia({
    action: "query",
    titles: title,
    redirects: "1",
    prop: "pageprops|pageimages",
    piprop: "name",
  });
  const page = info.query?.pages?.[0] ?? {};
  let file: string | undefined = page.pageimage;

  if (!subject && page.pageprops?.wikibase_item) {
    const id = page.pageprops.wikibase_item;
    const entity = await json(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`).catch(
      () => null
    );
    const image = entity?.entities?.[id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    // A montage of several small pictures reads as clutter at card size.
    if (typeof image === "string" && !/montage|collage|collection/i.test(image)) file = image;
  }
  if (!file) throw new Error(`No photo on "${title}"`);

  // Special:FilePath redirects to a resized copy; Wikipedia's resolves Commons files too.
  return {
    url: `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${WIDTH}`,
    headers: HEADERS,
    meta: {
      article: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      file,
      filePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`,
    },
  };
}
