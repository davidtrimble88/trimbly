import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Home as HomeIcon, MapPin, Sparkles, CheckCircle2 } from "lucide-react";
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
  const [homeId, setHomeId] = useState<string | null>(null);

  const next = async () => {
    if (step === 1) {
      if (!name.trim()) return toast({ title: "Give your home a name", variant: "destructive" });
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!city.trim() || !state.trim()) return toast({ title: "Add a city and state so we can tailor maintenance", variant: "destructive" });
      setBusy(true);
      try {
        const { data, error } = await supabase.from("homes").insert([{
          user_id: userId,
          name: name.trim(),
          home_type: homeType,
          city: city.trim(),
          state: state.trim().toUpperCase(),
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
        }]).select("id").single();
        if (error) throw error;
        setHomeId(data.id);
        setStep(3);
      } catch (e: any) {
        toast({ title: e.message || "Could not save home", variant: "destructive" });
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
            <Sparkles className="w-5 h-5 text-primary" /> Welcome to HomeHero
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" maxLength={2} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Year built (optional)</Label>
              <Input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="1998" />
            </div>
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
