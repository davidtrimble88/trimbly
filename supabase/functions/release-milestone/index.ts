// Called when the homeowner approves completed work for a funded milestone.
// Moves the FULL milestone amount to the provider's Stripe Connect account
// as a separate Transfer (money already sits in Trimbly's own balance from
// fund-milestone). No platform cut is taken here — consistent with
// Trimbly's "we don't take a portion of what you earn" pricing promise;
// Stripe's own card-processing fee is absorbed by the platform, not the pro.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`release-milestone:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");

    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const milestoneId = (body.milestone_id || "").toString();
    if (!milestoneId) {
      return new Response(JSON.stringify({ error: "milestone_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: milestone, error: milestoneErr } = await admin
      .from("job_milestones")
      .select("*")
      .eq("id", milestoneId)
      .maybeSingle();
    if (milestoneErr || !milestone) {
      return new Response(JSON.stringify({ error: "Milestone not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (milestone.homeowner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the homeowner who funded this milestone can release it" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (milestone.status !== "funded") {
      return new Response(JSON.stringify({ error: `Milestone is ${milestone.status}, not funded` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: provider } = await admin
      .from("providers")
      .select("stripe_connect_account_id, stripe_connect_payouts_enabled")
      .eq("id", milestone.provider_id)
      .maybeSingle();
    if (!provider?.stripe_connect_account_id || !provider.stripe_connect_payouts_enabled) {
      return new Response(JSON.stringify({ error: "Provider's payout account isn't ready. Contact support." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const transfer = await stripe.transfers.create({
      amount: milestone.amount_cents,
      currency: "usd",
      destination: provider.stripe_connect_account_id,
      transfer_group: milestone.transfer_group || undefined,
      description: `Milestone release: ${milestone.title}`,
    });

    const { error: updateErr } = await admin.from("job_milestones").update({
      status: "released",
      released_at: new Date().toISOString(),
      stripe_transfer_id: transfer.id,
    }).eq("id", milestone.id);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ released: true, transferId: transfer.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("release-milestone error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to release payment" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
