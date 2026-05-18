// Proxies a remote PDF (or document) through our domain so it can be
// viewed/downloaded in-app without linking the user to a 3rd-party site.

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/octet-stream",
  "application/x-pdf",
];

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    const mode = url.searchParams.get("mode") || "inline"; // "inline" or "download"
    const filename = url.searchParams.get("filename") || "user-manual.pdf";

    if (!target) {
      return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only http(s) URLs allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)",
        Accept: "application/pdf,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/pdf";
    const isPdfLike =
      ALLOWED_CONTENT_TYPES.some((t) => contentType.toLowerCase().includes(t)) ||
      /\.pdf(\?|$)/i.test(parsed.pathname);

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const finalName = safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;

    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": isPdfLike ? "application/pdf" : contentType,
      "Content-Disposition": `${mode === "download" ? "attachment" : "inline"}; filename="${finalName}"`,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("manual-proxy error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
