import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Zap, Shield, AlertTriangle, Eye, TrendingUp, MessageSquare,
  CheckCircle, Send, Calendar, Pencil,
} from "lucide-react";

interface ProviderRow {
  id: string;
  user_id: string;
  business_name: string;
  emergency_available: boolean;
  emergency_rate_multiplier: number;
  license_expiry: string | null;
  insurance_expiry: string | null;
  licensed: boolean;
  insured: boolean;
}

interface Props {
  provider: ProviderRow;
  userId: string;
  onUpdated: (patch: Partial<ProviderRow>) => void;
}

const daysUntil = (date: string | null): number | null => {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ProFeaturesPanel = ({ provider, userId, onUpdated }: Props) => {
  const { toast } = useToast();

  // Lead analytics
  const [views7d, setViews7d] = useState(0);
  const [views30d, setViews30d] = useState(0);
  const [msgs30d, setMsgs30d] = useState(0);
  const [winRate, setWinRate] = useState<number | null>(null);

  // Review request
  const [completedJobs, setCompletedJobs] = useState<
    Array<{ id: string; title: string; homeowner_id: string; requested: boolean }>
  >([]);
  const [sendingFor, setSendingFor] = useState<string | null>(null);

  // Credentials dialog
  const [credOpen, setCredOpen] = useState(false);
  const [licenseExpiry, setLicenseExpiry] = useState(provider.license_expiry || "");
  const [insuranceExpiry, setInsuranceExpiry] = useState(provider.insurance_expiry || "");
  const [savingCreds, setSavingCreds] = useState(false);

  // Emergency dialog
  const [emerOpen, setEmerOpen] = useState(false);
  const [emerMult, setEmerMult] = useState(String(provider.emergency_rate_multiplier ?? 1.5));
  const [savingEmer, setSavingEmer] = useState(false);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [v7, v30, m30, bidsAll, jobsCompleted, reqs] = await Promise.all([
        supabase.from("profile_views").select("id", { count: "exact", head: true })
          .eq("provider_id", provider.id).gte("viewed_at", d7),
        supabase.from("profile_views").select("id", { count: "exact", head: true })
          .eq("provider_id", provider.id).gte("viewed_at", d30),
        supabase.from("messages").select("id", { count: "exact", head: true })
          .eq("recipient_id", userId).gte("created_at", d30),
        supabase.from("job_bids").select("status").eq("provider_id", provider.id),
        supabase.from("jobs").select("id, title, homeowner_id")
          .eq("provider_id", provider.id).eq("status", "completed").limit(20),
        supabase.from("review_requests").select("job_id").eq("provider_id", provider.id),
      ]);

      setViews7d(v7.count ?? 0);
      setViews30d(v30.count ?? 0);
      setMsgs30d(m30.count ?? 0);

      const bids = bidsAll.data || [];
      const decided = bids.filter((b: any) => b.status === "accepted" || b.status === "rejected").length;
      const accepted = bids.filter((b: any) => b.status === "accepted").length;
      setWinRate(decided > 0 ? Math.round((accepted / decided) * 100) : null);

      const reqSet = new Set((reqs.data || []).map((r: any) => r.job_id));
      setCompletedJobs(
        (jobsCompleted.data || []).map((j: any) => ({
          id: j.id,
          title: j.title,
          homeowner_id: j.homeowner_id,
          requested: reqSet.has(j.id),
        }))
      );
    })();
  }, [provider.id, userId]);

  const toggleEmergency = async () => {
    const newVal = !provider.emergency_available;
    const { error } = await supabase
      .from("providers")
      .update({ emergency_available: newVal })
      .eq("id", provider.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    onUpdated({ emergency_available: newVal });
    toast({ title: newVal ? "Emergency mode on" : "Emergency mode off" });
  };

  const saveEmergencyRate = async () => {
    setSavingEmer(true);
    const mult = parseFloat(emerMult);
    if (isNaN(mult) || mult < 1 || mult > 5) {
      setSavingEmer(false);
      return toast({ title: "Enter a multiplier between 1.0 and 5.0", variant: "destructive" });
    }
    const { error } = await supabase
      .from("providers")
      .update({ emergency_rate_multiplier: mult })
      .eq("id", provider.id);
    setSavingEmer(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    onUpdated({ emergency_rate_multiplier: mult });
    setEmerOpen(false);
    toast({ title: "Emergency rate saved" });
  };

  const saveCreds = async () => {
    setSavingCreds(true);
    const { error } = await supabase
      .from("providers")
      .update({
        license_expiry: licenseExpiry || null,
        insurance_expiry: insuranceExpiry || null,
      })
      .eq("id", provider.id);
    setSavingCreds(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    onUpdated({
      license_expiry: licenseExpiry || null,
      insurance_expiry: insuranceExpiry || null,
    });
    setCredOpen(false);
    toast({ title: "Credentials updated" });
  };

  const sendReviewRequest = async (jobId: string, homeownerId: string, jobTitle: string) => {
    setSendingFor(jobId);
    const body =
      `Thanks for hiring ${provider.business_name}! I'd really appreciate it if you'd take a moment ` +
      `to leave a review about your experience on "${jobTitle}". Reviews help me grow my business and ` +
      `help other homeowners find trusted help. Thank you!`;

    const { error: msgErr } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: homeownerId,
      subject: "Quick favor — would you leave a review?",
      body,
    });
    if (msgErr) {
      setSendingFor(null);
      return toast({ title: "Error", description: msgErr.message, variant: "destructive" });
    }
    const { error: reqErr } = await supabase.from("review_requests").insert({
      provider_id: provider.id,
      homeowner_id: homeownerId,
      job_id: jobId,
    });
    setSendingFor(null);
    if (reqErr) {
      return toast({ title: "Error", description: reqErr.message, variant: "destructive" });
    }
    setCompletedJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, requested: true } : j)));
    toast({ title: "Review request sent" });
  };

  const licenseDays = daysUntil(provider.license_expiry);
  const insuranceDays = daysUntil(provider.insurance_expiry);
  const expiringSoon =
    (provider.licensed && licenseDays !== null && licenseDays <= 90) ||
    (provider.insured && insuranceDays !== null && insuranceDays <= 90);

  return (
    <div className="space-y-6">
      {/* Expiry alerts */}
      {expiringSoon && (
        <Card className="border-orange-300 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Credentials expiring soon</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {provider.licensed && licenseDays !== null && licenseDays <= 90 && (
                  <li>
                    License expires in <strong>{licenseDays} day{licenseDays === 1 ? "" : "s"}</strong>
                    {licenseDays < 0 && " (expired)"}
                  </li>
                )}
                {provider.insured && insuranceDays !== null && insuranceDays <= 90 && (
                  <li>
                    Insurance expires in <strong>{insuranceDays} day{insuranceDays === 1 ? "" : "s"}</strong>
                    {insuranceDays < 0 && " (expired)"}
                  </li>
                )}
              </ul>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCredOpen(true)}>Update</Button>
          </CardContent>
        </Card>
      )}

      {/* Lead analytics */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Lead Analytics
            </h3>
            <Badge variant="outline" className="text-xs">Last 30 days</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <Eye className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{views7d}</p>
              <p className="text-xs text-muted-foreground">Views (7d)</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <Eye className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{views30d}</p>
              <p className="text-xs text-muted-foreground">Views (30d)</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <MessageSquare className="mx-auto h-5 w-5 text-blue-500 mb-1" />
              <p className="text-2xl font-bold text-foreground">{msgs30d}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <CheckCircle className="mx-auto h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {winRate === null ? "—" : `${winRate}%`}
              </p>
              <p className="text-xs text-muted-foreground">Bid win rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency availability */}
      <Card className={provider.emergency_available ? "border-red-300 dark:border-red-900/50" : ""}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Zap size={18} className={provider.emergency_available ? "text-red-500" : "text-muted-foreground"} />
                Emergency / After-Hours
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Show a red "Available for urgent jobs" badge on your profile and rank higher in urgent searches.
                Charge <strong>{provider.emergency_rate_multiplier}x</strong> your normal rate.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Switch checked={provider.emergency_available} onCheckedChange={toggleEmergency} />
              <Button size="sm" variant="ghost" onClick={() => setEmerOpen(true)} className="gap-1">
                <Pencil size={12} /> Rate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials tracker */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Shield size={18} className="text-primary" /> Credentials Tracker
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Keep your license and insurance expiry dates current to stay verified.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCredOpen(true)} className="gap-1">
              <Calendar size={12} /> Set dates
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">License expires</p>
              <p className="font-medium text-foreground">
                {provider.license_expiry
                  ? new Date(provider.license_expiry).toLocaleDateString()
                  : provider.licensed ? "Not set" : "—"}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Insurance expires</p>
              <p className="font-medium text-foreground">
                {provider.insurance_expiry
                  ? new Date(provider.insurance_expiry).toLocaleDateString()
                  : provider.insured ? "Not set" : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review requests */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
            <Send size={18} className="text-primary" /> Request Reviews
          </h3>
          {completedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed jobs yet. Once you finish a job, you can ask the homeowner for a review.
            </p>
          ) : (
            <div className="space-y-2">
              {completedJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between bg-muted/40 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{j.title}</p>
                  </div>
                  {j.requested ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle size={12} className="text-green-600" /> Requested
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendReviewRequest(j.id, j.homeowner_id, j.title)}
                      disabled={sendingFor === j.id}
                      className="gap-1"
                    >
                      <Send size={12} /> {sendingFor === j.id ? "Sending…" : "Ask"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Credential Expiry Dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>License expires on</Label>
              <Input
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="mt-1"
                disabled={!provider.licensed}
              />
              {!provider.licensed && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enable "Licensed" in your profile to set this.
                </p>
              )}
            </div>
            <div>
              <Label>Insurance expires on</Label>
              <Input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="mt-1"
                disabled={!provider.insured}
              />
              {!provider.insured && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enable "Insured" in your profile to set this.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredOpen(false)}>Cancel</Button>
            <Button onClick={saveCreds} disabled={savingCreds}>
              {savingCreds ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency rate Dialog */}
      <Dialog open={emerOpen} onOpenChange={setEmerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Emergency Rate Multiplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Multiplier (1.0 – 5.0)</Label>
            <Input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={emerMult}
              onChange={(e) => setEmerMult(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              For example, 1.5 means you charge 1.5x your normal hourly rate for emergency/after-hours work.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmerOpen(false)}>Cancel</Button>
            <Button onClick={saveEmergencyRate} disabled={savingEmer}>
              {savingEmer ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProFeaturesPanel;
