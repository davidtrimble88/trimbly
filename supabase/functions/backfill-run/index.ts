// Temporary internal runner: invokes backfill-home-photos with the stored
// BACKFILL_SECRET so the secret never leaves the backend. Deleted after use.
Deno.serve(async (req) => {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/backfill-home-photos`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: Deno.env.get("BACKFILL_SECRET"),
      overwrite: true,
      offset: body.offset,
      limit: body.limit,
    }),
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
});
