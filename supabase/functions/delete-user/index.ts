import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Only admins can delete users." }, 403);

    const body = await req.json().catch(() => ({}));
    const targetId = String(body.userId || "");
    const reason = String(body.reason || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(targetId)) return json({ error: "Invalid user id." }, 400);
    if (reason.length < 10) return json({ error: "A deletion reason of at least 10 characters is required." }, 400);
    if (targetId === user.id) return json({ error: "You cannot delete your own account." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", targetId);
    if ((targetRoles || []).some((r: any) => r.role === "admin")) {
      return json({ error: "Admin accounts cannot be deleted here. Remove the admin role first." }, 400);
    }

    const { data: profile } = await admin.from("profiles").select("*").eq("id", targetId).maybeSingle();
    const { data: authUser } = await admin.auth.admin.getUserById(targetId);

    const { error: archiveErr } = await admin.from("archived_users").insert({
      user_id: targetId,
      full_name: profile?.full_name ?? "",
      user_type: profile?.user_type ?? "",
      subscription_tier: profile?.subscription_tier ?? "",
      email: authUser?.user?.email ?? null,
      joined_at: profile?.created_at ?? null,
      deleted_by: user.id,
      reason,
      snapshot: { profile: profile ?? null, roles: targetRoles ?? [] },
    });
    if (archiveErr) return json({ error: `Archive failed: ${archiveErr.message}` }, 500);

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) return json({ error: `Archived, but delete failed: ${delErr.message}` }, 500);

    await admin.from("staff_activity_log").insert({
      actor_id: user.id,
      action: "user_deleted",
      target_type: "user",
      target_id: targetId,
      details: { reason },
    });

    return json({ success: true }, 200);
  } catch (e) {
    console.error("delete-user error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
