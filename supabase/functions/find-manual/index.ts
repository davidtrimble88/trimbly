import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface ManualResult {
  title: string;
  url: string;
  description?: string;
  isPdf: boolean;
  source: string;
}

import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireString, optionalString, validationErrorResponse } from "../_shared/validation.ts";

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



    const queryParts = [brand, model, productType, '"owner\'s manual" OR "user manual" OR "installation manual" OR "instruction manual" filetype:pdf'].filter(Boolean);
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

    // Keywords indicating a partial/supplementary document (not a full manual)
    const PARTIAL_RX = /(performance\s*data|spec(ification)?\s*sheet|data\s*sheet|cut\s*sheet|submittal|brochure|sales\s*sheet|quick\s*start|quick\s*reference|warranty|parts\s*list|parts\s*diagram|declaration|safety\s*data|\bsds\b|\bmsds\b|flyer|catalog)/i;
    const FULL_RX = /(owner'?s?\s*manual|user\s*manual|installation\s*(and|&)?\s*(operation|maintenance)?\s*manual|installation\s*manual|instruction\s*manual|service\s*manual|operation\s*manual|use\s*and\s*care)/i;

    const results: (ManualResult & { _score: number; _size: number })[] = raw
      .map((r) => {
        const url: string = r.url || r.link || "";
        if (!url) return null;
        const isPdf = /\.pdf($|\?)/i.test(url) || /pdf/i.test(r.mimeType || "");
        const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
        const title = r.title || r.name || url;
        const desc = r.description || r.snippet || "";
        const hay = `${title} ${desc} ${url}`;
        let score = 0;
        if (FULL_RX.test(hay)) score += 10;
        if (PARTIAL_RX.test(hay)) score -= 8;
        if (isPdf) score += 2;
        return {
          title,
          url,
          description: desc,
          isPdf,
          source: host,
          _score: score,
          _size: 0,
        };
      })
      .filter(Boolean) as any[];

    // Probe PDFs (reachability + size). Reject tiny PDFs (< 200KB) — likely
    // spec sheets or single-page datasheets rather than full manuals.
    const MIN_MANUAL_BYTES = 200_000;
    const pdfs = results.filter((r) => r.isPdf).slice(0, 8);
    await Promise.all(
      pdfs.map(async (r) => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 6000);
          const head = await fetch(r.url, {
            method: "HEAD",
            redirect: "follow",
            signal: ctrl.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)",
              Accept: "application/pdf,*/*;q=0.8",
            },
          });
          clearTimeout(t);
          if (!head.ok) { r._score = -100; return; }
          const len = Number(head.headers.get("content-length") || 0);
          r._size = len;
          if (len && len < MIN_MANUAL_BYTES) {
            r._score -= 15;
          } else if (len > 1_000_000) {
            r._score += 3;
          }
        } catch {
          r._score = -100;
        }
      })
    );

    const validated = results
      .filter((r) => r._score > -50)
      .sort((a, b) => b._score - a._score)
      .map(({ _score, _size, ...rest }) => rest);

    // If no usable PDF manual was found, search for pages where the user can
    // request the manual (support, contact, literature request pages).
    let requestSources: ManualResult[] = [];
    const hasUsablePdf = validated.some((r) => r.isPdf);
    if (!hasUsablePdf) {
      const reqQueryParts = [
        brand,
        model,
        productType,
        '(support OR "contact us" OR "request manual" OR "request documentation" OR "literature request" OR "owner center" OR "product registration")',
      ].filter(Boolean);
      const reqQuery = reqQueryParts.join(" ");
      try {
        const reqRes = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: reqQuery, limit: 8 }),
        });
        const reqData = await reqRes.json();
        if (reqRes.ok) {
          const reqRaw: any[] =
            (Array.isArray(reqData?.data) && reqData.data) ||
            (Array.isArray(reqData?.data?.web) && reqData.data.web) ||
            [];
          const brandHost = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
          const REQ_RX = /(support|contact|request|literature|owner|customer|help|service|register)/i;
          requestSources = reqRaw
            .map((r) => {
              const url: string = r.url || r.link || "";
              if (!url) return null;
              const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
              const title = r.title || r.name || url;
              const desc = r.description || r.snippet || "";
              const hay = `${title} ${desc} ${url}`;
              // Prefer the manufacturer's own domain when we can detect it
              const brandDomainMatch = brandHost && host.replace(/[^a-z0-9]/g, "").includes(brandHost);
              const relevant = REQ_RX.test(hay) || brandDomainMatch;
              if (!relevant) return null;
              return {
                title,
                url,
                description: desc,
                isPdf: /\.pdf($|\?)/i.test(url),
                source: host,
                _brand: brandDomainMatch ? 1 : 0,
              };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => b._brand - a._brand)
            .slice(0, 5)
            .map(({ _brand, ...rest }: any) => rest);
        }
      } catch (e) {
        console.error("find-manual request-sources fallback error:", e);
      }
    }

    return new Response(
      JSON.stringify({ results: validated, requestSources, query }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("find-manual error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
