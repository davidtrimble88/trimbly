import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { startGarageCheckout, startHomeownerCheckout, startProviderSubscriptionCheckout } from "@/lib/billing";
import { describePendingPlan, isGateExempt, type PendingPlan } from "@/lib/betaEnd";

// The free beta is over. Anyone still holding a paid plan they got for free
// has to either start the 14-day trial (card up front, first charge after the
// trial) or move to Free before they can use the app. Which plans count is
// decided in the database (beta_end_status), so staff, comped accounts,
// gifts and real subscribers never see this.
//
// If that function isn't there yet (older database) or the call fails, nobody
// is blocked.
const POLL_MS = 3000;
const POLL_FOR_MS = 45_000;

export function BetaEndedGate() {
  const { user, loading, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [pending, setPending] = useState<PendingPlan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmFree, setConfirmFree] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirmingCard, setConfirmingCard] = useState(false);
  const pollStopsAt = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) { setPending([]); return; }
    const { data, error } = await supabase.rpc("beta_end_status" as never);
    setPending(error ? [] : ((data as { pending?: PendingPlan[] } | null)?.pending) ?? []);
    setChecked(true);
  }, [user]);

  // Re-check on sign-in and on every navigation, so finishing a step clears the gate.
  useEffect(() => {
    if (loading) return;
    refresh();
  }, [loading, user?.id, location.pathname, refresh]);

  // Coming back from Stripe: the webhook that records the card can land a few
  // seconds after the redirect, so keep checking for a short while.
  useEffect(() => {
    if (new URLSearchParams(location.search).get("subscription") === "success") {
      pollStopsAt.current = Date.now() + POLL_FOR_MS;
      setConfirmingCard(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!confirmingCard || !checked) return;
    // Cleared, or we've waited long enough and the plain gate takes over.
    if (pending.length === 0 || Date.now() > pollStopsAt.current) {
      setConfirmingCard(false);
      return;
    }
    const id = setTimeout(refresh, POLL_MS);
    return () => clearTimeout(id);
  }, [confirmingCard, checked, pending, refresh]);

  if (loading || !user || pending.length === 0 || isGateExempt(location.pathname)) return null;

  const startTrial = async (plan: PendingPlan) => {
    setBusy(plan.scope);
    const result =
      plan.scope === "homeowner"
        ? await startHomeownerCheckout(plan.tier === "multi_pro" ? "multi_pro" : "homeowner_pro")
        : plan.scope === "provider"
          ? await startProviderSubscriptionCheckout("pro")
          : await startGarageCheckout(plan.interval === "yearly" ? "yearly" : "monthly");
    if (result.error || !result.url) {
      toast({ title: "Couldn't start checkout", description: result.error || "Please try again.", variant: "destructive" });
      setBusy(null);
      return;
    }
    window.location.href = result.url;
  };

  const switchToFree = async (plan: PendingPlan) => {
    setBusy(plan.scope);
    const { data, error } = await supabase.rpc("end_beta_switch_to_free" as never, { p_scope: plan.scope } as never);
    setBusy(null);
    if (error || !(data as { success?: boolean } | null)?.success) {
      toast({
        title: "Couldn't switch your plan",
        description: (data as { error?: string } | null)?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    setConfirmFree(null);
    await refreshProfile();
    await refresh();
    toast({ title: "You're on the Free plan", description: "You can upgrade any time from your dashboard." });
  };

  return (
    <Dialog open>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Our free beta has ended</DialogTitle>
          <DialogDescription className="text-base">
            Thanks for being one of our first users. To keep your paid {pending.length > 1 ? "plans" : "plan"}, start a free
            14-day trial: add a card now and nothing is charged until the trial ends. Cancel any time before then and you pay
            nothing. Or switch to Free and keep going.
          </DialogDescription>
        </DialogHeader>

        {confirmingCard && (
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-4 text-sm text-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirming your card. This takes a few seconds.
          </div>
        )}

        <div className="space-y-3">
          {pending.map((plan) => {
            const view = describePendingPlan(plan);
            const isBusy = busy === plan.scope;
            return (
              <div key={plan.scope} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold text-foreground">{view.name}</p>
                  <p className="text-sm text-muted-foreground">{view.priceLabel} after the trial</p>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" disabled={busy !== null} onClick={() => startTrial(plan)}>
                    {isBusy && confirmFree !== plan.scope ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Start 14-day free trial
                  </Button>
                  {confirmFree === plan.scope ? (
                    <Button variant="destructive" className="flex-1" disabled={busy !== null} onClick={() => switchToFree(plan)}>
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Yes, switch to Free
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => setConfirmFree(plan.scope)}>
                      Switch to Free
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          You'll be taken to Stripe's secure page to add your card. Questions? Write{" "}
          <a className="underline" href="mailto:office@trimblyhome.com">office@trimblyhome.com</a>.{" "}
          <button type="button" className="underline" onClick={() => signOut()}>Sign out</button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
