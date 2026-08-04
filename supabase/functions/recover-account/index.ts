import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { validateStaffPassword } from "../_shared/staffPasswordPolicy.ts";
import { isCommonWeakPassword } from "../_shared/passwordCommon.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Public, unauthenticated account recovery via security questions — an
// alternative to the email reset-link flow for anyone who can't access that
// inbox (including staff accounts, which use a synthetic @staff.trimbly.internal
// address that can never receive real email). Two actions:
//   "get-questions" — fetch the 3 question prompts for an identifier (email or
//     staff username). Always returns a generic empty result on any miss
//     (unknown account, no questions set up) so this can't be used to enumerate
//     which accounts exist.
//   "recover" — verify all 3 answers and, only if every one is correct, set a
//     new password. All real verification happens inside the SECURITY DEFINER
//     Postgres function; this edge function's job is rate limiting + basic
//     password-strength validation of the new password before it reaches the DB.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(SUPABASE_URL, ANON_KEY);

    const body = await req.json();
    const action = String(body.action || "");
    const identifier = String(body.identifier || "").trim();
    if (!identifier) return json({ error: "Enter your email or username." }, 400);

    if (action === "get-questions") {
      const rl = rateLimit(`recover-account:questions:${getClientKey(req)}`, { limit: 15, windowMs: 10 * 60_000 });
      if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

      const { data, error } = await client.rpc("get_recovery_questions", { p_identifier: identifier });
      if (error) return json({ error: "Something went wrong. Please try again." }, 500);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return json({ questions: null }, 200);
      return json({ questions: [row.question_1, row.question_2, row.question_3] }, 200);
    }

    if (action === "recover") {
      const rl = rateLimit(`recover-account:recover:${getClientKey(req)}`, { limit: 5, windowMs: 15 * 60_000 });
      if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

      const answer1 = String(body.answer1 || "");
      const answer2 = String(body.answer2 || "");
      const answer3 = String(body.answer3 || "");
      const newPassword = String(body.newPassword || "");
      if (!answer1 || !answer2 || !answer3) {
        return json({ error: "Please answer all three questions." }, 400);
      }

      // Whichever policy is stricter for this identifier's account type doesn't
      // matter much here — apply the lighter standard-user floor plus the common
      // weak-password check; staff accounts get their own stricter check too.
      if (newPassword.length < 8) {
        return json({ error: "New password must be at least 8 characters." }, 400);
      }
      if (isCommonWeakPassword(newPassword)) {
        return json({ error: "That password is too common — pick something less guessable." }, 400);
      }
      if (identifier.includes("@staff.trimbly.internal") || !identifier.includes("@")) {
        const staffErr = validateStaffPassword(newPassword, identifier.split("@")[0]);
        if (staffErr) return json({ error: staffErr }, 400);
      }

      const { data, error } = await client.rpc("recover_account_via_security_questions", {
        p_identifier: identifier,
        p_answer_1: answer1,
        p_answer_2: answer2,
        p_answer_3: answer3,
        p_new_password: newPassword,
      });
      if (error) return json({ error: "Something went wrong. Please try again." }, 500);
      if (!data) return json({ error: "One or more answers didn't match. Please try again." }, 400);
      return json({ success: true }, 200);
    }

    return json({ error: "Invalid action." }, 400);
  } catch (e) {
    console.error("recover-account error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
