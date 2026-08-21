import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Moon, CloudMoon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  homeId: string;
}

// Open-Meteo WMO weather codes collapsed into a handful of icon buckets —
// see https://open-meteo.com/en/docs for the full table.
function iconFor(code: number, isDay: boolean) {
  if (code === 0 || code === 1) return isDay ? Sun : Moon;
  if (code === 2) return isDay ? Cloud : CloudMoon;
  if (code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

/** Small ambient "what's it like outside" chip for a home — passive,
 * doesn't require a click like the forecast-alert "Check weather now"
 * button does. Fetches once on mount; not polled, since dashboard visits
 * are frequent enough that "as of this page load" is fresh enough. */
export default function CurrentWeatherChip({ homeId }: Props) {
  const [data, setData] = useState<{ tempF: number; weatherCode: number; isDay: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: res, error } = await supabase.functions.invoke("weather-current", { body: { home_id: homeId } });
      if (cancelled) return;
      if (error || res?.error) { setFailed(true); return; }
      setData(res);
    })();
    return () => { cancelled = true; };
  }, [homeId]);

  if (failed || !data) return null;

  const Icon = iconFor(data.weatherCode, data.isDay);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground rounded-full border border-border bg-card px-2.5 py-1">
      <Icon size={13} className="text-primary" />
      {data.tempF}°F
    </span>
  );
}
