import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { cancelMySubscriptions } from "@/lib/billing";

export default function CancelSubscription() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tier, setTier] = useState<string>("free");
  const [userType, setUserType] = useState<string>("homeowner");
  const [providerType, setProviderType] = useState<string>("pro");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, user_type, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return;
      setUserType(profile.user_type ?? "homeowner");
      // A provider/mechanic's real paid tier lives on their `providers` row,
      // not `profiles` — reading only profiles.subscription_tier here always
      // showed "Free" for a paying provider (it's never written for them),
      // permanently disabling the cancel button for anyone who actually
      // needed it.
      if (profile.user_type === "provider") {
        const { data: provider } = await supabase
          .from("providers")
          .select("subscription_tier, provider_type")
          .eq("user_id", user.id)
          .maybeSingle();
        setTier(provider?.subscription_tier ?? "free");
        setProviderType(provider?.provider_type ?? "pro");
      } else {
        setTier(profile.subscription_tier ?? "free");
      }
    })();
  }, [user, loading, navigate]);

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // A plan with a card on file is cancelled right here: renewal is turned
      // off in Stripe and access continues to the end of the paid period or
      // free trial. Plans without one fall through to the request below.
      const cancelled = await cancelMySubscriptions();
      if (cancelled.error) throw new Error(cancelled.error);
      if (cancelled.cancelled && cancelled.cancelled > 0) {
        if (reason.trim()) {
          await supabase.from("contact_messages").insert([{
            user_id: user.id,
            name: user.email?.split("@")[0] ?? "User",
            email: user.email ?? "",
            subject: `Subscription cancelled (${tier})`,
            body: `Cancelled in the app. Reason:
${reason}`,
            status: "new",
          }]);
        }
        const until = cancelled.endsAt ? new Date(cancelled.endsAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
        toast.success(until ? `Your subscription is cancelled. You keep access until ${until}.` : "Your subscription is cancelled.");
        setReason("");
        const doneDest = userType === "provider" ? (providerType === "mechanic" ? "/mechanic-dashboard" : "/pro-dashboard") : "/dashboard";
        setTimeout(() => navigate(doneDest), 1500);
        return;
      }
      const { error } = await supabase.from("contact_messages").insert([{
        user_id: user.id,
        name: user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        subject: `Subscription cancellation request (${tier})`,
        body: `User type: ${userType}\nCurrent tier: ${tier}\n\nReason:\n${reason || "(not provided)"}`,
        status: "new",
      }]);
      if (error) throw error;
      toast.success("Cancellation request received. Our team will reach out shortly.");
      setReason("");
      const dest = userType === "provider" ? (providerType === "mechanic" ? "/mechanic-dashboard" : "/pro-dashboard") : "/dashboard";
      setTimeout(() => navigate(dest), 1500);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar minimal />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Your current plan: <span className="font-semibold text-foreground">{tier}</span></p>
              <p>
                We're sorry to see you go. If you pay by card, this cancels your subscription right away and
                you keep access until the end of your current billing period or free trial. Anything else
                goes to our team, who will cancel it within 1–2 business days and confirm by email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Tell us why (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Feedback helps us improve..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => navigate(-1)}>Never mind</Button>
              <Button variant="destructive" disabled={submitting || tier === "free"} onClick={submit}>
                {submitting ? "Cancelling..." : tier === "free" ? "You're on Free plan" : "Cancel subscription"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
