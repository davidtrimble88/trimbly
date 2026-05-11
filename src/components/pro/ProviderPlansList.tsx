import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Check } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  price: number;
};

const FREQ_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Every 6 mo",
  annual: "Annual",
};

export default function ProviderPlansList({ providerId }: { providerId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("service_plans")
        .select("*")
        .eq("provider_id", providerId)
        .eq("active", true)
        .order("price", { ascending: true });
      setPlans((data as Plan[]) || []);

      if (user) {
        const { data: subs } = await supabase
          .from("plan_subscriptions")
          .select("plan_id")
          .eq("homeowner_id", user.id)
          .eq("provider_id", providerId)
          .eq("status", "active");
        const map: Record<string, boolean> = {};
        (subs || []).forEach((s: any) => { map[s.plan_id] = true; });
        setSubscribed(map);
      }
    })();
  }, [providerId, user]);

  const subscribe = async (plan: Plan) => {
    if (!user) {
      toast({ title: "Please sign in to subscribe", variant: "destructive" });
      return;
    }
    setBusy(plan.id);
    const { error } = await supabase.from("plan_subscriptions").insert({
      plan_id: plan.id,
      provider_id: providerId,
      homeowner_id: user.id,
      status: "active",
    });
    setBusy(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSubscribed({ ...subscribed, [plan.id]: true });
    toast({ title: "Subscribed!", description: "The pro will reach out to schedule your first service." });
  };

  if (plans.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
          <Repeat size={18} className="text-primary" /> Recurring Service Plans
        </h2>
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge variant="secondary">{FREQ_LABEL[p.frequency] || p.frequency}</Badge>
                </div>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                <div className="text-sm font-medium mt-2">${Number(p.price).toFixed(2)} per service</div>
              </div>
              {subscribed[p.id] ? (
                <Button size="sm" variant="outline" disabled>
                  <Check size={14} className="mr-1" /> Subscribed
                </Button>
              ) : (
                <Button size="sm" onClick={() => subscribe(p)} disabled={busy === p.id}>
                  {busy === p.id ? "..." : "Subscribe"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
