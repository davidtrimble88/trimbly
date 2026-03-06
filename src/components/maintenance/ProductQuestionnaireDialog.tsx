import { useState, useEffect } from "react";
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

// Category-specific questions to narrow down the exact product
const categoryQuestions: Record<string, Question[]> = {
  HVAC: [
    { key: "hvac_filter_size", label: "What size air filter do you need?", type: "select", options: [
      { value: "16x20x1", label: "16x20x1" },
      { value: "16x25x1", label: "16x25x1" },
      { value: "20x20x1", label: "20x20x1" },
      { value: "20x25x1", label: "20x25x1" },
      { value: "20x25x4", label: "20x25x4" },
      { value: "24x24x1", label: "24x24x1" },
      { value: "other", label: "Other size" },
    ]},
    { key: "hvac_filter_size_custom", label: "Enter your filter size", type: "input", placeholder: "e.g. 14x30x1" },
    { key: "hvac_filter_rating", label: "Filter quality preference?", type: "select", options: [
      { value: "MERV 8", label: "🟢 Basic (MERV 8) — budget friendly" },
      { value: "MERV 11", label: "🟡 Better (MERV 11) — allergen reduction" },
      { value: "MERV 13", label: "🔴 Best (MERV 13) — max filtration" },
    ]},
    { key: "hvac_brand_pref", label: "Preferred brand? (optional)", type: "select", options: [
      { value: "", label: "No preference" },
      { value: "Filtrete", label: "Filtrete (3M)" },
      { value: "Honeywell", label: "Honeywell" },
      { value: "Nordic Pure", label: "Nordic Pure" },
    ]},
  ],
  Safety: [
    { key: "safety_detector_type", label: "What type of detector?", type: "select", options: [
      { value: "smoke detector", label: "🔥 Smoke Detector" },
      { value: "carbon monoxide detector", label: "☁️ Carbon Monoxide Detector" },
      { value: "combo smoke CO detector", label: "🔥☁️ Combo Smoke + CO" },
    ]},
    { key: "safety_power_type", label: "Power type?", type: "select", options: [
      { value: "battery operated", label: "🔋 Battery Operated" },
      { value: "hardwired", label: "🔌 Hardwired" },
      { value: "hardwired with battery backup", label: "🔌🔋 Hardwired + Battery Backup" },
    ]},
    { key: "safety_brand_pref", label: "Preferred brand? (optional)", type: "select", options: [
      { value: "", label: "No preference" },
      { value: "First Alert", label: "First Alert" },
      { value: "Kidde", label: "Kidde" },
      { value: "Google Nest", label: "Google Nest Protect" },
    ]},
  ],
  Pool: [
    { key: "pool_type", label: "What type of pool?", type: "select", options: [
      { value: "chlorine", label: "💧 Chlorine" },
      { value: "saltwater", label: "🧂 Saltwater" },
    ]},
    { key: "pool_size", label: "Pool size?", type: "select", options: [
      { value: "small up to 5000 gallons", label: "Small (up to 5,000 gal)" },
      { value: "medium 5000-15000 gallons", label: "Medium (5,000–15,000 gal)" },
      { value: "large 15000+ gallons", label: "Large (15,000+ gal)" },
    ]},
  ],
  Exterior: [
    { key: "exterior_sealant_type", label: "What surface are you sealing?", type: "select", options: [
      { value: "driveway concrete", label: "🏠 Concrete / Driveway" },
      { value: "wood deck", label: "🪵 Wood Deck" },
      { value: "brick", label: "🧱 Brick / Masonry" },
      { value: "window caulk", label: "🪟 Window / Door Caulk" },
    ]},
  ],
  Plumbing: [
    { key: "plumbing_water_type", label: "What's your water type?", type: "select", options: [
      { value: "city water", label: "🏙️ City Water" },
      { value: "well water", label: "💧 Well Water" },
      { value: "hard water", label: "🪨 Hard Water" },
    ]},
  ],
  Appliances: [
    { key: "appliance_brand", label: "Appliance brand?", type: "input", placeholder: "e.g. Samsung, LG, Whirlpool" },
    { key: "appliance_model", label: "Model number? (optional)", type: "input", placeholder: "Check the label on your appliance" },
  ],
};

// Fallback generic questions
const genericQuestions: Question[] = [
  { key: "generic_brand_pref", label: "Preferred brand? (optional)", type: "input", placeholder: "e.g. any specific brand" },
  { key: "generic_quality", label: "Quality preference?", type: "select", options: [
    { value: "budget", label: "💰 Budget friendly" },
    { value: "mid-range", label: "⭐ Mid-range / best value" },
    { value: "premium", label: "✨ Premium / top rated" },
  ]},
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    category: string;
    products_search_term: string;
  };
}

export const ProductQuestionnaireDialog = ({ open, onOpenChange, task }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const questions = categoryQuestions[task.category] || genericQuestions;

  // Load saved preferences
  useEffect(() => {
    if (!open || !user) return;
    const loadPrefs = async () => {
      setLoading(true);
      const keys = questions.map(q => q.key);
      const { data } = await supabase
        .from("product_preferences")
        .select("preference_key, preference_value")
        .eq("user_id", user.id)
        .in("preference_key", keys);

      const saved: Record<string, string> = {};
      (data || []).forEach(p => { saved[p.preference_key] = p.preference_value; });
      setAnswers(saved);
      setLoading(false);
    };
    loadPrefs();
  }, [open, user]);

  // Filter questions contextually (e.g. hide custom size if not "other")
  const visibleQuestions = questions.filter(q => {
    if (q.key === "hvac_filter_size_custom") return answers["hvac_filter_size"] === "other";
    return true;
  });

  const handleSelect = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const buildSearchTerm = () => {
    const parts: string[] = [task.products_search_term];

    for (const q of visibleQuestions) {
      const val = answers[q.key];
      if (val && val.trim()) {
        parts.push(val);
      }
    }

    return parts.filter(Boolean).join(" ");
  };

  const handleShopNow = async () => {
    if (!user) return;
    setSaving(true);

    // Save preferences for future use
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
        // Delete existing then insert (upsert workaround)
        const keys = upserts.map(u => u.preference_key);
        await supabase
          .from("product_preferences")
          .delete()
          .eq("user_id", user.id)
          .in("preference_key", keys);

        await supabase.from("product_preferences").insert(upserts);
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }

    const searchTerm = buildSearchTerm();
    const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
    window.open(amazonUrl, "_blank");

    toast({ title: "Preferences saved!", description: "Your choices will be remembered for next time." });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            Find the right product
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-1">
          For: <span className="font-medium text-foreground">{task.title}</span>
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {visibleQuestions.map(q => (
              <div key={q.key}>
                <Label className="text-sm font-medium">{q.label}</Label>
                {q.type === "select" && q.options ? (
                  <div className="grid gap-2 mt-2">
                    {q.options.map(opt => {
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
                    onChange={e => handleSelect(q.key, e.target.value)}
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
