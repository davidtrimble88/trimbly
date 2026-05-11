import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface ManualResult {
  title: string;
  url: string;
  description?: string;
  isPdf: boolean;
  source: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const brand = String(body?.brand ?? "").trim();
    const model = String(body?.model ?? "").trim();
    const productType = String(body?.productType ?? "").trim();

    if (!brand || !model) {
      return new Response(
        JSON.stringify({ error: "Brand and model are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(JSON.stringify({ results, query }), {
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
