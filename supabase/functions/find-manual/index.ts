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



    const queryParts = [brand, model, productType, "user manual filetype:pdf"].filter(Boolean);
    const query = queryParts.join(" ");

    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 10 }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Firecrawl error ${res.status}`);
    }

    const raw: any[] =
      (Array.isArray(data?.data) && data.data) ||
      (Array.isArray(data?.data?.web) && data.data.web) ||
      [];

    const results: ManualResult[] = raw
      .map((r) => {
        const url: string = r.url || r.link || "";
        if (!url) return null;
        const isPdf = /\.pdf($|\?)/i.test(url) || /pdf/i.test(r.mimeType || "");
        const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
        return {
          title: r.title || r.name || url,
          url,
          description: r.description || r.snippet || "",
          isPdf,
          source: host,
        } as ManualResult;
      })
      .filter(Boolean) as ManualResult[];

    // PDFs first
    results.sort((a, b) => Number(b.isPdf) - Number(a.isPdf));

    // Validate reachability of PDF results (some hosts reject Deno's TLS).
    // Probe up to the first 6 PDFs in parallel and drop unreachable ones so
    // the client never tries to proxy a URL we already know will fail.
    const pdfs = results.filter((r) => r.isPdf).slice(0, 6);
    const probes = await Promise.all(
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
          return head.ok ? r.url : null;
        } catch {
          return null;
        }
      })
    );
    const reachable = new Set(probes.filter(Boolean) as string[]);
    const validated = results.filter((r) => !r.isPdf || reachable.has(r.url));
    // Re-sort so reachable PDFs stay on top
    validated.sort((a, b) => Number(b.isPdf) - Number(a.isPdf));

    return new Response(JSON.stringify({ results: validated, query }), {
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
