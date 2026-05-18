import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Share2, Check } from "lucide-react";

interface Props {
  providerId: string;
  userId: string;
}

type Referral = {
  id: string;
  code: string;
  referee_email: string | null;
  status: string;
  credit_months: number;
  created_at: string;
};

const generateCode = (businessName: string) => {
  const base = businessName.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "PRO";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
};

const ReferralPanel = ({ providerId, userId }: Props) => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [myCode, setMyCode] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const link = myCode ? `${window.location.origin}/pro-register?ref=${myCode}` : "";

  useEffect(() => {
    (async () => {
      const [{ data: provRow }, { data: refs }] = await Promise.all([
        supabase.from("providers").select("business_name").eq("id", providerId).maybeSingle(),
        supabase.from("referrals" as any)
          .select("id, code, referee_email, status, credit_months, created_at")
          .eq("referrer_user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      setBusinessName(provRow?.business_name || "");
      const list = (refs as unknown as Referral[]) || [];
      setReferrals(list);
      // Use the most recent code as "my code", or create one
      if (list.length > 0) {
        setMyCode(list[0].code);
      }
      setLoading(false);
    })();
  }, [providerId, userId]);

  const ensureCode = async (): Promise<string> => {
    if (myCode) return myCode;
    const code = generateCode(businessName);
    const { error } = await supabase.from("referrals" as any).insert({
      referrer_provider_id: providerId,
      referrer_user_id: userId,
      code,
      status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return "";
    }
    setMyCode(code);
    return code;
  };

  const copyLink = async () => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${window.location.origin}/pro-register?ref=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: "Link copied", description: "Send it to any pro you know." });
  };

  const shareLink = async () => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${window.location.origin}/pro-register?ref=${code}`;
    const text = `Join me on Trimbly — homeowners are looking for ${businessName ? "pros like " + businessName : "local pros"} right now. Use my link and we both get a free month: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trimbly referral", text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Message copied", description: "Paste it into a text or email." });
    }
  };

  const credited = referrals.filter((r) => r.status === "credited").length;
  const signedUp = referrals.filter((r) => r.status === "signed_up" || r.status === "subscribed").length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="text-primary" size={20} />
          <h2 className="font-bold text-lg text-foreground">Refer a Pro, Earn a Month Free</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          For each pro who signs up with your link and subscribes, you both get <strong className="text-foreground">1 month free</strong>. No limit on how many you can stack.
        </p>

        {loading ? (
          <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Input readOnly value={link || "Click to generate your link"} className="font-mono text-xs" />
              <Button onClick={copyLink} variant="outline" className="gap-1.5 shrink-0">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={shareLink} className="gap-1.5 shrink-0">
                <Share2 size={14} /> Share
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-xl font-bold text-foreground">{referrals.length}</div>
                <div className="text-xs text-muted-foreground">Total invites</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-xl font-bold text-foreground">{signedUp}</div>
                <div className="text-xs text-muted-foreground">Signed up</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <div className="text-xl font-bold text-primary">{credited}</div>
                <div className="text-xs text-muted-foreground">Free months earned</div>
              </div>
            </div>

            {referrals.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {referrals.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{r.referee_email || "Pending signup"}</span>
                    <Badge variant={r.status === "credited" ? "default" : "secondary"} className="text-[10px]">
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralPanel;
