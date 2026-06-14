import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, ExternalLink, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Question = {
  key: string;
  label: string;
  type: "select" | "input";
  options?: { value: string; label: string }[];
  placeholder?: string;
};

// Map a task name (case-insensitive substring) to a question set + base search term
type Preset = { match: RegExp; baseTerm: string; questions: Question[] };

const PRESETS: Preset[] = [
  {
    match: /oil\s*change|engine\s*oil/i,
    baseTerm: "motor oil",
    questions: [
      { key: "auto_oil_grade", label: "Oil viscosity / grade", type: "select", options: [
        { value: "0W-20", label: "0W-20 (most modern engines)" },
        { value: "5W-20", label: "5W-20" },
        { value: "5W-30", label: "5W-30" },
        { value: "10W-30", label: "10W-30" },
        { value: "10W-40", label: "10W-40 (motorcycles / older)" },
        { value: "15W-40", label: "15W-40 (diesel)" },
        { value: "other", label: "Other" },
      ]},
      { key: "auto_oil_grade_custom", label: "Enter your grade", type: "input", placeholder: "e.g. 20W-50" },
      { key: "auto_oil_type", label: "Oil type", type: "select", options: [
        { value: "full synthetic", label: "✨ Full Synthetic (recommended)" },
        { value: "synthetic blend", label: "⭐ Synthetic Blend" },
        { value: "conventional", label: "💰 Conventional" },
        { value: "high mileage synthetic", label: "🛣️ High-Mileage Synthetic (75k+ mi)" },
      ]},
      { key: "auto_oil_qty", label: "How many quarts?", type: "select", options: [
        { value: "5 quart", label: "5 qt (most sedans)" },
        { value: "6 quart", label: "6 qt" },
        { value: "1 quart", label: "1 qt (motorcycle)" },
      ]},
      { key: "auto_oil_brand", label: "Preferred brand (optional)", type: "select", options: [
        { value: "", label: "No preference" },
        { value: "Mobil 1", label: "Mobil 1" },
        { value: "Castrol", label: "Castrol" },
        { value: "Valvoline", label: "Valvoline" },
        { value: "Pennzoil", label: "Pennzoil" },
        { value: "Royal Purple", label: "Royal Purple" },
      ]},
    ],
  },
  {
    match: /oil\s*filter/i,
    baseTerm: "oil filter",
    questions: [
      { key: "auto_filter_brand", label: "Brand preference", type: "select", options: [
        { value: "", label: "No preference" },
        { value: "Mobil 1", label: "Mobil 1 Extended Performance" },
        { value: "K&N", label: "K&N Premium" },
        { value: "Bosch", label: "Bosch Premium" },
        { value: "Fram Ultra", label: "Fram Ultra Synthetic" },
        { value: "Wix", label: "Wix XP" },
      ]},
    ],
  },
  {
    match: /air\s*filter/i,
    baseTerm: "engine air filter",
    questions: [
      { key: "auto_air_type", label: "Filter type", type: "select", options: [
        { value: "standard paper", label: "📄 Standard paper (replace)" },
        { value: "K&N washable reusable", label: "♻️ K&N washable / reusable" },
      ]},
    ],
  },
  {
    match: /cabin\s*(air\s*)?filter/i,
    baseTerm: "cabin air filter",
    questions: [
      { key: "auto_cabin_type", label: "Filter type", type: "select", options: [
        { value: "particulate", label: "Particulate (dust/pollen)" },
        { value: "activated carbon HEPA", label: "✨ Activated Carbon / HEPA (odors + allergens)" },
      ]},
    ],
  },
  {
    match: /brake\s*pad|brake\s*rotor|brakes/i,
    baseTerm: "brake pads",
    questions: [
      { key: "auto_brake_position", label: "Which axle?", type: "select", options: [
        { value: "front", label: "Front" },
        { value: "rear", label: "Rear" },
        { value: "front and rear", label: "Front + Rear (full set)" },
      ]},
      { key: "auto_brake_material", label: "Pad material", type: "select", options: [
        { value: "ceramic", label: "🟢 Ceramic (quiet, low dust)" },
        { value: "semi-metallic", label: "🟡 Semi-Metallic (best stopping)" },
        { value: "organic", label: "💰 Organic (budget)" },
      ]},
      { key: "auto_brake_brand", label: "Brand preference", type: "select", options: [
        { value: "", label: "No preference" },
        { value: "Akebono", label: "Akebono" },
        { value: "Brembo", label: "Brembo" },
        { value: "Bosch", label: "Bosch QuietCast" },
        { value: "Power Stop", label: "Power Stop" },
      ]},
    ],
  },
  {
    match: /wiper|windshield/i,
    baseTerm: "windshield wiper blades",
    questions: [
      { key: "auto_wiper_size", label: "Wiper sizes (driver/passenger)", type: "input", placeholder: 'e.g. 24" + 18"' },
      { key: "auto_wiper_type", label: "Style", type: "select", options: [
        { value: "beam", label: "✨ Beam (premium, all-weather)" },
        { value: "hybrid", label: "⭐ Hybrid" },
        { value: "conventional", label: "💰 Conventional" },
      ]},
    ],
  },
  {
    match: /battery/i,
    baseTerm: "car battery",
    questions: [
      { key: "auto_battery_group", label: "Battery group size", type: "input", placeholder: "e.g. Group 35, 24F, H6" },
      { key: "auto_battery_type", label: "Type", type: "select", options: [
        { value: "AGM", label: "✨ AGM (best for start/stop)" },
        { value: "standard lead acid", label: "Standard lead-acid" },
      ]},
    ],
  },
  {
    match: /coolant|antifreeze/i,
    baseTerm: "engine coolant antifreeze",
    questions: [
      { key: "auto_coolant_color", label: "Coolant type", type: "select", options: [
        { value: "green IAT universal", label: "🟢 Green (IAT, older vehicles)" },
        { value: "orange Dex-Cool OAT", label: "🟠 Orange (Dex-Cool / OAT)" },
        { value: "pink red Toyota Honda OEM", label: "🟣 Pink/Red (Toyota/Honda OEM)" },
        { value: "blue Asian", label: "🔵 Blue (Asian vehicles)" },
        { value: "yellow universal", label: "🟡 Yellow (universal)" },
      ]},
      { key: "auto_coolant_concentration", label: "Pre-mixed?", type: "select", options: [
        { value: "50/50 prediluted", label: "50/50 pre-diluted (ready to pour)" },
        { value: "concentrate", label: "Concentrate (mix yourself)" },
      ]},
    ],
  },
  {
    match: /spark\s*plug/i,
    baseTerm: "spark plugs",
    questions: [
      { key: "auto_plug_type", label: "Plug material", type: "select", options: [
        { value: "iridium", label: "✨ Iridium (100k mile)" },
        { value: "double platinum", label: "⭐ Double Platinum" },
        { value: "copper", label: "💰 Copper (short life, cheap)" },
      ]},
    ],
  },
  {
    match: /tire\s*rotation|rotate\s*tires/i,
    baseTerm: "tire rotation tools torque wrench",
    questions: [],
  },
  {
    match: /tires|new\s*tires/i,
    baseTerm: "tires",
    questions: [
      { key: "auto_tire_size", label: "Tire size", type: "input", placeholder: "e.g. 225/65R17" },
      { key: "auto_tire_use", label: "Driving conditions", type: "select", options: [
        { value: "all season", label: "All-Season" },
        { value: "all weather", label: "All-Weather" },
        { value: "winter snow", label: "Winter / Snow" },
        { value: "performance summer", label: "Performance / Summer" },
        { value: "all terrain truck SUV", label: "All-Terrain (truck/SUV)" },
      ]},
    ],
  },
  // Motorcycle-specific
  {
    match: /chain.*(lube|clean|adjust)|drive\s*chain/i,
    baseTerm: "motorcycle chain lube and cleaner kit",
    questions: [
      { key: "moto_chain_lube", label: "Lube type", type: "select", options: [
        { value: "wet weather", label: "🌧️ Wet (rainy / touring)" },
        { value: "dry dusty", label: "☀️ Dry (street, low dust)" },
        { value: "off-road", label: "🏍️ Off-Road" },
      ]},
    ],
  },
  {
    match: /transmission\s*fluid|atf/i,
    baseTerm: "transmission fluid",
    questions: [
      { key: "auto_atf_type", label: "Fluid spec", type: "input", placeholder: "e.g. Dexron VI, Mercon LV, CVT NS-3" },
    ],
  },
];

const fallback: Preset = {
  match: /.*/,
  baseTerm: "",
  questions: [
    { key: "vehicle_generic_quality", label: "Quality preference", type: "select", options: [
      { value: "OEM original equipment", label: "✨ OEM / dealer-grade" },
      { value: "premium aftermarket", label: "⭐ Premium aftermarket" },
      { value: "budget", label: "💰 Budget" },
    ]},
    { key: "vehicle_generic_brand", label: "Preferred brand (optional)", type: "input", placeholder: "Any specific brand" },
  ],
};

function pickPreset(taskName: string): Preset {
  return PRESETS.find((p) => p.match.test(taskName)) || fallback;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: { id: string; task_name: string; category?: string | null };
  vehicle: { id: string; make: string; model: string; year: number | null; vehicle_type?: string | null };
}

export const VehicleProductDialog = ({ open, onOpenChange, task, vehicle }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const preset = pickPreset(task.task_name);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const keys = preset.questions.map((q) => q.key);
      if (keys.length === 0) {
        setAnswers({});
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("product_preferences")
        .select("preference_key, preference_value")
        .eq("user_id", user.id)
        .in("preference_key", keys);
      const saved: Record<string, string> = {};
      (data || []).forEach((p: any) => { saved[p.preference_key] = p.preference_value; });
      setAnswers(saved);
      setLoading(false);
    })();
  }, [open, user, task.id]);

  const visibleQuestions = preset.questions.filter((q) => {
    if (q.key === "auto_oil_grade_custom") return answers["auto_oil_grade"] === "other";
    return true;
  });

  const handleSelect = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const buildSearchTerm = () => {
    const vehiclePart = `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`.trim();
    const parts: string[] = [vehiclePart, preset.baseTerm || task.task_name];
    for (const q of visibleQuestions) {
      const val = answers[q.key];
      if (val && val.trim()) parts.push(val);
    }
    return parts.filter(Boolean).join(" ");
  };

  const handleShopNow = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const upserts = Object.entries(answers)
        .filter(([_, v]) => v && v.trim())
        .map(([key, value]) => ({
          user_id: user.id,
          preference_key: key,
          preference_value: value,
          updated_at: new Date().toISOString(),
        }));
      if (upserts.length > 0) {
        const keys = upserts.map((u) => u.preference_key);
        await supabase.from("product_preferences").delete().eq("user_id", user.id).in("preference_key", keys);
        await supabase.from("product_preferences").insert(upserts);
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(buildSearchTerm())}`;
    window.open(url, "_blank");
    toast({ title: "Preferences saved", description: "Your choices will be remembered for next time." });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            Find the right part
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-1">
          For: <span className="font-medium text-foreground">{task.task_name}</span>
          <br />
          <span className="text-xs">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {visibleQuestions.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                We'll search Amazon for parts that fit your <strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong>.
              </p>
            )}
            {visibleQuestions.map((q) => (
              <div key={q.key}>
                <Label className="text-sm font-medium">{q.label}</Label>
                {q.type === "select" && q.options ? (
                  <div className="grid gap-2 mt-2">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleSelect(q.key, opt.value)}
                          className={`p-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                              : "border-border bg-card text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {opt.label}
                          {isSelected && <Check size={14} className="text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    className="mt-2"
                    placeholder={q.placeholder}
                    value={answers[q.key] || ""}
                    onChange={(e) => handleSelect(q.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="pt-2 space-y-2">
              <Button onClick={handleShopNow} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                Shop on Amazon <ExternalLink size={14} />
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Your answers are saved for future purchases
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
