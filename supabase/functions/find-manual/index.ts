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

    const queryParts = [
      brand, model, productType,
      '"owner\'s manual" OR "user manual" OR "installation manual" OR "instruction manual" filetype:pdf',
    ].filter(Boolean);
    const query = queryParts.join(" ");

    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 15 }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Firecrawl error ${res.status}`);
    }

    const raw: any[] =
      (Array.isArray(data?.data) && data.data) ||
      (Array.isArray(data?.data?.web) && data.data.web) ||
      [];

    const PARTIAL_RX = /(performance\s*data|spec(ification)?\s*sheet|data\s*sheet|cut\s*sheet|submittal|brochure|sales\s*sheet|quick\s*start|quick\s*reference|warranty|parts\s*list|parts\s*diagram|declaration|safety\s*data|\bsds\b|\bmsds\b|flyer|catalog)/i;
    const FULL_RX = /(owner'?s?\s*manual|user\s*manual|installation\s*(and|&)?\s*(operation|maintenance)?\s*manual|installation\s*manual|instruction\s*manual|service\s*manual|operation\s*manual|use\s*and\s*care)/i;

    const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, "");

    const candidates = raw
      .map((r) => {
        const url: string = r.url || r.link || "";
        if (!url) return null;
        const isPdf = /\.pdf($|\?)/i.test(url) || /pdf/i.test(r.mimeType || "");
        if (!isPdf) return null; // only ever consider things that look like a PDF at all
        const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
        const title = r.title || r.name || url;
        const desc = r.description || r.snippet || "";
        const hay = `${title} ${desc} ${url}`;

        let score = 0;
        if (FULL_RX.test(hay)) score += 10;
        if (PARTIAL_RX.test(hay)) score -= 8;

        const hostRoot = host.replace(/\.[a-z]{2,}$/i, "").replace(/[^a-z0-9]/g, "");
        const isTrustedAggregator = TRUSTED_AGGREGATORS.includes(host);
        const isLikelyOfficialDomain =
          normalizedBrand.length >= 3 &&
          (hostRoot === normalizedBrand || hostRoot.startsWith(normalizedBrand));
        if (isTrustedAggregator) score += 6;
        if (isLikelyOfficialDomain) score += 8;

        return { title, url, description: desc, isPdf: true, source: host, score };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // only bother verifying the top 8 candidates by keyword score

    // Real verification: HEAD for size, then a ranged GET to confirm the file
    // actually starts with the PDF magic bytes. A HEAD 200 doesn't guarantee
    // the body is real — some hosts return a generic 200 to HEAD and then an
    // error page, a login wall, or a broken/empty file on the real GET.
    const verified = await Promise.all(
      candidates.map(async (c) => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 6000);
          const headRes = await fetch(c.url, {
            method: "HEAD",
            redirect: "follow",
            signal: ctrl.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)" },
          });
          clearTimeout(t);
          if (!headRes.ok) return { ...c, score: -100, sizeBytes: 0 };
          const sizeBytes = Number(headRes.headers.get("content-length") || 0);

          // Confirm real PDF bytes via a small ranged GET.
          const ctrl2 = new AbortController();
          const t2 = setTimeout(() => ctrl2.abort(), 6000);
          const getRes = await fetch(c.url, {
            method: "GET",
            redirect: "follow",
            signal: ctrl2.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)",
              Range: "bytes=0-1023",
            },
          });
          clearTimeout(t2);
          if (!getRes.ok && getRes.status !== 206) return { ...c, score: -100, sizeBytes };

          // Read only the first ~4KB from the stream and cancel — some hosts
          // ignore the Range header and would otherwise send the whole file.
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
          const isRealPdf = head.includes("%PDF-");
          if (!isRealPdf) return { ...c, score: -100, sizeBytes };

          let adjustedScore = c.score;
          if (sizeBytes && sizeBytes < MIN_MANUAL_BYTES) adjustedScore -= 15;
          else if (sizeBytes > 1_000_000) adjustedScore += 3;

          return { ...c, score: adjustedScore, sizeBytes };
        } catch {
          return { ...c, score: -100, sizeBytes: 0 };
        }
      })
    );

    const results: ManualResult[] = verified
      .filter((r) => r.score > -50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // top 3 ranked, verified candidates for the user to choose from
      .map((r) => {
        const confidence: ManualResult["confidence"] =
          r.score >= 12 ? "likely_full" : r.score >= 0 ? "uncertain" : "likely_partial";
        return {
          title: r.title, url: r.url, description: r.description,
          isPdf: true, source: r.source, sizeBytes: r.sizeBytes, confidence,
        };
      });

    // If we don't have at least one solid ("likely_full") verified manual,
    // also search for where the user could request it directly from the
    // manufacturer (support, contact, literature-request pages).
    let requestSources: ManualResult[] = [];
    const hasSolidResult = results.some((r) => r.confidence === "likely_full");
    if (!hasSolidResult) {
      const reqQueryParts = [
        brand, model, productType,
        '(support OR "contact us" OR "request manual" OR "request documentation" OR "literature request" OR "owner center" OR "product registration")',
      ].filter(Boolean);
      const reqQuery = reqQueryParts.join(" ");
      try {
        const reqRes = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: reqQuery, limit: 8 }),
        });
        const reqData = await reqRes.json();
        if (reqRes.ok) {
          const reqRaw: any[] =
            (Array.isArray(reqData?.data) && reqData.data) ||
            (Array.isArray(reqData?.data?.web) && reqData.data.web) ||
            [];
          const REQ_RX = /(support|contact|request|literature|owner|customer|help|service|register)/i;
          requestSources = reqRaw
            .map((r) => {
              const url: string = r.url || r.link || "";
              if (!url) return null;
              const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
              const title = r.title || r.name || url;
              const desc = r.description || r.snippet || "";
              const hay = `${title} ${desc} ${url}`;
              const hostRoot = host.replace(/\.[a-z]{2,}$/i, "").replace(/[^a-z0-9]/g, "");
              const brandDomainMatch = normalizedBrand.length >= 3 && hostRoot.includes(normalizedBrand);
              if (!(REQ_RX.test(hay) || brandDomainMatch)) return null;
              return { title, url, description: desc, isPdf: /\.pdf($|\?)/i.test(url), source: host, _brand: brandDomainMatch ? 1 : 0 };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b._brand - a._brand)
            .slice(0, 5)
            .map(({ _brand, ...rest }) => rest);
        }
      } catch (e) {
        console.error("find-manual request-sources fallback error:", e);
      }
    }

    return new Response(JSON.stringify({ results, requestSources, query }), {
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
