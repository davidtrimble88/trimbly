// One-off admin utility: registers a sending domain with Resend using the
// RESEND_API_KEY secret (which only edge functions can read) and returns the
// DNS records Resend wants, so they can be added in the domain registrar.
// GET  -> lists domains + verification status
// POST { name } -> creates the domain and returns its DNS records
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles || []).some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { name } = await req.json();
      if (!name || typeof name !== "string") {
        return new Response(JSON.stringify({ error: "name is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: list domains and their status/records; ?probe=api-keys probes GET /api-keys instead
    const url = new URL(req.url);
    const probe = url.searchParams.get("probe");
    const verifyId = url.searchParams.get("verify");
    if (verifyId) {
      // Ask Resend to (re-)check DNS for this domain id now
      const vRes = await fetch(`https://api.resend.com/domains/${verifyId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const vBody = await vRes.text();
      return new Response(vBody, {
        status: vRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const endpoint = probe === "api-keys" ? "https://api.resend.com/api-keys" : "https://api.resend.com/domains";
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("resend-domain-setup error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
