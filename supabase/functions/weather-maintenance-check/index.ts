// Checks each home's forecast for maintenance-relevant weather (freeze,
// heavy rain, high wind, extreme heat) and upserts alerts. Designed to be
// invoked either:
//   1. On a schedule (recommended: Supabase Dashboard > Edge Functions >
//      this function > Add a schedule, e.g. daily at 13:00 UTC), scanning
//      every home with a body of {} or omitted.
//   2. On-demand for a single home via { home_id } in the body (used by the
//      "Check weather now" button in the app), scoped to just that owner.
//
// Uses Open-Meteo (open-meteo.com) — free, no API key, no rate-limit key
// needed for reasonable volumes — for both geocoding and forecast data.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREEZE_F = 32;
const HEAVY_RAIN_IN = 1.5;
const HIGH_WIND_MPH = 40;
const EXTREME_HEAT_F = 100;

async function geocode(city: string, state: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const results: any[] = json?.results || [];
  // Prefer a result whose admin1 (state/province) matches, since city names repeat across states.
  const match = results.find((r) => (r.admin1 || "").toLowerCase().includes(state.toLowerCase()))
    || results[0];
  if (!match) return null;
  return { lat: match.latitude, lon: match.longitude };
}

async function getForecast(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max` +
    `&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed (${res.status})`);
  return res.json();
}

function buildAlerts(homeId: string, forecast: any): { home_id: string; alert_type: string; message: string; valid_date: string }[] {
  const days: string[] = forecast?.daily?.time || [];
  const tmin: number[] = forecast?.daily?.temperature_2m_min || [];
  const tmax: number[] = forecast?.daily?.temperature_2m_max || [];
  const precip: number[] = forecast?.daily?.precipitation_sum || [];
  const wind: number[] = forecast?.daily?.windspeed_10m_max || [];

  const alerts: { home_id: string; alert_type: string; message: string; valid_date: string }[] = [];
  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    if (tmin[i] !== undefined && tmin[i] <= FREEZE_F) {
      alerts.push({ home_id: homeId, alert_type: "freeze", valid_date: date,
        message: `Freeze warning for ${date}: low of ${Math.round(tmin[i])}°F. Disconnect hoses, insulate exposed pipes and outdoor faucets.` });
    }
    if (precip[i] !== undefined && precip[i] >= HEAVY_RAIN_IN) {
      alerts.push({ home_id: homeId, alert_type: "heavy_rain", valid_date: date,
        message: `Heavy rain expected ${date}: ${precip[i].toFixed(1)}" forecast. Clear gutters and downspouts, check for grading issues near the foundation.` });
    }
    if (wind[i] !== undefined && wind[i] >= HIGH_WIND_MPH) {
      alerts.push({ home_id: homeId, alert_type: "high_wind", valid_date: date,
        message: `High winds expected ${date}: gusts to ${Math.round(wind[i])} mph. Secure loose outdoor furniture and check for loose roof shingles or siding.` });
    }
    if (tmax[i] !== undefined && tmax[i] >= EXTREME_HEAT_F) {
      alerts.push({ home_id: homeId, alert_type: "extreme_heat", valid_date: date,
        message: `Extreme heat expected ${date}: high of ${Math.round(tmax[i])}°F. Check your AC/HVAC system now, before demand spikes.` });
    }
  }
  return alerts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const singleHomeId: string | undefined = body.home_id;

    let query = admin.from("homes").select("id, city, state, country, latitude, longitude");
    if (singleHomeId) query = query.eq("id", singleHomeId);
    const { data: homes, error: homesErr } = await query;
    if (homesErr) throw homesErr;

    let alertsWritten = 0;
    for (const home of homes || []) {
      try {
        let lat = home.latitude;
        let lon = home.longitude;
        if (lat == null || lon == null) {
          const geo = await geocode(home.city, home.state, home.country || "US");
          if (!geo) continue;
          lat = geo.lat;
          lon = geo.lon;
          await admin.from("homes").update({ latitude: lat, longitude: lon }).eq("id", home.id);
        }

        const forecast = await getForecast(lat, lon);
        const alerts = buildAlerts(home.id, forecast);
        if (alerts.length > 0) {
          const { error: upsertErr } = await admin.from("home_weather_alerts").upsert(alerts, {
            onConflict: "home_id,alert_type,valid_date",
            ignoreDuplicates: true,
          });
          if (!upsertErr) alertsWritten += alerts.length;
        }
      } catch (innerErr) {
        console.error(`weather-maintenance-check: failed for home ${home.id}`, innerErr);
      }
    }

    return new Response(JSON.stringify({ homesChecked: (homes || []).length, alertsWritten }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weather-maintenance-check error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Weather check failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
