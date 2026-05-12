// Public XML sitemap generator. Renders site URLs + provider profiles
// + a small set of curated SEO category/city landing pages.
// No auth required — public read.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slugify = (s: string) =>
  (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATIC_PATHS = [
  "", "/about", "/search", "/post-job", "/pro-pricing", "/pro-register",
  "/help", "/contact", "/privacy", "/terms", "/blog",
];

const BLOG_SLUGS = [
  "homeowner-maintenance-checklist-by-season",
  "how-much-does-it-cost-to-hire-a-handyman",
  "diy-vs-hire-a-pro-when-to-pick-which",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const origin = new URL(req.url).searchParams.get("origin") || "https://homehero.app";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: providers } = await supabase
      .from("providers")
      .select("id, slug, category, city, state, updated_at")
      .eq("hidden", false)
      .limit(5000);

    const provs = providers || [];
    const today = new Date().toISOString().slice(0, 10);

    // Derive top (category, city/state) combinations from real providers.
    const comboCounts = new Map<string, { category: string; city: string; state: string; count: number }>();
    for (const p of provs) {
      if (!p.category || !p.city || !p.state) continue;
      const key = `${slugify(p.category)}|${slugify(p.city)}-${slugify(p.state)}`;
      const existing = comboCounts.get(key);
      if (existing) existing.count += 1;
      else comboCounts.set(key, { category: p.category, city: p.city, state: p.state, count: 1 });
    }

    const urls: string[] = [];
    const push = (loc: string, lastmod: string, priority: string) => {
      urls.push(
        `<url><loc>${origin}${loc}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`,
      );
    };

    for (const p of STATIC_PATHS) push(p || "/", today, p === "" ? "1.0" : "0.7");
    for (const slug of BLOG_SLUGS) push(`/blog/${slug}`, today, "0.7");

    for (const p of provs) {
      const path = p.slug ? `/pros/${p.slug}` : `/pro/${p.id}`;
      const lastmod = (p.updated_at || today).slice(0, 10);
      push(path, lastmod, "0.6");
    }

    for (const combo of comboCounts.values()) {
      const loc = `/services/${slugify(combo.category)}/${slugify(combo.city)}-${slugify(combo.state)}`;
      push(loc, today, "0.5");
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      urls.join("") +
      `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`<?xml version="1.0"?><error>${(e as Error).message}</error>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
