import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CloudSun, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Alert = { id: string; home_id: string; alert_type: string; message: string; valid_date: string };

const ICON_TONE: Record<string, string> = {
  freeze: "border-blue-500/40 bg-blue-500/10 text-blue-700",
  heavy_rain: "border-blue-500/40 bg-blue-500/10 text-blue-700",
  high_wind: "border-orange-500/40 bg-orange-500/10 text-orange-700",
  extreme_heat: "border-red-500/40 bg-red-500/10 text-red-700",
};

export default function WeatherAlertsBanner({ homeIds }: { homeIds: string[] }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const load = async () => {
    if (homeIds.length === 0) { setLoading(false); return; }
    const { data } = await supabase
      .from("home_weather_alerts")
      .select("id, home_id, alert_type, message, valid_date")
      .in("home_id", homeIds)
      .eq("dismissed", false)
      .gte("valid_date", new Date().toISOString().slice(0, 10))
      .order("valid_date");
    setAlerts((data as Alert[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [homeIds.join(",")]);

  const dismiss = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("home_weather_alerts").update({ dismissed: true }).eq("id", id);
  };

  const checkNow = async () => {
    setChecking(true);
    for (const homeId of homeIds) {
      await supabase.functions.invoke("weather-maintenance-check", { body: { home_id: homeId } });
    }
    await load();
    setChecking(false);
    toast.success("Weather checked");
  };

  if (loading || homeIds.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className={`rounded-lg border p-3 flex items-start gap-3 ${ICON_TONE[a.alert_type] || "border-border bg-muted/40"}`}>
          <CloudSun size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm flex-1">{a.message}</p>
          <button onClick={() => dismiss(a.id)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={checkNow} disabled={checking} className="text-xs text-muted-foreground">
        {checking ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <RefreshCw size={12} className="mr-1.5" />}
        Check weather now
      </Button>
    </div>
  );
}
