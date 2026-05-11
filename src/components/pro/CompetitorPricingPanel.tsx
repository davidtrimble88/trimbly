import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2 } from "lucide-react";

interface Props {
  category: string;
  city: string;
  state: string;
  hourlyMin: number;
  hourlyMax: number;
}

type Intel = {
  marketLow: number;
  marketHigh: number;
  marketMedian: number;
  sampleSize: number;
  yourPosition: "below" | "average" | "above";
  insight: string;
  competitors: { name: string; range: string; note: string }[];
};

const CompetitorPricingPanel = ({ category, city, state, hourlyMin, hourlyMax }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [intel, setIntel] = useState<Intel | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("competitor-pricing-intel", {
        body: { category, city, state, hourlyMin, hourlyMax },
      });
      if (error) throw error;
      setIntel(data);
    } catch (e: any) {
      toast({ title: "Couldn't fetch pricing", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const positionColor = intel?.yourPosition === "below"
    ? "text-orange-600 dark:text-orange-400"
    : intel?.yourPosition === "above"
      ? "text-blue-600 dark:text-blue-400"
      : "text-green-600 dark:text-green-400";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="text-primary" size={20} />
          <h2 className="font-bold text-lg text-foreground">AI Competitor Pricing Intel</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          See what other {category.toLowerCase()} pros in {city}, {state} are charging — and whether you're priced to win.
        </p>

        {!intel && (
          <Button onClick={analyze} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {loading ? "Analyzing market..." : "Run pricing analysis"}
          </Button>
        )}

        {intel && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-xs text-muted-foreground">Market low</div>
                <div className="text-xl font-bold text-foreground">${intel.marketLow}/hr</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <div className="text-xs text-muted-foreground">Median</div>
                <div className="text-xl font-bold text-primary">${intel.marketMedian}/hr</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-xs text-muted-foreground">Market high</div>
                <div className="text-xl font-bold text-foreground">${intel.marketHigh}/hr</div>
              </div>
            </div>

            <div className="rounded-lg bg-card border border-border p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your range</div>
              <div className="text-2xl font-bold text-foreground">${hourlyMin}–${hourlyMax}/hr</div>
              <div className={`text-sm font-medium mt-1 ${positionColor}`}>
                You're priced {intel.yourPosition} the local market
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm text-foreground">{intel.insight}</p>
            </div>

            {intel.competitors?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sample competitors</div>
                <div className="space-y-1.5">
                  {intel.competitors.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 px-3 rounded bg-muted/30">
                      <span className="text-foreground truncate">{c.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-3">{c.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={analyze} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh analysis"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompetitorPricingPanel;
