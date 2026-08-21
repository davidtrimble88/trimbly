// One-off admin backfill: finds existing homes missing a good photo_url,
// looks up its Zillow listing, and saves the hero photo — same extraction
// logic as zillow-lookup, but skipping the AI field extraction since only
// the photo is needed here, and scoped to all homes via service role
// (existing homes were created before the auto-photo feature existed, so
// they never got a chance to pick one up).
//
// Gated by a shared secret (not verify_jwt) since it's meant to be triggered
// once, directly, by whoever runs the backfill — not from the app itself.
// Pass { secret, overwrite: true } to also re-check homes that already have
// a photo_url (used once to correct the first run's wrong picks — the
// markdown-regex-only extraction was grabbing an arbitrary photo instead of
// the listing's actual first gallery photo).
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractHeroPhoto } from "../_shared/zillowPhoto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function findListingPhoto(apiKey: string, address: string): Promise<string | null> {
  try {
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `site:zillow.com ${address}`, limit: 3 }),
    });
    const searchData = await searchResponse.json();
    if (!searchResponse.ok || !searchData.success) return null;

    const results = searchData.data || [];
    const propertyResult = results.find((r: any) => r.url?.includes("zillow.com/homedetails")) || results[0];
    if (!propertyResult?.url) return null;

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: propertyResult.url, formats: ["html"], onlyMainContent: false, waitFor: 3000 }),
    });
    const scrapeData = await scrapeResponse.json();
    return extractHeroPhoto(scrapeData);
  } catch (e) {
    console.error("findListingPhoto failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const SECRET = Deno.env.get("BACKFILL_SECRET");
    if (!SECRET || body.secret !== SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const overwrite = body.overwrite === true;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = admin.from("homes").select("id, street_address, city, state").order("id");
    if (!overwrite) query = query.is("photo_url", null);
    // Optional paging so a large overwrite pass can be run in batches that
    // each finish well inside the edge idle timeout.
    const offset = Number.isFinite(body.offset) ? Number(body.offset) : null;
    const limit = Number.isFinite(body.limit) ? Number(body.limit) : null;
    if (offset !== null && limit !== null) query = query.range(offset, offset + limit - 1);
    const { data: homes, error } = await query;
    if (error) throw error;

    let updated = 0, notFound = 0, skippedNoAddress = 0;
    const results: { id: string; address: string; photo_url?: string }[] = [];

    for (const home of homes || []) {
      const addressParts = [home.street_address, home.city, home.state].filter(Boolean);
      if (addressParts.length < 2) { skippedNoAddress++; continue; }
      const address = addressParts.join(", ");

      const photoUrl = await findListingPhoto(FIRECRAWL_KEY, address);
      if (photoUrl) {
        const { error: updErr } = await admin.from("homes").update({ photo_url: photoUrl }).eq("id", home.id);
        if (!updErr) {
          updated++;
          results.push({ id: home.id, address, photo_url: photoUrl });
        } else {
          notFound++;
        }
      } else {
        notFound++;
      }
    }

    return new Response(
      JSON.stringify({ totalChecked: (homes || []).length, updated, notFound, skippedNoAddress, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("backfill-home-photos error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Backfill failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
