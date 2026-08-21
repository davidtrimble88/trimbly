// Shared by zillow-lookup and backfill-home-photos: given a Firecrawl scrape
// response for a Zillow listing page, pick the listing's actual hero/first
// gallery photo.
//
// Confirmed via live diagnostics against a real listing:
//   - Firecrawl's "html" format strips <script> tags entirely, so the
//     gallery data (which lives in the __NEXT_DATA__ script) is only
//     present in the "rawHtml" format.
//   - The first photos.zillowstatic.com URL on the page is NOT the listing
//     photo — it's the listing agent's profile photo, which appears earlier
//     in page order. Extraction has to target the specific gallery JSON key,
//     not "the first CDN URL anywhere".
//   - That gallery JSON is backslash-escaped (JSON-string-within-JSON,
//     embedded in __NEXT_DATA__), e.g. `\"responsivePhotos\":[{\"url\":\"...`.
//   - An active listing's own photos live under responsivePhotos[0].url. An
//     off-market home with no current listing instead has a Google Street
//     View Static API URL there (needs an API key Trimbly doesn't have —
//     would render as a broken image), but may still have real photos under
//     lastSoldListing.photos[0].url from its last time on-market.
const ZILLOW_PHOTO_HOST = "https://photos.zillowstatic.com/";

/** First `\"url\":\"...\"` occurring after `fromIndex`, within a bounded window. */
function firstEscapedUrl(text: string, fromIndex: number, maxWindow = 4000): string | null {
  const window = text.slice(fromIndex, fromIndex + maxWindow);
  const m = window.match(/\\"url\\":\\"([^\\]+)\\"/);
  return m ? m[1] : null;
}

export function extractHeroPhoto(scrapeData: any): string | null {
  const rawHtml: string = scrapeData?.data?.rawHtml || scrapeData?.rawHtml || "";

  if (rawHtml) {
    const responsiveIdx = rawHtml.indexOf('\\"responsivePhotos\\":[');
    if (responsiveIdx !== -1) {
      const url = firstEscapedUrl(rawHtml, responsiveIdx);
      if (url && url.startsWith(ZILLOW_PHOTO_HOST)) return url;
      // else: a Street View placeholder (off-market) — fall through.
    }

    const soldIdx = rawHtml.indexOf('\\"lastSoldListing\\":{');
    if (soldIdx !== -1) {
      const photosIdx = rawHtml.indexOf('\\"photos\\":[', soldIdx);
      if (photosIdx !== -1 && photosIdx - soldIdx < 2000) {
        const url = firstEscapedUrl(rawHtml, photosIdx);
        if (url && url.startsWith(ZILLOW_PHOTO_HOST)) return url;
      }
    }
  }

  // Fallbacks for pages Firecrawl couldn't return rawHtml for.
  const html: string = scrapeData?.data?.html || scrapeData?.html || "";
  if (html) {
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1].startsWith(ZILLOW_PHOTO_HOST)) return ogMatch[1];
  }

  const ogImage = scrapeData?.data?.metadata?.ogImage || scrapeData?.metadata?.ogImage;
  if (typeof ogImage === "string" && ogImage.startsWith(ZILLOW_PHOTO_HOST)) return ogImage;

  const markdown: string = scrapeData?.data?.markdown || scrapeData?.markdown || "";
  const mdMatch = markdown.match(/https:\/\/photos\.zillowstatic\.com\/[^\s)"']+/);
  return mdMatch ? mdMatch[0] : null;
}
