// Shared by zillow-lookup and backfill-home-photos: given a Firecrawl scrape
// response for a Zillow listing page, pick the listing's actual hero/first
// gallery photo rather than an arbitrary image that happens to appear
// somewhere on the page (e.g. a "similar homes" thumbnail or a photo from
// deep in the listing's utility/interior shots, both of which real-world
// testing showed the old markdown-regex-only approach could grab).
//
// Priority, most to least reliable:
//   1. The page's own "photos" gallery array embedded as JSON in the raw
//      HTML (Zillow's client-side page state) — first entry is the same
//      photo a human sees first under "See all photos".
//   2. The og:image meta tag, read straight from raw HTML rather than
//      Firecrawl's parsed metadata (which isn't always populated).
//   3. The first Zillow-CDN photo URL anywhere in the scraped markdown, as
//      a last resort when neither of the above is present.
//
// Everything returned is restricted to Zillow's own photo CDN
// (photos.zillowstatic.com). Off-market homes with no listing gallery use a
// Google Street View Static API URL as their og:image instead — that URL
// requires an API key Trimbly doesn't have, so it renders as a broken image
// if embedded directly. Better to report no photo than a broken one.
const ZILLOW_PHOTO_HOST = "https://photos.zillowstatic.com/";

export function extractHeroPhoto(scrapeData: any): string | null {
  const html: string = scrapeData?.data?.html || scrapeData?.html || "";
  const markdown: string = scrapeData?.data?.markdown || scrapeData?.markdown || "";

  if (html) {
    const galleryMatch = html.match(/"photos"\s*:\s*\[\s*\{[^\]]*?"url"\s*:\s*"(https:\/\/photos\.zillowstatic\.com\/[^"]+)"/);
    if (galleryMatch) return galleryMatch[1];

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1].startsWith(ZILLOW_PHOTO_HOST)) return ogMatch[1];
  }

  const ogImage = scrapeData?.data?.metadata?.ogImage || scrapeData?.metadata?.ogImage;
  if (typeof ogImage === "string" && ogImage.startsWith(ZILLOW_PHOTO_HOST)) return ogImage;

  const mdMatch = markdown.match(/https:\/\/photos\.zillowstatic\.com\/[^\s)"']+/);
  return mdMatch ? mdMatch[0] : null;
}
