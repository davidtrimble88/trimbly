import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Home as HomeIcon, MapPin, Sparkles, CheckCircle2, Search, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  userId: string;
  onComplete: (homeId: string) => void;
  onSkip: () => void;
}

export function OnboardingWizard({ open, userId, onComplete, onSkip }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("My Home");
  const [homeType, setHomeType] = useState("single_family");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [yearBuilt, setYearBuilt] = useState<string>("");
  const [squareFeet, setSquareFeet] = useState<string>("");
  const [hvacType, setHvacType] = useState<string | null>(null);
  const [roofType, setRoofType] = useState<string | null>(null);
  const [hasPool, setHasPool] = useState<boolean | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookedUp, setLookedUp] = useState(false);
  const [homeId, setHomeId] = useState<string | null>(null);

  const lookupAddress = async () => {
    if (!address.trim()) {
      toast({ title: "Enter your address first", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("zillow-lookup", {
        body: { address: address.trim() },
      });
      if (error) throw error;
      const addrMatch = address.match(/,\s*([^,]+?),\s*([A-Za-z]{2})\s*\d{0,5}\s*$/);
      if (data?.success && data.data) {
        const z = data.data;
        setCity(z.city || addrMatch?.[1]?.trim() || city);
        setState((z.state || addrMatch?.[2] || state || "").toUpperCase());
        if (z.home_type) setHomeType(z.home_type);
        if (z.year_built) setYearBuilt(String(z.year_built));
        if (z.square_feet) setSquareFeet(String(z.square_feet));
        if (z.hvac_type) setHvacType(z.hvac_type);
        if (z.roof_type) setRoofType(z.roof_type);
        if (typeof z.has_pool === "boolean") setHasPool(z.has_pool);
        if (z.photo_url) setPhotoUrl(z.photo_url);
        setLookedUp(true);
        toast({ title: "Home details found!", description: "We pre-filled what we could — review below and adjust anything." });
      } else {
        if (addrMatch) {
          setCity(addrMatch[1].trim());
          setState(addrMatch[2].toUpperCase());
        }
        setLookedUp(true);
        toast({
          title: "Couldn't find that property",
          description: data?.error || "Fill in the details below manually and you're good to go.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      console.error("Address lookup error:", e);
      setLookedUp(true);
      toast({ title: "Lookup failed", description: "You can still enter the details manually.", variant: "destructive" });
    } finally {
      setLookingUp(false);
    }
  };

  const next = async () => {
    if (step === 1) {
      if (!name.trim()) return toast({ title: "Give your home a name", variant: "destructive" });
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!city.trim() || !state.trim()) return toast({ title: "Add your address (or city and state) so we can tailor maintenance", variant: "destructive" });
      setBusy(true);
      try {
        // Street address isn't its own field in this wizard's UI — reuse the
        // free-text lookup input, taking everything before the first comma
        // as the street line, same pattern as MaintenancePage.tsx.
        const streetMatch = address.match(/^([^,]+)/);
        const { data, error } = await supabase.from("homes").insert([{
          user_id: userId,
          name: name.trim(),
          home_type: homeType,
          street_address: streetMatch?.[1]?.trim() || null,
          city: city.trim(),
          state: state.trim().toUpperCase(),
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          square_feet: squareFeet ? parseInt(squareFeet) : null,
          hvac_type: hvacType,
          roof_type: roofType,
          ...(hasPool !== null ? { has_pool: hasPool } : {}),
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        } as any]).select("id").single();
        if (error) throw error;
        setHomeId(data.id);
        setStep(3);
      } catch (e: any) {
        if (e.code === "23505") {
          toast({ title: "Address already claimed", description: "This address is already registered on Trimbly. If you believe this is an error, contact Support.", variant: "destructive" });
        } else {
          toast({ title: e.message || "Could not save home", variant: "destructive" });
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 3 && homeId) {
      onComplete(homeId);
    }
  };


  const progress = (step / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Welcome to Trimbly
          </DialogTitle>
          <DialogDescription>Step {step} of 3 — let's set up your first home.</DialogDescription>
        </DialogHeader>
        <Progress value={progress} className="h-1" />

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HomeIcon className="w-4 h-4 text-primary" /> Tell us about your home
            </div>
            <div className="space-y-2">
              <Label>Nickname</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Home" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={homeType} onValueChange={setHomeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="multi_family">Multi-Family</SelectItem>
                  <SelectItem value="mobile">Mobile Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" /> Where is it?
            </div>
            <div className="space-y-2">
              <Label>Street address</Label>
              <div className="flex gap-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupAddress(); } }}
                  placeholder="123 Main St, Austin, TX 78701"
                />
                <Button type="button" variant="secondary" onClick={lookupAddress} disabled={lookingUp} className="shrink-0">
                  {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="ml-1.5 hidden sm:inline">{lookingUp ? "Looking up" : "Look up"}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-primary" /> We'll pull year built, size, roof, HVAC and more automatically.
              </p>
            </div>

            {(lookedUp || city || state) && (
              <div className="space-y-4 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review details</p>
                {photoUrl && (
                  <img src={photoUrl} alt="" className="w-full h-32 object-cover rounded-md" />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Year built</Label>
                    <Input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="1998" />
                  </div>
                  <div className="space-y-2">
                    <Label>Square feet</Label>
                    <Input type="number" value={squareFeet} onChange={(e) => setSquareFeet(e.target.value)} placeholder="1850" />
                  </div>
                </div>
              </div>
            )}

            {!lookedUp && !city && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setLookedUp(true)}>
                Enter details manually instead
              </Button>
            )}
          </div>
        )}


        {step === 3 && (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h3 className="font-display font-bold text-lg">You're all set!</h3>
            <p className="text-sm text-muted-foreground">
              Your home is saved. Next, visit <span className="font-semibold">Maintenance Autopilot</span> to generate
              your first personalized maintenance schedule.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip for now</Button>
          <div className="flex gap-2">
            {step > 1 && step < 3 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
            <Button onClick={next} disabled={busy}>
              {busy ? "Saving..." : step === 3 ? "Go to my dashboard" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
