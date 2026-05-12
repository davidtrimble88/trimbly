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

export default function CancelSubscription() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tier, setTier] = useState<string>("free");
  const [userType, setUserType] = useState<string>("homeowner");
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
      if (profile) {
        setTier(profile.subscription_tier ?? "free");
        setUserType(profile.user_type ?? "homeowner");
      }
    })();
  }, [user, loading, navigate]);

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
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
      setTimeout(() => navigate(userType === "provider" ? "/pro-dashboard" : "/dashboard"), 1500);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
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
                We're sorry to see you go. Submit this request and our team will cancel your
                subscription within 1–2 business days and confirm by email. You'll keep access
                until the end of your current billing period.
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
                {submitting ? "Submitting..." : tier === "free" ? "You're on Free plan" : "Request cancellation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
