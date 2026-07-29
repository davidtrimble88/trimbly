import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Crown, Home as HomeIcon, Droplet, Flame, Zap, Phone, Printer, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type EmergencyHome = {
  id: string;
  name: string;
  water_shutoff_location: string | null;
  gas_shutoff_location: string | null;
  electrical_panel_location: string | null;
  emergency_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

const emptyForm = {
  water_shutoff_location: "", gas_shutoff_location: "", electrical_panel_location: "",
  emergency_notes: "", emergency_contact_name: "", emergency_contact_phone: "",
};

const EmergencyInfoCard = () => {
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const { isPro, subscriptionTier, loading: limitLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();

  const [homes, setHomes] = useState<EmergencyHome[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from("homes") as any)
        .select("id, name, water_shutoff_location, gas_shutoff_location, electrical_panel_location, emergency_notes, emergency_contact_name, emergency_contact_phone")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      const list = (data as EmergencyHome[]) || [];
      setHomes(list);
      if (list.length > 0) {
        setSelectedHomeId(list[0].id);
        setForm({
          water_shutoff_location: list[0].water_shutoff_location || "",
          gas_shutoff_location: list[0].gas_shutoff_location || "",
          electrical_panel_location: list[0].electrical_panel_location || "",
          emergency_notes: list[0].emergency_notes || "",
          emergency_contact_name: list[0].emergency_contact_name || "",
          emergency_contact_phone: list[0].emergency_contact_phone || "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const selectHome = (id: string) => {
    setSelectedHomeId(id);
    const h = homes.find((x) => x.id === id);
    if (h) {
      setForm({
        water_shutoff_location: h.water_shutoff_location || "",
        gas_shutoff_location: h.gas_shutoff_location || "",
        electrical_panel_location: h.electrical_panel_location || "",
        emergency_notes: h.emergency_notes || "",
        emergency_contact_name: h.emergency_contact_name || "",
        emergency_contact_phone: h.emergency_contact_phone || "",
      });
    }
  };

  const save = async () => {
    if (!selectedHomeId) return;
    setSaving(true);
    const { error } = await (supabase.from("homes") as any).update(form).eq("id", selectedHomeId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setHomes((prev) => prev.map((h) => (h.id === selectedHomeId ? { ...h, ...form } : h)));
    toast({ title: "Saved", description: "Your emergency info card is up to date." });
  };

  if (!user) return null;

  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);
  const selectedHome = homes.find((h) => h.id === selectedHomeId);

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="emergency-info"
      onNavigate={() => {}}
      header={{
        avatarIcon: HomeIcon,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
      <div className="max-w-3xl print:max-w-full">
        <div className="mb-8 print:hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={22} className="text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Emergency Home Info Card</h1>
          </div>
          <p className="text-muted-foreground">
            Shutoff locations and emergency contacts, one place — so you're not searching for the water main during a leak.
          </p>
        </div>

        {limitLoading || loading ? (
          <Skeleton className="h-64 w-full" />
        ) : homes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card text-center py-12">
            <HomeIcon size={36} className="mx-auto text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">Add a home first</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Once you add a home, you can fill out its emergency info card here.
            </p>
            <Button onClick={() => navigate("/dashboard?tab=homes")}>Go to My Homes</Button>
          </div>
        ) : (
          <UpgradeGate
            hasAccess={isPro}
            featureName="Emergency Home Info Card"
            description="Keep shutoff locations and emergency contacts on hand for every home, printable in a pinch."
            benefits={["Water, gas, and electrical shutoff locations", "Emergency contact on file", "One-click print for the fridge or a binder"]}
            pricingRoute="/#pricing"
            icon={Crown}
          >
            <div className="print:hidden">
              {homes.length > 1 && (
                <div className="mb-6 max-w-xs">
                  <Label className="text-sm mb-1.5 block">Which home?</Label>
                  <Select value={selectedHomeId} onValueChange={selectHome}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {homes.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5 text-sm mb-1.5"><Droplet size={14} className="text-primary" /> Water Shutoff Location</Label>
                    <Input
                      value={form.water_shutoff_location}
                      onChange={(e) => setForm((f) => ({ ...f, water_shutoff_location: e.target.value }))}
                      placeholder="e.g. Basement, left of the water heater"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-sm mb-1.5"><Flame size={14} className="text-accent" /> Gas Shutoff Location</Label>
                    <Input
                      value={form.gas_shutoff_location}
                      onChange={(e) => setForm((f) => ({ ...f, gas_shutoff_location: e.target.value }))}
                      placeholder="e.g. Outside, right side of the house near the meter"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-sm mb-1.5"><Zap size={14} className="text-primary" /> Electrical Panel Location</Label>
                    <Input
                      value={form.electrical_panel_location}
                      onChange={(e) => setForm((f) => ({ ...f, electrical_panel_location: e.target.value }))}
                      placeholder="e.g. Garage, back wall"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-sm mb-1.5"><Phone size={14} className="text-primary" /> Emergency Contact</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.emergency_contact_name}
                        onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                        placeholder="Name"
                      />
                      <Input
                        value={form.emergency_contact_phone}
                        onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Other Notes</Label>
                  <Textarea
                    value={form.emergency_notes}
                    onChange={(e) => setForm((f) => ({ ...f, emergency_notes: e.target.value }))}
                    placeholder="e.g. Sump pump backup battery in utility closet; septic tank access panel in backyard, 10ft from the fence..."
                    className="resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                    <Printer size={14} /> Print
                  </Button>
                  <Button onClick={save} disabled={saving} className="gap-1.5">
                    {saving && <Loader2 size={14} className="animate-spin" />} Save
                  </Button>
                </div>
              </div>
            </div>

            {/* Print-only clean layout */}
            <div className="hidden print:block">
              <h1 className="text-2xl font-bold mb-1">{selectedHome?.name} — Emergency Info</h1>
              <p className="text-sm text-muted-foreground mb-4">Generated by Trimbly</p>
              <div className="space-y-3 text-sm">
                <p><strong>Water Shutoff:</strong> {form.water_shutoff_location || "—"}</p>
                <p><strong>Gas Shutoff:</strong> {form.gas_shutoff_location || "—"}</p>
                <p><strong>Electrical Panel:</strong> {form.electrical_panel_location || "—"}</p>
                <p><strong>Emergency Contact:</strong> {form.emergency_contact_name || "—"} {form.emergency_contact_phone ? `— ${form.emergency_contact_phone}` : ""}</p>
                <p><strong>Notes:</strong> {form.emergency_notes || "—"}</p>
              </div>
            </div>
          </UpgradeGate>
        )}
      </div>
    </DashboardShell>
  );
};

export default EmergencyInfoCard;
