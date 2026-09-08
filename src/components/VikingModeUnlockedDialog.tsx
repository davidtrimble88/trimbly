import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Axe } from "lucide-react";

interface Props {
  open: boolean;
  partnerName: string | null;
  onContinue: () => void;
}

// Shown once, right after redeeming a code with unlocks_viking_mode — the
// "special, fun, screenshot-worthy" moment behind the partner program (see
// the HEXWOOD seed in the 20260908 migration). Switches the app straight
// into Viking Mode before the person even sees the dashboard, so the reveal
// itself is the reward, not a settings toggle they have to go find.
export function VikingModeUnlockedDialog({ open, partnerName, onContinue }: Props) {
  const { setTheme } = useTheme();

  const handleContinue = () => {
    setTheme("viking");
    onContinue();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleContinue(); }}>
      <DialogContent className="max-w-md text-center" style={{ background: "var(--hero-gradient)" }}>
        <DialogHeader className="items-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center mb-3">
            <Axe className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-display text-primary-foreground">Viking Mode Unlocked</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-primary-foreground/80 pt-1">
            {partnerName ? `${partnerName}'s code just gave you something no one else gets.` : "Your code just gave you something no one else gets."}{" "}
            A whole third look for Trimbly — yours for good, whether or not you ever upgrade.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button size="lg" className="gap-2" onClick={handleContinue}>
            <Axe className="w-4 h-4" /> See Viking Mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
