import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PartyPopper, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onAcknowledge: () => void;
}

// Required consent step shown once, immediately after a tester redeems the
// testing discount code — before they ever reach the dashboard. Not
// dismissible via the backdrop/Escape; the only way through is the
// acknowledgment checkbox + button, since this is standing in for a real
// beta-terms acceptance.
export function TestingWelcomeModal({ open, onAcknowledge }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={() => { /* no-op: must acknowledge to close */ }}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader>
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <PartyPopper className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="text-xl">Welcome to Trimbly testing!</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            Thank you for helping us test the homeowner side of Trimbly. Your account now has full access to every
            paid feature, free, for the whole testing period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground">
          <p>
            When testing wraps up, we'll email and notify you in-app so you can either move to the Free plan or pick
            and sign up for a paid subscription. Nothing is charged automatically — you choose what happens next.
          </p>
          <p>
            Look for the <strong>Report a bug</strong> / <strong>Send feedback</strong> option in your dashboard —
            use it anytime you hit something broken, confusing, or worth suggesting. That's exactly what this round of
            testing is for.
          </p>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Testing / beta disclaimer:</strong> Trimbly is under active
              development. Features may change, break, or behave unexpectedly, and data loss is possible during this
              period — please don't rely on this account for anything critical. Trimbly and its team provide this
              testing access "as is," without warranties of any kind, and aren't liable for any loss, damage, or
              inconvenience arising from your use of the app during testing. Your access is free and provided at our
              discretion, and may be modified or ended at any time.
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm pt-1 cursor-pointer">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <span>
              I understand my account is free until testing ends, that Trimbly is a beta product that may not work as
              advertised, and that Trimbly can't be held liable for issues that come up during testing.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button className="w-full sm:w-auto" disabled={!checked} onClick={onAcknowledge}>
            Got it — start testing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
