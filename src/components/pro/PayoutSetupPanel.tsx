import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PayoutSetupPanel({ providerId }: { providerId: string }) {
  const [status, setStatus] = useState<{ chargesEnabled: boolean; payoutsEnabled: boolean; hasAccount: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("providers")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled")
      .eq("id", providerId)
      .maybeSingle();
    setStatus({
      hasAccount: !!data?.stripe_connect_account_id,
      chargesEnabled: !!data?.stripe_connect_charges_enabled,
      payoutsEnabled: !!data?.stripe_connect_payouts_enabled,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [providerId]);

  const startOnboarding = async () => {
    setStarting(true);
    const { data, error } = await supabase.functions.invoke("create-connect-account", { body: {} });
    setStarting(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Couldn't start payout setup"); return; }
    if (data?.url) window.location.href = data.url;
  };

  if (loading || !status) {
    return <Card><CardContent className="py-6 flex items-center justify-center"><Loader2 className="animate-spin" size={18} /></CardContent></Card>;
  }

  const ready = status.chargesEnabled && status.payoutsEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-1.5"><Wallet size={16} className="text-primary" /> Milestone payouts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Set this up once to receive milestone payments directly to your bank account, held securely until the homeowner approves each stage.
          </p>
          <Badge variant="outline" className={ready ? "bg-green-500/15 text-green-700 border-green-500/40 shrink-0" : "bg-muted text-muted-foreground shrink-0"}>
            {ready ? "Ready" : status.hasAccount ? "Incomplete" : "Not set up"}
          </Badge>
        </div>
        <Button size="sm" onClick={startOnboarding} disabled={starting} variant={ready ? "outline" : "default"}>
          {starting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <ExternalLink size={14} className="mr-1.5" />}
          {ready ? "Manage payout account" : status.hasAccount ? "Finish setup" : "Set up payouts"}
        </Button>
      </CardContent>
    </Card>
  );
}
