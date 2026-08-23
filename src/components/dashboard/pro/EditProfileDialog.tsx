import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { ProviderProfile } from "./types";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Partial<ProviderProfile>;
  onChange: (updater: (f: Partial<ProviderProfile>) => Partial<ProviderProfile>) => void;
  onSave: () => void;
  saving: boolean;
  /** "mechanic" shows a Specialty field instead of Years Exp. */
  variant?: "pro" | "mechanic";
}

const EditProfileDialog = ({ open, onOpenChange, form, onChange, onSave, saving, variant = "pro" }: EditProfileDialogProps) => {
  const isMechanic = variant === "mechanic";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isMechanic ? "Edit Shop Profile" : "Edit Business Profile"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{isMechanic ? "Shop Name" : "Business Name"}</Label>
            <Input value={form.business_name || ""} onChange={e => onChange(f => ({ ...f, business_name: e.target.value }))} className="mt-1" />
          </div>
          {isMechanic && (
            <div>
              <Label>Specialty</Label>
              <Input value={form.category || ""} onChange={e => onChange(f => ({ ...f, category: e.target.value }))} className="mt-1" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city || ""} onChange={e => onChange(f => ({ ...f, city: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state || ""} onChange={e => onChange(f => ({ ...f, state: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone || ""} onChange={e => onChange(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
              <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Switch
                  checked={!!form.show_phone_publicly}
                  onCheckedChange={(v) => onChange(f => ({ ...f, show_phone_publicly: v }))}
                />
                Show this number on my public profile
              </label>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website || ""} onChange={e => onChange(f => ({ ...f, website: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={e => onChange(f => ({ ...f, description: e.target.value }))} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Min Rate ($/hr)</Label>
              <Input type="number" value={form.hourly_rate_min || 0} onChange={e => onChange(f => ({ ...f, hourly_rate_min: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Max Rate ($/hr)</Label>
              <Input type="number" value={form.hourly_rate_max || 0} onChange={e => onChange(f => ({ ...f, hourly_rate_max: Number(e.target.value) }))} className="mt-1" />
            </div>
            {!isMechanic && (
              <div>
                <Label>Years Exp.</Label>
                <Input type="number" value={form.years_experience || 0} onChange={e => onChange(f => ({ ...f, years_experience: Number(e.target.value) }))} className="mt-1" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.licensed || false} onChange={e => onChange(f => ({ ...f, licensed: e.target.checked }))} className="rounded" /> Licensed
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.insured || false} onChange={e => onChange(f => ({ ...f, insured: e.target.checked }))} className="rounded" /> Insured
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
