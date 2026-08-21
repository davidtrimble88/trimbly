// On-demand "what's it like outside right now" for a single home, powering
// the ambient weather chip in the dashboard header. Deliberately separate
// from weather-maintenance-check (which is forecast/alert-focused and can
// run on a schedule) — this one just returns current conditions and writes
// nothing to the database. Same free, keyless Open-Meteo API.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function geocode(city: string, state: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const results: any[] = json?.results || [];
  const match = results.find((r) => (r.admin1 || "").toLowerCase().includes(state.toLowerCase())) || results[0];
  if (!match) return null;
  return { lat: match.latitude, lon: match.longitude };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const homeId: string | undefined = body.home_id;
    if (!homeId) {
      return new Response(JSON.stringify({ error: "home_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: home, error: homeErr } = await admin
      .from("homes").select("id, city, state, country, latitude, longitude").eq("id", homeId).maybeSingle();
    if (homeErr) throw homeErr;
    if (!home) {
      return new Response(JSON.stringify({ error: "Home not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let lat = home.latitude;
    let lon = home.longitude;
    if (lat == null || lon == null) {
      const geo = await geocode(home.city, home.state, home.country || "US");
      if (!geo) {
        return new Response(JSON.stringify({ error: "Could not locate this home" }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lat = geo.lat;
      lon = geo.lon;
      await admin.from("homes").update({ latitude: lat, longitude: lon }).eq("id", home.id);
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,is_day` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo current-weather failed (${res.status})`);
    const json = await res.json();
    const current = json?.current;
    if (!current) throw new Error("No current-conditions data returned");

    const daily = json?.daily;
    const forecast = (daily?.time || []).map((date: string, i: number) => ({
      date,
      tempMaxF: Math.round(daily.temperature_2m_max[i]),
      tempMinF: Math.round(daily.temperature_2m_min[i]),
      weatherCode: daily.weather_code[i],
      precipProbability: daily.precipitation_probability_max?.[i] ?? null,
    }));

    return new Response(JSON.stringify({
      tempF: Math.round(current.temperature_2m),
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      forecast,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weather-current error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Weather lookup failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
