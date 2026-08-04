import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAFF_ROLES = ["admin", "moderator", "support", "analyst"];
const STAFF_EMAIL_DOMAIN = "staff.trimbly.internal";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Creates a new staff-only login: a username (no real email required) that maps
// to a synthetic internal account, same pattern as the original DavidLTrimble
// bootstrap account — see src/pages/Auth.tsx for the matching login-side logic
// and supabase/migrations/20260803100000_staff_cheat_code_login.sql for the
// original one-off version of this. This is the reusable, self-service version:
// any existing admin can add more employees without a new migration/deploy.
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
    if (!isAdmin) return json({ error: "Only admins can add staff members." }, 403);

    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "");
    const fullName = String(body.fullName || "").trim() || username;

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return json({ error: "Username must be 3-32 characters: letters, numbers, dots, underscores, or hyphens only." }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }
    if (!STAFF_ROLES.includes(role)) {
      return json({ error: "Invalid access level." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const email = `${username}@${STAFF_EMAIL_DOMAIN}`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, user_type: "homeowner" },
    });
    if (createErr) {
      const msg = /already.*registered|already exists/i.test(createErr.message)
        ? "That username is already taken."
        : createErr.message;
      return json({ error: msg }, 400);
    }

    const newUserId = created.user!.id;
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: newUserId, role });
    if (roleErr) {
      return json({ error: `Account created but role assignment failed: ${roleErr.message}` }, 500);
    }

    return json({ success: true, username, role }, 200);
  } catch (e) {
    console.error("create-staff-account error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
