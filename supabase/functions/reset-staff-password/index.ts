import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validateStaffPassword } from "../_shared/staffPasswordPolicy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAFF_EMAIL_DOMAIN = "staff.trimbly.internal";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Admin-only: reset the password of an existing staff (username) login.
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
    if (!(roles || []).some((r: any) => r.role === "admin")) {
      return json({ error: "Only admins can reset staff passwords." }, 403);
    }

    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase().replace(/@.*$/, "");
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json({ error: "Invalid username." }, 400);
    const pwError = validateStaffPassword(password, username);
    if (pwError) return json({ error: pwError }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const email = `${username}@${STAFF_EMAIL_DOMAIN}`;

    let targetId: string | null = null;
    for (let page = 1; page <= 20 && !targetId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const found = data.users.find((u) => (u.email || "").toLowerCase() === email);
      if (found) targetId = found.id;
      if (data.users.length < 200) break;
    }
    if (!targetId) return json({ error: "No staff account found for that username." }, 404);

    const { error: updErr } = await admin.auth.admin.updateUserById(targetId, {
      password,
      email_confirm: true,
    });
    if (updErr) return json({ error: updErr.message }, 400);

    return json({ success: true, username }, 200);
  } catch (e) {
    console.error("reset-staff-password error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
