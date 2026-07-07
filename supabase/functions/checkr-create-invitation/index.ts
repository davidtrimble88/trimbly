// Creates a Checkr candidate + hosted invitation for the calling provider,
// and marks their provider_verifications row as "pending". Checkr's hosted
// Apply Flow collects the candidate's SSN/DOB/consent directly — this
// platform never touches that PII, which keeps our compliance surface small.
//
// Checkr API reference: https://docs.checkr.com/ (Candidates, Invitations)
// Auth: HTTP Basic, secret API key as username, empty password.
import { createClient } from "npm:@supabase/supabase-js@2";
import { readJson, requireString, validationErrorResponse } from "../_shared/validation.ts";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHECKR_BASE = "https://api.checkr.com/v1";

// Statuses from which a provider may request/re-request a background check.
const REINVITABLE_STATUSES = new Set(["not_started", "failed", "expired", "consider"]);

function checkrAuthHeader(): string {
  const key = Deno.env.get("CHECKR_API_KEY");
  if (!key) throw new Error("CHECKR_API_KEY is not configured");
  return `Basic ${btoa(`${key}:`)}`;
}

async function checkrRequest(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CHECKR_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: checkrAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error?.message || json?.message || `Checkr request to ${path} failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientKey = getClientKey(req);
    const rl = rateLimit(`checkr-invite:${clientKey}`, { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Body is optional today (package comes from env), but keep validation in
    // place in case a package tier ever gets selected client-side.
    let requestedPackage: string | undefined;
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > 0) {
      const body = await readJson(req);
      requestedPackage = requireString(body.package ?? Deno.env.get("CHECKR_PACKAGE") ?? "tasker_pro", "package", { min: 1, max: 100 });
    }
    const packageSlug = requestedPackage || Deno.env.get("CHECKR_PACKAGE") || "tasker_pro";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: provider, error: providerErr } = await admin
      .from("providers")
      .select("id, business_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (providerErr || !provider) {
      return new Response(JSON.stringify({ error: "No provider profile found for this account" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: verification } = await admin
      .from("provider_verifications")
      .select("*")
      .eq("provider_id", provider.id)
      .maybeSingle();

    if (verification && !REINVITABLE_STATUSES.has(verification.background_check_status)) {
      return new Response(
        JSON.stringify({ error: `A background check is already ${verification.background_check_status.replace("_", " ")}.` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const fullName = (profile?.full_name || "").trim();
    const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const lastName = rest.join(" ");

    if (!user.email) {
      return new Response(JSON.stringify({ error: "Account is missing an email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create (or reuse) the Checkr candidate.
    const candidate = await checkrRequest("/candidates", {
      email: user.email,
      first_name: firstName || "Provider",
      last_name: lastName || provider.business_name || "Unknown",
      no_middle_name: true,
    });

    // 2. Send the hosted invitation. Checkr emails the candidate and returns
    // an invitation_url we can also redirect to directly for a smoother UX.
    const invitation = await checkrRequest("/invitations", {
      candidate_id: candidate.id,
      package: packageSlug,
    });

    const { error: upsertErr } = await admin.from("provider_verifications").upsert(
      {
        provider_id: provider.id,
        background_check_status: "pending",
        checkr_candidate_id: candidate.id,
        checkr_invitation_id: invitation.id,
        checkr_report_id: null,
        background_check_requested_at: new Date().toISOString(),
        background_check_completed_at: null,
        background_check_expires_at: null,
      },
      { onConflict: "provider_id" },
    );
    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({ invitation_url: invitation.invitation_url, status: "pending" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if ((err as any)?.field !== undefined || (err as any)?.status === 400) {
      return validationErrorResponse(err, corsHeaders);
    }
    console.error("checkr-create-invitation error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to start background check" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
