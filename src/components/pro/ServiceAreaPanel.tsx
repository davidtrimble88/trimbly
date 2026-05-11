import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPinned, Save } from "lucide-react";

interface Props {
  providerId: string;
  city: string;
  state: string;
  initialRadius: number;
  onUpdated: (radius: number) => void;
}

const ServiceAreaPanel = ({ providerId, city, state, initialRadius, onUpdated }: Props) => {
  const { toast } = useToast();
  const [radius, setRadius] = useState(String(initialRadius));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const r = parseInt(radius, 10);
    if (isNaN(r) || r < 1 || r > 500) {
      return toast({ title: "Enter a radius between 1 and 500 miles", variant: "destructive" });
    }
    setSaving(true);
    const { error } = await supabase
      .from("providers")
      .update({ service_radius_miles: r })
      .eq("id", providerId);
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    onUpdated(r);
    toast({ title: "Service area updated" });
  };

  const mapQuery = encodeURIComponent(`${city}, ${state}`);
  const mapUrl = `https://www.openstreetmap.org/search?query=${mapQuery}`;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-bold text-foreground flex items-center gap-2 mb-2">
          <MapPinned size={18} className="text-primary" /> Service Area
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set how far you're willing to travel for jobs. Homeowners outside this radius won't see
          you as a match for nearby searches.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Label>Travel radius (miles)</Label>
            <Input
              type="number"
              min="1"
              max="500"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={save} disabled={saving} className="gap-1">
            <Save size={14} /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        <div className="mt-4 rounded-lg overflow-hidden border border-border bg-muted/40 aspect-[2/1] relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-full border-2 border-primary/50 bg-primary/10 flex items-center justify-center"
              style={{
                width: `${Math.min(80, Math.max(15, (parseInt(radius, 10) || initialRadius) / 3))}%`,
                aspectRatio: "1 / 1",
              }}
            >
              <div className="text-center">
                <MapPinned className="mx-auto h-6 w-6 text-primary" />
                <p className="text-xs font-semibold text-foreground mt-1">
                  {city}, {state}
                </p>
                <p className="text-xs text-muted-foreground">
                  {parseInt(radius, 10) || initialRadius} mi
                </p>
              </div>
            </div>
          </div>
        </div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline mt-2 inline-block"
        >
          View {city}, {state} on map →
        </a>
      </CardContent>
    </Card>
  );
};

export default ServiceAreaPanel;
