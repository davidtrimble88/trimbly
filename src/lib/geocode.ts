// Free geocoding via OpenStreetMap Nominatim (no API key). Same approach already
// proven in JobBoard.tsx's radius search. Nominatim's usage policy asks for
// max ~1 request/second, so callers geocoding multiple locations should space
// requests out (see geocodeBatch).

export type LatLon = { lat: number; lon: number };

export async function geocode(query: string): Promise<LatLon | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error("geocode failed", e);
  }
  return null;
}

/** Geocodes a list of location strings sequentially with a polite delay, skipping any already in `cache`. */
export async function geocodeBatch(queries: string[], cache: Record<string, LatLon | null>): Promise<Record<string, LatLon | null>> {
  const toFetch = Array.from(new Set(queries)).filter((q) => !(q in cache));
  const results: Record<string, LatLon | null> = {};
  for (const q of toFetch) {
    results[q] = await geocode(q);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 1100));
  }
  return results;
}

export function distanceMiles(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
