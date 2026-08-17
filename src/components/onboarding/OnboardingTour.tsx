import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Sparkles, Check, HelpCircle, X } from "lucide-react";

export interface TourStep {
  title: string;
  body: string;
  /** CSS selector for the element to spotlight and point the card at.
   * Omit for a centered card with no highlight (e.g. the intro step, or a
   * step that's about the page in general rather than one control). */
  target?: string;
}

interface Props {
  storageKey: string;
  steps: TourStep[];
  intro?: { title: string; body: string };
  /** When provided, the default floating "Replay tour" button is suppressed and this is called once on mount with the replay function, so the caller can wire its own trigger (e.g. a sidebar menu item) elsewhere in the tree. */
  onReplayReady?: (replay: () => void) => void;
}

interface Rect { top: number; left: number; width: number; height: number; }
type ArrowDir = "top" | "bottom" | "left" | "right";

const CARD_W = 336;
const CARD_H_ESTIMATE = 200;
const GAP = 14;
const EDGE_PAD = 16;

function findTargetRect(selector?: string): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function OnboardingTour({ storageKey, steps, intro, onReplayReady }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1); // -1 = intro
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        setOpen(true);
        setIndex(intro ? -1 : 0);
      }
    } catch {}
  }, [storageKey, intro]);

  const replay = () => {
    setIndex(intro ? -1 : 0);
    setOpen(true);
  };

  useEffect(() => {
    onReplayReady?.(replay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    try { localStorage.setItem(storageKey, "1"); } catch {}
    setOpen(false);
    setTargetRect(null);
  };

  const total = steps.length;
  const isIntro = index === -1;
  const isLast = index === total - 1;
  const current = !isIntro ? steps[index] : null;
  const selector = current?.target;

  // Track the current step's target element — scrolls it into view once,
  // then re-measures every frame so the spotlight stays glued to it through
  // scrolling, resizing, and collapsible-sidebar animations.
  useLayoutEffect(() => {
    if (!open || !selector) { setTargetRect(null); return; }

    // Measure synchronously right away so the card is correctly placed on
    // the very first paint — don't wait on requestAnimationFrame for this,
    // since rAF can be throttled/paused entirely for a backgrounded or
    // non-composited tab, which would otherwise strand the card centered.
    setTargetRect(findTargetRect(selector));

    const initial = document.querySelector(selector) as HTMLElement | null;
    initial?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    // Keep tracking on top of that for scroll/resize/sidebar-collapse — a
    // nice-to-have that degrades gracefully (just stops repositioning) if
    // rAF doesn't fire, rather than something the initial render depends on.
    const tick = () => {
      setTargetRect(findTargetRect(selector));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, selector]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return !onReplayReady ? (
      <button
        onClick={replay}
        className="fixed bottom-6 right-6 z-[100] inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-xl hover:opacity-90 transition border-2 border-primary-foreground/20"
        aria-label="Replay tour"
      >
        <HelpCircle size={16} /> Replay tour
      </button>
    ) : null;
  }

  // Work out where the card + arrow go relative to the spotlighted element.
  let cardTop: number;
  let cardLeft: number;
  let arrowDir: ArrowDir = "bottom";
  let arrowOffset = 0; // px along the edge, from the card's top-left corner

  if (targetRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceRight = vw - (targetRect.left + targetRect.width);
    const spaceBelow = vh - (targetRect.top + targetRect.height);
    const spaceAbove = targetRect.top;
    const spaceLeft = targetRect.left;

    if (spaceRight >= CARD_W + GAP + EDGE_PAD) {
      arrowDir = "left";
      cardLeft = targetRect.left + targetRect.width + GAP;
      cardTop = Math.min(Math.max(EDGE_PAD, targetRect.top + targetRect.height / 2 - CARD_H_ESTIMATE / 2), vh - CARD_H_ESTIMATE - EDGE_PAD);
      arrowOffset = Math.min(Math.max(20, targetRect.top + targetRect.height / 2 - cardTop), CARD_H_ESTIMATE - 20);
    } else if (spaceBelow >= 180) {
      arrowDir = "top";
      cardTop = targetRect.top + targetRect.height + GAP;
      cardLeft = Math.min(Math.max(EDGE_PAD, targetRect.left + targetRect.width / 2 - CARD_W / 2), vw - CARD_W - EDGE_PAD);
      arrowOffset = Math.min(Math.max(20, targetRect.left + targetRect.width / 2 - cardLeft), CARD_W - 20);
    } else if (spaceAbove >= 180) {
      arrowDir = "bottom";
      cardTop = Math.max(EDGE_PAD, targetRect.top - GAP - CARD_H_ESTIMATE);
      cardLeft = Math.min(Math.max(EDGE_PAD, targetRect.left + targetRect.width / 2 - CARD_W / 2), vw - CARD_W - EDGE_PAD);
      arrowOffset = Math.min(Math.max(20, targetRect.left + targetRect.width / 2 - cardLeft), CARD_W - 20);
    } else if (spaceLeft >= CARD_W + GAP + EDGE_PAD) {
      arrowDir = "right";
      cardLeft = targetRect.left - GAP - CARD_W;
      cardTop = Math.min(Math.max(EDGE_PAD, targetRect.top + targetRect.height / 2 - CARD_H_ESTIMATE / 2), vh - CARD_H_ESTIMATE - EDGE_PAD);
      arrowOffset = Math.min(Math.max(20, targetRect.top + targetRect.height / 2 - cardTop), CARD_H_ESTIMATE - 20);
    } else {
      // Nowhere clean to put it — fall back to centered, no arrow.
      cardTop = vh / 2 - CARD_H_ESTIMATE / 2;
      cardLeft = vw / 2 - CARD_W / 2;
      arrowDir = null as unknown as ArrowDir;
    }
  } else {
    cardTop = window.innerHeight / 2 - CARD_H_ESTIMATE / 2;
    cardLeft = window.innerWidth / 2 - CARD_W / 2;
  }

  const arrowStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = { position: "absolute", width: 12, height: 12, transform: "rotate(45deg)" };
    if (arrowDir === "left") return { ...base, left: -6, top: arrowOffset - 6, borderLeft: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" };
    if (arrowDir === "right") return { ...base, right: -6, top: arrowOffset - 6, borderRight: "1px solid hsl(var(--border))", borderTop: "1px solid hsl(var(--border))" };
    if (arrowDir === "top") return { ...base, top: -6, left: arrowOffset - 6, borderLeft: "1px solid hsl(var(--border))", borderTop: "1px solid hsl(var(--border))" };
    return { ...base, bottom: -6, left: arrowOffset - 6, borderRight: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" };
  })();

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Dimmed scrim with a spotlight cutout around the target */}
      <svg className="absolute inset-0 w-full h-full" onClick={finish} style={{ cursor: "pointer" }}>
        <defs>
          <mask id={`tour-mask-${storageKey}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6} y={targetRect.top - 6}
                width={targetRect.width + 12} height={targetRect.height + 12}
                rx={10} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask={`url(#tour-mask-${storageKey})`} />
      </svg>

      {/* Pulsing highlight ring around the target */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-primary pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 6, left: targetRect.left - 6,
            width: targetRect.width + 12, height: targetRect.height + 12,
            boxShadow: "0 0 0 4px hsl(var(--primary) / 0.2)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-card border border-border rounded-xl shadow-2xl p-5 animate-fade-in"
        style={{ top: cardTop, left: cardLeft, width: CARD_W }}
        onClick={(e) => e.stopPropagation()}
      >
        {arrowDir && <div className="bg-card" style={arrowStyle} />}

        <button
          onClick={finish}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Close tour"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-2 pr-6">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-primary" />
          </div>
          {!isIntro && (
            <span className="text-xs text-muted-foreground">Step {index + 1} of {total}</span>
          )}
        </div>

        <h3 className="text-lg font-bold text-foreground pr-4">{isIntro ? intro?.title : current?.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed pt-1">{isIntro ? intro?.body : current?.body}</p>

        {!isIntro && (
          <div className="flex gap-1 mt-3">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>
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
      </div>
    </div>,
    document.body
  );
}
