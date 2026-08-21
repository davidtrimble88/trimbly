import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { iconForWeatherCode } from "@/lib/weatherIcons";

interface Props {
  homeId: string;
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

  const Icon = iconForWeatherCode(data.weatherCode, data.isDay);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground rounded-full border border-border bg-card px-2.5 py-1">
      <Icon size={13} className="text-primary" />
      {data.tempF}°F
    </span>
  );
}
