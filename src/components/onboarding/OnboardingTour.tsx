import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";

export interface TourStep {
  title: string;
  body: string;
}

interface Props {
  storageKey: string;
  steps: TourStep[];
  intro?: { title: string; body: string };
}

export function OnboardingTour({ storageKey, steps, intro }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1); // -1 = intro

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        setOpen(true);
        setIndex(intro ? -1 : 0);
      }
    } catch {}
  }, [storageKey, intro]);

  const finish = () => {
    try { localStorage.setItem(storageKey, "1"); } catch {}
    setOpen(false);
  };

  const total = steps.length;
  const isIntro = index === -1;
  const isLast = index === total - 1;
  const current = !isIntro ? steps[index] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            {!isIntro && (
              <span className="text-xs text-muted-foreground">Step {index + 1} of {total}</span>
            )}
          </div>
          <DialogTitle className="text-xl">
            {isIntro ? intro?.title : current?.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            {isIntro ? intro?.body : current?.body}
          </DialogDescription>
        </DialogHeader>

        {!isIntro && (
          <div className="flex gap-1 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          <Button variant="ghost" size="sm" onClick={finish}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {!isIntro && index > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                <ArrowLeft size={14} className="mr-1" /> Back
              </Button>
            )}
            {isIntro ? (
              <Button size="sm" onClick={() => setIndex(0)}>
                Start tour <ArrowRight size={14} className="ml-1" />
              </Button>
            ) : isLast ? (
              <Button size="sm" onClick={finish}>
                <Check size={14} className="mr-1" /> Got it
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIndex(index + 1)}>
                Next <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
