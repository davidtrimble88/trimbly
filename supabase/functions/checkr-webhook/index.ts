// Receives Checkr webhook events and updates provider_verifications.
// Checkr sends events like report.created, report.completed, report.updated,
// invitation.completed, invitation.expired. We key off checkr_candidate_id
// since it's present on every resource type Checkr sends us.
//
// Signature verification: Checkr signs the raw request body with your
// webhook signing secret (HMAC-SHA256, hex digest) in the X-Checkr-Signature
// header. Configure the webhook + secret in the Checkr Dashboard under
// Developer Settings, and store the secret as CHECKR_WEBHOOK_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-checkr-signature",
};

// One year, matches typical background-check re-screen cadence.
const VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, signature);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-checkr-signature") || "";
    const secret = Deno.env.get("CHECKR_WEBHOOK_SECRET");

    if (!secret) {
      console.error("checkr-webhook: CHECKR_WEBHOOK_SECRET is not configured — rejecting all events");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!signature || !(await verifySignature(rawBody, signature, secret))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const type: string = event?.type || "";
    const resource = event?.data?.object;
    if (!resource) {
      // Nothing to act on — acknowledge so Checkr doesn't retry forever.
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateId: string | undefined = resource.candidate_id || (type.startsWith("candidate.") ? resource.id : undefined);
    if (!candidateId) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: verification } = await admin
      .from("provider_verifications")
      .select("id")
      .eq("checkr_candidate_id", candidateId)
      .maybeSingle();

    if (!verification) {
      // Event for a candidate we don't recognize (or already cleaned up) — ack anyway.
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {};

    switch (type) {
      case "invitation.expired": {
        updates.background_check_status = "expired";
        break;
      }
      case "report.created": {
        updates.checkr_report_id = resource.id;
        updates.background_check_status = "pending";
        break;
      }
      case "report.completed":
      case "report.updated": {
        updates.checkr_report_id = resource.id;
        const result: string | undefined = resource.result || resource.adjudication;
        if (resource.status === "complete" || result) {
          if (result === "clear") {
            updates.background_check_status = "clear";
          } else if (result === "consider") {
            updates.background_check_status = "consider";
          } else if (resource.status === "complete") {
            // Completed with no consumer-facing result field — treat as clear
            // by default; staff can always override in the review panel.
            updates.background_check_status = "clear";
          }
          if (updates.background_check_status === "clear" || updates.background_check_status === "consider") {
            const completedAt = resource.completed_at ? new Date(resource.completed_at) : new Date();
            updates.background_check_completed_at = completedAt.toISOString();
            updates.background_check_expires_at = new Date(completedAt.getTime() + VALIDITY_MS).toISOString();
          }
        }
        break;
      }
      default:
        // candidate.created/updated, invitation.created/completed, adverse_action.* —
        // no direct status change needed; the report events above drive state.
        break;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from("provider_verifications").update(updates).eq("id", verification.id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("checkr-webhook error:", err);
    // Still return 200-ish so Checkr doesn't hammer retries on our bug; log for investigation.
    return new Response(JSON.stringify({ error: "Internal error, logged" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
