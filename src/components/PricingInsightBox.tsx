import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Loader2 } from "lucide-react";

type Insights = {
  available: boolean;
  sampleSize: number;
  typicalLow?: number;
  typicalHigh?: number;
  average?: number;
};

export default function PricingInsightBox({ category, state }: { category: string; state: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category || !state) { setInsights(null); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase.functions.invoke("pricing-insights", { body: { category, state } });
      if (!cancelled) {
        setInsights(data || null);
        setLoading(false);
      }
    }, 400); // debounce so we don't fire on every keystroke
    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, state]);

  if (!category || !state) return null;
  if (loading) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs flex items-center gap-2 text-muted-foreground">
        <Loader2 size={12} className="animate-spin" /> Checking typical pricing for {category} in {state}...
      </div>
    );
  }
  if (!insights?.available) return null;

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs flex items-start gap-2">
      <TrendingUp size={14} className="text-primary shrink-0 mt-0.5" />
      <p className="text-foreground">
        Typical range for <span className="font-medium">{category}</span> in {state}: <span className="font-semibold">${insights.typicalLow}–${insights.typicalHigh}</span>
        <span className="text-muted-foreground"> (based on {insights.sampleSize} recent local bids)</span>
      </p>
    </div>
  );
}
