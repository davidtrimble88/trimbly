import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, Axe, DollarSign } from "lucide-react";
import { homeownerTiers, providerTiers, mechanicTiers } from "@/lib/pricingTiers";

type Redemption = {
  code_id: string;
  code: string;
  partner_name: string | null;
  commission_percent: number | null;
  user_id: string;
  redeemed_at: string;
  full_name: string | null;
  user_type: string | null;
  homeowner_tier: string | null;
  provider_tier: string | null;
  provider_type: string | null;
};

const priceFor = (r: Redemption): number => {
  if (r.user_type === "provider" && r.provider_tier) {
    const list = r.provider_type === "mechanic" ? mechanicTiers : providerTiers;
    return list.find((t) => t.key === r.provider_tier)?.monthlyUsd ?? 0;
  }
  if (r.homeowner_tier) {
    return homeownerTiers.find((t) => t.key === r.homeowner_tier)?.monthlyUsd ?? 0;
  }
  return 0;
};

const isActivelyPaid = (r: Redemption) =>
  r.user_type === "provider" ? (r.provider_tier && r.provider_tier !== "free") : (r.homeowner_tier && r.homeowner_tier !== "free");

export default function StaffPartners() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.from("partner_redemptions" as any) as any)
        .select("*")
        .order("redeemed_at", { ascending: false });
      if (error) {
        toast({ title: "Error loading partner redemptions", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setRows((data || []) as Redemption[]);
      setLoading(false);
    })();
  }, []);

  const byCode = rows.reduce<Record<string, Redemption[]>>((acc, r) => {
    (acc[r.code_id] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Handshake className="w-4 h-4 text-primary" />
          </span>
          Partner Program
        </h1>
        <p className="text-sm text-muted-foreground">
          Everyone who redeemed a code with a commission attached, and what they'd owe this cycle based on their{" "}
          <strong>current</strong> tier. This is a live estimate, not a payment ledger — Trimbly has no automatic
          payout to partners yet, so use this to pay them manually. Set up a code's commission % and partner name
          on the <a href="/staff/discounts" className="text-primary hover:underline">Discount Codes</a> page.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : Object.keys(byCode).length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No partner codes have been redeemed yet.</CardContent></Card>
      ) : (
        Object.values(byCode).map((group) => {
          const { code, partner_name, commission_percent } = group[0];
          const paying = group.filter(isActivelyPaid);
          const owed = paying.reduce((sum, r) => sum + (priceFor(r) * (commission_percent || 0)) / 100, 0);
          return (
            <Card key={code}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2 text-lg">
                    <Handshake className="w-4.5 h-4.5 text-primary" />
                    {partner_name || "Unnamed partner"}
                    <span className="font-mono text-xs font-normal text-muted-foreground">{code}</span>
                  </span>
                  <Badge variant="outline" className="text-sm gap-1 border-primary/40 text-primary">
                    <DollarSign className="w-3.5 h-3.5" /> ~${owed.toFixed(2)}/mo owed
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {group.length} redemption{group.length === 1 ? "" : "s"} · {paying.length} currently on a paid tier · {commission_percent ?? 0}% commission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {group.map((r) => {
                    const price = priceFor(r);
                    const active = isActivelyPaid(r);
                    return (
                      <div key={r.user_id} className="flex items-center gap-3 py-2.5 flex-wrap text-sm">
                        <span className="flex-1 min-w-[140px] font-medium text-foreground">{r.full_name || "—"}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {r.user_type === "provider" ? (r.provider_type || "provider") : "homeowner"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {active ? `${r.homeowner_tier || r.provider_tier} · $${price}/mo` : "Free tier — no commission"}
                        </span>
                        {active && (
                          <span className="text-xs font-semibold text-primary ml-auto">
                            ${((price * (commission_percent || 0)) / 100).toFixed(2)}/mo
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground w-full sm:w-auto">
                          Redeemed {new Date(r.redeemed_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-2.5">
          <Axe className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Viking Mode unlocks are tracked on each account's profile, not here — they're permanent and don't affect
            commission. This page only concerns money owed to partners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
