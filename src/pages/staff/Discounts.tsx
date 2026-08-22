import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Plus, Trash2, FlaskConical, Copy, Car } from "lucide-react";
import { logActivity } from "./activityLog";

type DiscountType = "free" | "percent" | "fixed";
type GrantsTier = "" | "free" | "homeowner_pro" | "multi_pro";
type GrantsProviderTier = "" | "free" | "pro" | "elite";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  grants_tier: string | null;
  grants_provider_tier: string | null;
  grants_garage: boolean;
  is_testing_code: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

const tierLabels: Record<string, string> = { free: "Free", homeowner_pro: "Home Hero", multi_pro: "Home Super Hero" };
const providerTierLabels: Record<string, string> = { free: "Free", pro: "Pro", elite: "Elite" };

export default function StaffDiscounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("free");
  const [discountValue, setDiscountValue] = useState("");
  const [grantsTier, setGrantsTier] = useState<GrantsTier>("");
  const [grantsProviderTier, setGrantsProviderTier] = useState<GrantsProviderTier>("");
  const [grantsGarage, setGrantsGarage] = useState(false);
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("discount_codes" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading codes", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setRows((data || []) as DiscountCode[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setCode(""); setDescription(""); setDiscountType("free"); setDiscountValue("");
    setGrantsTier(""); setGrantsProviderTier(""); setGrantsGarage(false); setIsTestingCode(false); setMaxRedemptions(""); setExpiresAt("");
  };

  const fillTestingDefaults = () => {
    setCode(`TESTING${new Date().getFullYear()}`);
    setDescription("Free-access code for the homeowner testing program — grants full Home Super Hero access + My Garage, and skips payment.");
    setDiscountType("free");
    setDiscountValue("");
    setGrantsTier("multi_pro");
    setGrantsProviderTier("");
    setGrantsGarage(true);
    setIsTestingCode(true);
    setMaxRedemptions("");
    setExpiresAt(""); // blank = never expires, matching "works until testing is over, undefined amount of time"
  };

  const handleCreate = async () => {
    if (!user) return;
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast({ title: "Code required", description: "Give this code a name, e.g. TESTING2026.", variant: "destructive" });
      return;
    }
    if (discountType !== "free" && !discountValue.trim()) {
      toast({ title: "Discount value required", description: "Percent and fixed codes need an amount.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("discount_codes" as any) as any).insert({
      code: trimmedCode,
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: discountType === "free" ? null : Number(discountValue),
      grants_tier: grantsTier || null,
      grants_provider_tier: grantsProviderTier || null,
      grants_garage: grantsGarage,
      is_testing_code: isTestingCode,
      max_redemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't create code", description: error.message, variant: "destructive" });
      return;
    }
    await logActivity(user.id, "discount_code_created", "discount_code", trimmedCode, { discountType, grantsTier, grantsGarage, isTestingCode });
    toast({ title: "Discount code created", description: trimmedCode });
    resetForm();
    load();
  };

  const toggleActive = async (row: DiscountCode) => {
    const { error } = await (supabase.from("discount_codes" as any) as any).update({ active: !row.active }).eq("id", row.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
  };

  const remove = async (row: DiscountCode) => {
    if (!confirm(`Delete code "${row.code}"? Past redemptions stay on record, but the code stops working.`)) return;
    const { error } = await (supabase.from("discount_codes" as any) as any).delete().eq("id", row.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (user) await logActivity(user.id, "discount_code_deleted", "discount_code", row.code);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast({ title: "Code deleted" });
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast({ title: "Copied", description: c });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Discount Codes</h1>
        <p className="text-sm text-muted-foreground">
          Create codes homeowners can redeem before payment. "Free" codes skip payment entirely and can grant a tier —
          that's what the testing program uses. Percent/fixed codes are recorded for reporting; real billing isn't wired up yet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="w-5 h-5 text-primary" /> New code
          </CardTitle>
          <CardDescription className="flex items-center justify-between gap-3 flex-wrap">
            <span>Set the amount, what it grants, and how long it lasts.</span>
            <Button variant="outline" size="sm" onClick={fillTestingDefaults} className="gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" /> Fill testing-code defaults
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Code</Label>
              <Input placeholder="e.g. TESTING2026" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 text-sm font-mono uppercase" />
            </div>
            <div>
              <Label className="text-xs">Description (internal)</Label>
              <Input placeholder="What is this code for?" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 text-sm" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Discount type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free — skips payment entirely</SelectItem>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="fixed">Fixed amount off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {discountType === "percent" ? "Percent off (0-100)" : discountType === "fixed" ? "Amount off ($)" : "Amount"}
              </Label>
              <Input
                type="number" min={0} step={discountType === "percent" ? 1 : 0.01}
                placeholder={discountType === "free" ? "N/A" : "0"}
                value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                disabled={discountType === "free"}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Grants tier (homeowner)</Label>
              <Select value={grantsTier || "none"} onValueChange={(v) => setGrantsTier(v === "none" ? "" : (v as GrantsTier))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tier change</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="homeowner_pro">Home Hero</SelectItem>
                  <SelectItem value="multi_pro">Home Super Hero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Grants tier (provider)</Label>
              <Select value={grantsProviderTier || "none"} onValueChange={(v) => setGrantsProviderTier(v === "none" ? "" : (v as GrantsProviderTier))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tier change</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Max redemptions (blank = unlimited)</Label>
              <Input type="number" min={1} placeholder="Unlimited" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Expires (blank = never)</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1 text-sm" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
              <div>
                <p className="text-sm font-medium">Testing-program code</p>
                <p className="text-[11px] text-muted-foreground">Shows the welcome/disclaimer popup + testing badge</p>
              </div>
              <Switch checked={isTestingCode} onCheckedChange={setIsTestingCode} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
              <div>
                <p className="text-sm font-medium">Grants My Garage</p>
                <p className="text-[11px] text-muted-foreground">Unlocks vehicle tracking too, not just the home tier</p>
              </div>
              <Switch checked={grantsGarage} onCheckedChange={setGrantsGarage} />
            </div>
          </div>

          <Button onClick={handleCreate} disabled={saving} className="gap-1.5">
            <Plus className="w-4 h-4" /> {saving ? "Creating..." : "Create code"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing codes ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No discount codes yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-3 py-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-sm">{row.code}</span>
                      <button onClick={() => copyCode(row.code)} title="Copy" className="text-muted-foreground hover:text-foreground">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {row.is_testing_code && <Badge variant="secondary" className="text-[10px] gap-1"><FlaskConical className="w-3 h-3" /> Testing</Badge>}
                    </div>
                    {row.description && <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {row.discount_type === "free" ? "Free" : row.discount_type === "percent" ? `${row.discount_value}% off` : `$${row.discount_value} off`}
                  </Badge>
                  {row.grants_tier && <Badge variant="outline" className="text-xs">→ {tierLabels[row.grants_tier] ?? row.grants_tier}</Badge>}
                  {row.grants_provider_tier && <Badge variant="outline" className="text-xs">Pro → {providerTierLabels[row.grants_provider_tier] ?? row.grants_provider_tier}</Badge>}
                  {row.grants_garage && <Badge variant="outline" className="text-xs gap-1"><Car className="w-3 h-3" /> Garage</Badge>}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.redemption_count}{row.max_redemptions ? ` / ${row.max_redemptions}` : ""} used
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.expires_at ? `Expires ${new Date(row.expires_at).toLocaleDateString()}` : "Never expires"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Switch checked={row.active} onCheckedChange={() => toggleActive(row)} />
                    <span className="text-xs text-muted-foreground w-12">{row.active ? "Active" : "Off"}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove(row)} title="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
