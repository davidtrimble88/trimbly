import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { iconForWeatherCode } from "@/lib/weatherIcons";
import { Skeleton } from "@/components/ui/skeleton";

interface DayForecast {
  date: string;
  tempMaxF: number;
  tempMinF: number;
  weatherCode: number;
  precipProbability: number | null;
}

interface Props {
  homeId: string;
}

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

/** 5-day forecast strip for a home's primary location — the actual
 * temperatures/conditions ahead, complementing WeatherAlertsBanner's
 * maintenance-relevant alerts (which only fire past specific thresholds). */
export default function WeatherForecastStrip({ homeId }: Props) {
  const [days, setDays] = useState<DayForecast[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    setFailed(false);
    (async () => {
      const { data: res, error } = await supabase.functions.invoke("weather-current", { body: { home_id: homeId } });
      if (cancelled) return;
      if (error || res?.error || !res?.forecast) { setFailed(true); return; }
      setDays(res.forecast);
    })();
    return () => { cancelled = true; };
  }, [homeId]);

  if (failed) return null;

  if (!days) {
    return (
      <div className="grid grid-cols-5 gap-2 mb-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2 mb-3">
      {days.map((day, i) => {
        const Icon = iconForWeatherCode(day.weatherCode);
        return (
          <div key={day.date} className="rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-xs font-medium text-foreground">{dayLabel(day.date, i)}</p>
            <Icon size={18} className="text-primary mx-auto my-1.5" />
            <p className="text-xs">
              <span className="font-semibold text-foreground">{day.tempMaxF}°</span>{" "}
              <span className="text-muted-foreground">{day.tempMinF}°</span>
            </p>
            {day.precipProbability !== null && day.precipProbability >= 30 && (
              <p className="text-[10px] text-blue-600 mt-0.5">{day.precipProbability}%</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
