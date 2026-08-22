// Lets a signed-in user permanently delete their own account. Mirrors the
// staff-side delete-user function's archive-then-delete pattern (same
// archived_users table) so there's one consistent audit trail for account
// removal, whether it was staff- or self-initiated — this one just scopes
// the target to the caller's own id instead of taking an arbitrary userId,
// and doesn't require an admin role.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`delete-own-account:${getClientKey(req)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    if (body.confirm !== "DELETE") {
      return json({ error: "Type DELETE to confirm." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if ((roles || []).some((r: any) => r.role === "admin")) {
      return json({ error: "Admin accounts can't be self-deleted here — remove the admin role first." }, 400);
    }

    const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();

    const { error: archiveErr } = await admin.from("archived_users").insert({
      user_id: user.id,
      full_name: profile?.full_name ?? "",
      user_type: profile?.user_type ?? "",
      subscription_tier: profile?.subscription_tier ?? "",
      email: user.email ?? null,
      joined_at: profile?.created_at ?? null,
      deleted_by: user.id,
      reason: "Self-service account deletion",
      snapshot: { profile: profile ?? null, roles: roles ?? [] },
    });
    if (archiveErr) return json({ error: `Could not archive account: ${archiveErr.message}` }, 500);

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: `Account not deleted: ${delErr.message}` }, 500);

    return json({ success: true }, 200);
  } catch (e) {
    console.error("delete-own-account error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
