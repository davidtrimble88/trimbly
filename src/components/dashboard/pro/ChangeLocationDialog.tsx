import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPinned } from "lucide-react";

interface ChangeLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: string;
  state: string;
  postal: string;
  country: string;
  onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onPostalChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}

const ChangeLocationDialog = ({
  open, onOpenChange, city, state, postal, country,
  onCityChange, onStateChange, onPostalChange, onCountryChange, onSave, saving,
}: ChangeLocationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPinned size={18} /> Change Service Location</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Set where homeowners find you. Use city + state, a ZIP/postal code, or both.
        </p>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Country</Label>
            <select
              value={country}
              onChange={e => onCountryChange(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={e => onCityChange(e.target.value)} className="mt-1" placeholder={country === "CA" ? "e.g. Toronto" : "e.g. Austin"} />
            </div>
            <div>
              <Label>{country === "CA" ? "Province" : "State"}</Label>
              <Input value={state} onChange={e => onStateChange(e.target.value)} className="mt-1" placeholder={country === "CA" ? "e.g. ON" : "e.g. TX"} />
            </div>
          </div>
          <div>
            <Label>{country === "CA" ? "Postal Code" : "ZIP Code"} <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={postal}
              onChange={e => onPostalChange(e.target.value)}
              className="mt-1"
              placeholder={country === "CA" ? "e.g. M5V 2T6" : "e.g. 78701"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save Location"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeLocationDialog;
