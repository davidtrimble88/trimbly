import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Clock, Copy } from "lucide-react";

export type DayHours = { open: string; close: string; closed: boolean };
export type BusinessHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  DayHours
>;

const DAYS: Array<{ key: keyof BusinessHours; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: "08:00", close: "17:00", closed: false },
  tue: { open: "08:00", close: "17:00", closed: false },
  wed: { open: "08:00", close: "17:00", closed: false },
  thu: { open: "08:00", close: "17:00", closed: false },
  fri: { open: "08:00", close: "17:00", closed: false },
  sat: { open: "09:00", close: "14:00", closed: true },
  sun: { open: "09:00", close: "14:00", closed: true },
};

interface Props {
  providerId: string;
  initial: BusinessHours | null | undefined;
  onSaved?: (hours: BusinessHours) => void;
}

const BusinessHoursPanel = ({ providerId, initial, onSaved }: Props) => {
  const { toast } = useToast();
  const [hours, setHours] = useState<BusinessHours>({ ...DEFAULT_HOURS, ...(initial || {}) });
  const [saving, setSaving] = useState(false);

  const update = (day: keyof BusinessHours, patch: Partial<DayHours>) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const copyMondayToWeekdays = () => {
    const m = hours.mon;
    setHours((prev) => ({
      ...prev,
      tue: { ...m },
      wed: { ...m },
      thu: { ...m },
      fri: { ...m },
    }));
    toast({ title: "Copied Monday to weekdays" });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("providers")
      .update({ business_hours: hours as any })
      .eq("id", providerId);
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    onSaved?.(hours);
    toast({ title: "Business hours saved" });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Business Hours
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tell homeowners when you're open. Shown on your public profile.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={copyMondayToWeekdays} className="gap-1 shrink-0">
            <Copy size={12} /> Mon → Fri
          </Button>
        </div>

        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const h = hours[key];
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-2 sm:gap-3 bg-muted/40 rounded-lg p-3"
              >
                <div className="w-24 font-medium text-sm text-foreground">{label}</div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!h.closed}
                    onCheckedChange={(v) => update(key, { closed: !v })}
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {h.closed ? "Closed" : "Open"}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Input
                    type="time"
                    value={h.open}
                    onChange={(e) => update(key, { open: e.target.value })}
                    disabled={h.closed}
                    className="w-28"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={h.close}
                    onChange={(e) => update(key, { close: e.target.value })}
                    disabled={h.closed}
                    className="w-28"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Hours"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessHoursPanel;
