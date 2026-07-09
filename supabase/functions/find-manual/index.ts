import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface ManualResult {
  title: string;
  url: string;
  description?: string;
  isPdf: boolean;
  source: string;
  sizeBytes?: number;
  confidence?: "likely_full" | "uncertain" | "likely_partial";
}

import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireString, optionalString, validationErrorResponse } from "../_shared/validation.ts";

// Manual-aggregator sites we know actually host real, complete manuals.
const TRUSTED_AGGREGATORS = [
  "manualslib.com", "manua.ls", "manuals.plus", "manualzz.com",
  "manualmachine.com", "manualsdir.com", "needmanual.com", "manualslib.net",
];

const MIN_MANUAL_BYTES = 200_000; // below this, it's almost always a spec sheet or quick-start card
const OFFICIAL_PAGE_BONUS = 12; // a PDF pulled off the manufacturer's own confirmed page is about as good as it gets

// Confirmed URL templates for manufacturer support pages, used so we don't
// have to rely on search-engine ranking to surface the single best source.
// {MODEL} gets replaced with the model number. Add more brands here as
// they're confirmed — an unlisted brand just falls back to search, same as before.
const KNOWN_SUPPORT_PAGE_TEMPLATES: Record<string, string> = {
  ge: "https://products.geappliances.com/appliance/gea-specs/{MODEL}/support",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Common home-product categories, used to catch the exact failure mode where
// a technically-real, technically-verified PDF for the WRONG product (e.g. a
// washer warranty) is the only survivor and gets shown anyway. This applies
// to any brand and any product type — not brand-specific.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  microwave: ["microwave"],
  refrigerator: ["refrigerator", "fridge", "freezer"],
  washer: ["washer", "washing machine", "clothes washer"],
  dryer: ["dryer", "clothes dryer"],
  dishwasher: ["dishwasher"],
  range: ["range", "stove", "cooktop", "oven"],
  hood: ["range hood", "vent hood", "exhaust hood"],
  water_heater: ["water heater", "tankless heater"],
  hvac: ["furnace", "air conditioner", "heat pump", "hvac", "thermostat", "mini split"],
  disposal: ["garbage disposal", "disposer"],
  vacuum: ["vacuum", "vacuum cleaner"],
  dehumidifier: ["dehumidifier", "humidifier"],
  tv: ["television", " tv ", "tv."],
  generator: ["generator"],
  grill: ["grill", "bbq"],
  sump_pump: ["sump pump"],
  washer_dryer_combo: ["washer dryer combo", "all-in-one washer"],
};

function detectCategory(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return null;
}

// A large negative score that guarantees exclusion (results are filtered at > -50).
const CATEGORY_MISMATCH_PENALTY = -60;

const PARTIAL_RX = /(performance\s*data|spec(ification)?\s*sheet|data\s*sheet|cut\s*sheet|submittal|brochure|sales\s*sheet|quick\s*start|quick\s*reference|warranty|parts\s*list|parts\s*diagram|declaration|safety\s*data|\bsds\b|\bmsds\b|flyer|catalog)/i;
const FULL_RX = /(owner'?s?\s*manual|user\s*manual|installation\s*(and|&)?\s*(operation|maintenance)?\s*manual|installation\s*manual|instruction\s*manual|service\s*manual|operation\s*manual|use\s*and\s*care)/i;

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function hostRootOf(host: string): string {
  return host.replace(/\.[a-z]{2,}$/i, "").replace(/[^a-z0-9]/g, "");
}

async function verifyPdf(url: string): Promise<{ ok: boolean; sizeBytes: number }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const headRes = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)" },
    });
    clearTimeout(t);
    if (!headRes.ok) return { ok: false, sizeBytes: 0 };
    const sizeBytes = Number(headRes.headers.get("content-length") || 0);

    // Confirm real PDF bytes via a small ranged GET, reading only a few KB.
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 6000);
    const getRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl2.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)",
        Range: "bytes=0-1023",
      },
    });
    clearTimeout(t2);
    if (!getRes.ok && getRes.status !== 206) return { ok: false, sizeBytes };

    const reader = getRes.body?.getReader();
    let head = "";
    if (reader) {
      const chunks: Uint8Array[] = [];
      let totalRead = 0;
      while (totalRead < 4096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalRead += value.length;
      }
      await reader.cancel().catch(() => {});
      const merged = new Uint8Array(totalRead);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      head = new TextDecoder("latin1").decode(merged.slice(0, 8));
    }
    return { ok: head.includes("%PDF-"), sizeBytes };
  } catch {
    return { ok: false, sizeBytes: 0 };
  }
}

// Scrapes a manufacturer's own support/product page and pulls out any linked
// PDF that looks like the actual manual — this is what catches cases like a
// GE product-support page where the manual is one click away, not a directly
// indexed PDF URL a plain filetype:pdf search would ever surface.
async function extractPdfLinksFromPage(
  pageUrl: string, apiKey: string,
): Promise<{ url: string; text: string }[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: pageUrl, formats: ["links", "markdown"] }),
    });
    clearTimeout(t);
    const data = await res.json();
    if (!res.ok) return [];

    const found: { url: string; text: string }[] = [];
    const linkArr: any[] = data?.data?.links || data?.links || [];
    for (const l of linkArr) {
      const href = typeof l === "string" ? l : l?.href || l?.url;
      if (href) found.push({ url: href, text: (typeof l === "object" && l?.text) || "" });
    }
    // Fallback: pull markdown-style [text](url) links directly out of the page content.
    const markdown: string = data?.data?.markdown || data?.markdown || "";
    const mdLinkRx = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = mdLinkRx.exec(markdown)) !== null) {
      found.push({ url: m[2], text: m[1] });
    }

    // Resolve to absolute PDF-looking links only.
    return found
      .map((f) => {
        try {
          const abs = new URL(f.url, pageUrl).toString();
          return { url: abs, text: f.text };
        } catch { return null; }
      })
      .filter((f): f is { url: string; text: string } => !!f && /\.pdf($|\?)/i.test(f.url));
  } catch (e) {
    console.error("find-manual: page scrape failed", pageUrl, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rl = rateLimit(`find-manual:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let brand: string;
  let model: string;
  let productType: string | undefined;
  try {
    const body = await readJson(req, 8 * 1024);
    brand = requireString(body.brand, "brand", { min: 1, max: 100 });
    model = requireString(body.model, "model", { min: 1, max: 100 });
    productType = optionalString(body.productType, "productType", { max: 100 });
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetCategory = productType ? detectCategory(productType) : null;
    const normalizedModel = normalize(model);

    // Two searches run in parallel:
    //  1. Direct PDF search — catches manuals search engines have already indexed as a bare file.
    //  2. General page search — catches the manufacturer's own support/product page, which is
    //     usually HTML with the actual manual one click away, not a directly indexed PDF.
    const pdfQuery = [
      brand, model, productType,
      '"owner\'s manual" OR "user manual" OR "installation manual" OR "instruction manual" filetype:pdf',
    ].filter(Boolean).join(" ");
    const pageQuery = [brand, model, productType, "manual support specifications"].filter(Boolean).join(" ");

    const searchFirecrawl = async (query: string, limit: number) => {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Firecrawl error ${res.status}`);
      return (Array.isArray(data?.data) && data.data) || (Array.isArray(data?.data?.web) && data.data.web) || [];
    };

    const [pdfRaw, pageRaw] = await Promise.all([
      searchFirecrawl(pdfQuery, 15),
      searchFirecrawl(pageQuery, 8),
    ]);

    // --- Path 1: directly-indexed PDF links ---
    const directCandidates = (pdfRaw as any[])
      .map((r) => {
        const url: string = r.url || r.link || "";
        if (!url) return null;
        const isPdf = /\.pdf($|\?)/i.test(url) || /pdf/i.test(r.mimeType || "");
        if (!isPdf) return null;
        const host = hostOf(url);
        const title = r.title || r.name || url;
        const desc = r.description || r.snippet || "";
        const hay = `${title} ${desc} ${url}`;

        let score = 0;
        if (FULL_RX.test(hay)) score += 10;
        if (PARTIAL_RX.test(hay)) score -= 8;
        if (targetCategory) {
          const candidateCategory = detectCategory(hay);
          if (candidateCategory && candidateCategory !== targetCategory) score += CATEGORY_MISMATCH_PENALTY;
        }
        // A document that never mentions this specific model at all is often a
        // generic warranty card, brochure, or a manual for a different product
        // entirely that just happens to share the brand. Real model-specific
        // manuals almost always have the model number in the title or filename.
        if (normalizedModel.length >= 4) {
          if (normalize(hay).includes(normalizedModel)) score += 6;
          else score -= 6;
        }

        const hostRoot = hostRootOf(host);
        if (TRUSTED_AGGREGATORS.includes(host)) score += 6;
        if (normalizedBrand.length >= 2 && (hostRoot === normalizedBrand || hostRoot.startsWith(normalizedBrand))) score += 8;

        return { title, url, description: desc, source: host, score };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // --- Path 2: official/support pages worth scraping for an embedded PDF link ---
    // First, try a confirmed URL template for this brand if we have one —
    // this doesn't depend on search-engine ranking surfacing the right page at all.
    const brandKey = normalize(brand);
    const templatePage = KNOWN_SUPPORT_PAGE_TEMPLATES[brandKey]
      ? { url: KNOWN_SUPPORT_PAGE_TEMPLATES[brandKey].replace("{MODEL}", encodeURIComponent(model.trim())), isOfficialDomain: true, title: `${brand} official support page` }
      : null;

    const searchedPageCandidates = (pageRaw as any[])
      .map((r) => {
        const url: string = r.url || r.link || "";
        if (!url) return null;
        const host = hostOf(url);
        const hostRoot = hostRootOf(host);
        const isOfficialDomain = normalizedBrand.length >= 2 && (hostRoot === normalizedBrand || hostRoot.startsWith(normalizedBrand));
        const pathLooksRelevant = /support|manual|spec|documentation|owner/i.test(url);
        if (!isOfficialDomain && !pathLooksRelevant) return null;
        return { url, isOfficialDomain, title: r.title || r.name || url };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      // Official domain pages first, scrape at most 2 to keep this fast.
      .sort((a, b) => Number(b.isOfficialDomain) - Number(a.isOfficialDomain))
      .slice(0, 2);

    const pageCandidates = templatePage
      ? [templatePage, ...searchedPageCandidates.filter((p) => p.url !== templatePage!.url)].slice(0, 3)
      : searchedPageCandidates;

    const scrapedLinkSets = await Promise.all(
      pageCandidates.map((p) => extractPdfLinksFromPage(p.url, FIRECRAWL_API_KEY))
    );

    const scrapedCandidates = pageCandidates.flatMap((p, i) => {
      const links = scrapedLinkSets[i];
      return links.map((l) => {
        const hay = `${l.text} ${l.url}`;
        let score = OFFICIAL_PAGE_BONUS;
        if (PARTIAL_RX.test(hay)) score -= 8;
        if (FULL_RX.test(hay) || !l.text) score += 4; // extracted links rarely have "user manual" in the anchor text itself
        if (targetCategory) {
          const candidateCategory = detectCategory(hay);
          if (candidateCategory && candidateCategory !== targetCategory) score += CATEGORY_MISMATCH_PENALTY;
        }
        // Links pulled off the model's own official page are trusted more even
        // without the model number in the anchor text (the page itself is already
        // model-specific), so this only adds a small bonus here, not a penalty.
        if (normalizedModel.length >= 4 && normalize(hay).includes(normalizedModel)) score += 6;
        return { title: l.text || `${brand} ${model} manual`, url: l.url, description: `Found on ${hostOf(p.url)}`, source: hostOf(l.url), score };
      });
    });

    // Merge both paths, de-duplicating by URL, keeping the higher score.
    const merged = new Map<string, typeof directCandidates[number]>();
    for (const c of [...directCandidates, ...scrapedCandidates]) {
      const existing = merged.get(c.url);
      if (!existing || c.score > existing.score) merged.set(c.url, c);
    }
    const candidates = Array.from(merged.values()).sort((a, b) => b.score - a.score).slice(0, 8);

    // Real verification: confirm each candidate is actually a reachable, real PDF.
    const verified = await Promise.all(
      candidates.map(async (c) => {
        const { ok, sizeBytes } = await verifyPdf(c.url);
        if (!ok) return { ...c, score: -100, sizeBytes: 0 };
        let adjustedScore = c.score;
        if (sizeBytes && sizeBytes < MIN_MANUAL_BYTES) adjustedScore -= 15;
        else if (sizeBytes > 1_000_000) adjustedScore += 3;
        return { ...c, score: adjustedScore, sizeBytes };
      })
    );

    const results: ManualResult[] = verified
      .filter((r) => r.score > -50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => {
        const confidence: ManualResult["confidence"] =
          r.score >= 12 ? "likely_full" : r.score >= 0 ? "uncertain" : "likely_partial";
        return {
          title: r.title, url: r.url, description: r.description,
          isPdf: true, source: r.source, sizeBytes: r.sizeBytes, confidence,
        };
      });

    // If we still don't have a solid verified manual, fall back to pointing
    // at manufacturer support/contact/literature-request pages.
    let requestSources: ManualResult[] = [];
    const hasSolidResult = results.some((r) => r.confidence === "likely_full");
    if (!hasSolidResult) {
      const reqQuery = [
        brand, model, productType,
        '(support OR "contact us" OR "request manual" OR "request documentation" OR "literature request" OR "owner center" OR "product registration")',
      ].filter(Boolean).join(" ");
      try {
        const reqRaw = await searchFirecrawl(reqQuery, 8);
        const REQ_RX = /(support|contact|request|literature|owner|customer|help|service|register)/i;
        requestSources = (reqRaw as any[])
          .map((r) => {
            const url: string = r.url || r.link || "";
            if (!url) return null;
            const host = hostOf(url);
            const title = r.title || r.name || url;
            const desc = r.description || r.snippet || "";
            const hay = `${title} ${desc} ${url}`;
            const hostRoot = hostRootOf(host);
            const brandDomainMatch = normalizedBrand.length >= 2 && hostRoot.includes(normalizedBrand);
            if (!(REQ_RX.test(hay) || brandDomainMatch)) return null;
            return { title, url, description: desc, isPdf: /\.pdf($|\?)/i.test(url), source: host, _brand: brandDomainMatch ? 1 : 0 };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => b._brand - a._brand)
          .slice(0, 5)
          .map(({ _brand, ...rest }) => rest);
      } catch (e) {
        console.error("find-manual request-sources fallback error:", e);
      }
    }

    return new Response(JSON.stringify({ results, requestSources, query: pdfQuery }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("find-manual error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
