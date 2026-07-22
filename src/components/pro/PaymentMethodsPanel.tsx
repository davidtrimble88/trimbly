import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";

interface Props {
  providerId: string;
  initialMethods: string[] | null | undefined;
  initialHandles: Record<string, string> | null | undefined;
  onSaved?: (methods: string[], handles: Record<string, string>) => void;
}

const PaymentMethodsPanel = ({ providerId, initialMethods, initialHandles, onSaved }: Props) => {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialMethods || []));
  const [handles, setHandles] = useState<Record<string, string>>({ ...(initialHandles || {}) });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const methods = Array.from(selected);
    // Only keep handles for methods that are actually selected.
    const cleanedHandles = Object.fromEntries(
      Object.entries(handles).filter(([k, v]) => selected.has(k) && v.trim())
    );
    const { error } = await supabase
      .from("providers")
      .update({ payment_methods: methods, payment_handles: cleanedHandles })
      .eq("id", providerId);
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    onSaved?.(methods, cleanedHandles);
    toast({ title: "Payment methods saved" });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Wallet size={18} className="text-primary" /> Payment Methods
        </h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Let homeowners know how you like to get paid. This is just information shown on your
          profile — Trimbly never processes or handles any of these payments.
        </p>

        <div className="space-y-3">
          {PAYMENT_METHODS.map((m) => (
            <div key={m.key} className="rounded-lg border border-border p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={selected.has(m.key)} onCheckedChange={() => toggle(m.key)} />
                <span className="text-sm font-medium text-foreground">{m.label}</span>
              </label>
              {m.hasHandle && selected.has(m.key) && (
                <div className="mt-2.5 pl-6">
                  <Label className="text-xs text-muted-foreground">{m.handleHint} (optional)</Label>
                  <Input
                    value={handles[m.key] || ""}
                    onChange={(e) => setHandles((prev) => ({ ...prev, [m.key]: e.target.value }))}
                    placeholder={m.handlePlaceholder}
                    className="mt-1 h-9"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Payment Methods"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsPanel;
