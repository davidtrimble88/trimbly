// Decodes a VIN and checks for open recalls using NHTSA's free, public APIs
// (no API key required). Two modes:
//   mode=decode  -> { year, make, model, trim, engine, fuelType, bodyClass }
//   mode=recalls -> { recalls: [...] } for a given make/model/year (usually
//                   the decoded values from the vehicle's own record)
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanVin(vin: string): string {
  return vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function decodeVin(vin: string) {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NHTSA decode request failed (${res.status})`);
  const json = await res.json();
  const row = json?.Results?.[0];
  if (!row) throw new Error("No decode result returned");

  const errorCode = row.ErrorCode;
  if (errorCode && errorCode !== "0") {
    throw new Error(row.ErrorText || "VIN could not be decoded");
  }

  return {
    year: row.ModelYear ? Number(row.ModelYear) : null,
    make: row.Make || null,
    model: row.Model || null,
    trim: row.Trim || row.Series || null,
    engine: [row.EngineCylinders && `${row.EngineCylinders}-cyl`, row.DisplacementL && `${row.DisplacementL}L`, row.EngineModel]
      .filter(Boolean).join(" "),
    fuelType: row.FuelTypePrimary || null,
    bodyClass: row.BodyClass || null,
    vehicleType: row.VehicleType || null,
  };
}

async function checkRecalls(make: string, model: string, modelYear: string) {
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(modelYear)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NHTSA recalls request failed (${res.status})`);
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map((r: Record<string, unknown>) => ({
    campaignNumber: r.NHTSACampaignNumber,
    component: r.Component,
    summary: r.Summary,
    consequence: r.Consequence,
    remedy: r.Remedy,
    reportedDate: r.ReportReceivedDate,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`vin-lookup:${getClientKey(req)}`, { limit: 15, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "decode";
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (mode === "recalls") {
      const make = (body.make || url.searchParams.get("make") || "").toString();
      const model = (body.model || url.searchParams.get("model") || "").toString();
      const modelYear = (body.modelYear || url.searchParams.get("modelYear") || "").toString();
      if (!make || !model || !modelYear) {
        return new Response(JSON.stringify({ error: "make, model, and modelYear are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const recalls = await checkRecalls(make, model, modelYear);
      return new Response(JSON.stringify({ recalls }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawVin = (body.vin || url.searchParams.get("vin") || "").toString();
    const vin = cleanVin(rawVin);
    if (vin.length !== 17) {
      return new Response(JSON.stringify({ error: "A valid 17-character VIN is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decoded = await decodeVin(vin);
    return new Response(JSON.stringify(decoded), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("vin-lookup error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Lookup failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
