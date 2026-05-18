import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."), {
        headers: { "Content-Type": "text/html" },
        status: 400,
      });
    }

    // Verify token (simple HMAC to prevent abuse)
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
    const expectedToken = btoa(String.fromCharCode(...new Uint8Array(expectedSig))).replace(/[+/=]/g, "").substring(0, 32);

    if (token !== expectedToken) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or has been tampered with."), {
        headers: { "Content-Type": "text/html" },
        status: 403,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert opt-out (upsert to handle duplicates)
    const { error } = await supabase.from("email_optouts").upsert(
      { email, opted_out_at: new Date().toISOString() },
      { onConflict: "email" }
    );

    if (error) {
      console.error("Opt-out error:", error);
      return new Response(renderPage("Error", "Something went wrong. Please try again later."), {
        headers: { "Content-Type": "text/html" },
        status: 500,
      });
    }

    return new Response(
      renderPage(
        "You've been unsubscribed",
        "You won't receive any more notification emails from Trimbly. If you change your mind, you can always sign up at trimbly.com."
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(renderPage("Error", "Something went wrong."), {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
});

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Trimbly</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; }
    .card { background: white; border-radius: 12px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { font-size: 16px; color: #6b7280; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
