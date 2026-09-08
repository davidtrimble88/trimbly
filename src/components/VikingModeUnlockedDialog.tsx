import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { Axe } from "lucide-react";

interface Props {
  open: boolean;
  partnerName: string | null;
  onContinue: () => void;
}

// A longship crossing under a starlit fjord sky — the reveal for redeeming a
// code with unlocks_viking_mode (see the HEXWOOD seed in the 20260908
// migration). Fully self-contained: nothing here reaches into the rest of
// the app, so there's nothing else it could break.
function LongshipIllustration() {
  return (
    <svg viewBox="0 0 400 160" className="w-full h-auto" role="presentation" aria-hidden="true">
      <defs>
        <clipPath id="viking-sail-clip">
          <path d="M175,45 L225,45 L240,105 L160,105 Z" />
        </clipPath>
      </defs>

      {/* sky */}
      <circle cx="320" cy="34" r="11" fill="hsl(var(--primary))" opacity="0.55" />
      {[[40, 24], [70, 44], [110, 20], [150, 50], [260, 26], [355, 60]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 1.6 : 1} fill="hsl(var(--foreground))" opacity="0.5" />
      ))}

      {/* mast + sail */}
      <line x1="200" y1="40" x2="200" y2="112" stroke="hsl(var(--foreground))" strokeOpacity="0.5" strokeWidth="2" />
      <g clipPath="url(#viking-sail-clip)">
        <rect x="155" y="40" width="22.5" height="70" fill="hsl(var(--primary))" opacity="0.9" />
        <rect x="177.5" y="40" width="22.5" height="70" fill="hsl(var(--foreground))" opacity="0.85" />
        <rect x="200" y="40" width="22.5" height="70" fill="hsl(var(--accent))" opacity="0.9" />
        <rect x="222.5" y="40" width="22.5" height="70" fill="hsl(var(--foreground))" opacity="0.85" />
      </g>

      {/* hull */}
      <path d="M65,100 Q200,124 335,100 Q200,111 65,100 Z" fill="hsl(var(--primary))" />
      {/* dragon-head prow */}
      <path
        d="M75,106 C58,99 52,79 64,63 C70,71 79,77 83,89 C86,98 83,103 75,106 Z"
        fill="hsl(var(--primary))"
      />
      <circle cx="70" cy="80" r="1.6" fill="hsl(var(--background))" />
      {/* stern curl */}
      <path d="M325,106 C339,100 345,86 338,73 C333,83 327,91 320,99 Z" fill="hsl(var(--primary))" />

      {/* shields along the gunwale */}
      {[105, 140, 175, 225, 260, 295].map((x, i) => (
        <circle key={x} cx={x} cy="99" r="4.5" fill={i % 2 === 0 ? "hsl(var(--accent))" : "hsl(var(--foreground))"} opacity="0.85" />
      ))}

      {/* waves */}
      <path d="M0,132 Q40,124 80,132 T160,132 T240,132 T320,132 T400,132" fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M0,144 Q40,138 80,144 T160,144 T240,144 T320,144 T400,144" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.3" strokeWidth="2" />
    </svg>
  );
}

// Shown once, right after redeeming a code with unlocks_viking_mode — the
// "special, fun, screenshot-worthy" moment behind the partner program.
//
// Viking Mode itself is gated to paid (non-free-tier) accounts (see
// ThemeToggle.tsx) — a code like HEXWOOD grants no tier on its own, so
// redeeming it doesn't necessarily make someone paid yet. This dialog
// reflects that honestly instead of switching the theme on and having
// ThemeToggle's own fallback silently switch it back off a moment later:
// a paid account gets the full "switch now" moment, a free-tier account
// gets the same celebration framed as something waiting for them.
export function VikingModeUnlockedDialog({ open, partnerName, onContinue }: Props) {
  const { setTheme } = useTheme();
  const { isPaidAccount } = useAuth();

  const handleContinue = () => {
    if (isPaidAccount) setTheme("viking");
    onContinue();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleContinue(); }}>
      {/* Forces the .viking CSS variables regardless of the account's
          currently-active theme (light/dark/viking) — this is a preview of
          what Viking Mode looks like, so it should always render that way,
          not whatever colors happen to be active when someone redeems a
          code. Without this, someone redeeming while on "dark" previously
          got near-black text on a near-black gradient here — invisible. */}
      <DialogContent className="viking max-w-md text-center overflow-hidden p-0" style={{ background: "var(--hero-gradient)" }}>
        <div className="pt-6 px-6">
          <LongshipIllustration />
        </div>
        <div className="px-6 pb-6">
          <DialogHeader className="items-center">
            <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center mb-3 -mt-2">
              <Axe className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-display text-foreground">Viking Mode Unlocked</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground/75 pt-1">
              {partnerName ? `${partnerName}'s code just gave you something no one else gets.` : "Your code just gave you something no one else gets."}{" "}
              {isPaidAccount
                ? "A whole third look for Trimbly — yours for good."
                : "A whole third look for Trimbly, waiting for you — it switches on the moment you're on a paid plan."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-2">
            <Button size="lg" className="gap-2" onClick={handleContinue}>
              <Axe className="w-4 h-4" /> {isPaidAccount ? "Set Sail" : "Got it"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
