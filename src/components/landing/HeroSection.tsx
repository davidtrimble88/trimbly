import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Stethoscope, CheckCircle2, Car,
  CalendarCheck, FolderOpen, Building2, Wrench, Sparkles, BookOpen, Star, CloudSnow,
} from "lucide-react";

const pillars = [
  { icon: Stethoscope, label: "Diagnose" },
  { icon: CalendarCheck, label: "Maintain" },
  { icon: FolderOpen, label: "Track Documents" },
  { icon: Building2, label: "Multiple Homes" },
  { icon: Car, label: "Your Garage" },
  { icon: Wrench, label: "Find Pros" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
      <div className="absolute inset-0 -z-10 bg-[hsl(var(--background))]">
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-primary/[0.06] blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-14 lg:gap-8 items-center">
          {/* Left: copy */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/[0.06] text-primary text-xs font-semibold tracking-wide uppercase mb-7">
              The full home & vehicle management system
            </div>

            <h1 className="font-display text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem] font-semibold text-foreground mb-6 tracking-tight">
              Tell it what's wrong.
              <br />
              It tells you <span className="text-primary italic">what to do</span>.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-7 max-w-lg">
              Trimbly runs your maintenance schedule, stores every warranty and manual,
              checks your insurance coverage, and diagnoses problems before you call
              anyone — for every home you own and every vehicle in the garage. And when
              you do need a pro, one's already vetted.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-7">
              {pillars.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-semibold text-foreground"
                >
                  <p.icon size={13} className="text-primary" /> {p.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-11">
              <Button
                size="lg"
                className="text-base px-7 h-12 gap-2 rounded-lg shadow-[var(--card-shadow)]"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                I have a home <ArrowRight size={18} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-7 h-12 rounded-lg border-2"
                onClick={() => navigate("/pro-pricing")}
              >
                I'm a pro or mechanic
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-primary" /> Checks your real coverage</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-primary" /> DIY steps or vetted pros — your call</span>
            </div>
          </div>

          {/* Right: signature card-stack visual */}
          <div className="relative h-[420px] sm:h-[640px] hidden sm:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-[2rem]" style={{ background: "var(--hero-gradient)" }} />
            <div className="absolute inset-0 rounded-[2rem] opacity-[0.15]" style={{
              backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
              backgroundSize: "22px 22px",
            }} />

            {/* AI-powered badge */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-card/95 text-foreground rounded-full px-3.5 py-1.5 text-xs font-bold shadow-[var(--card-shadow-hover)] flex items-center gap-1.5 z-40">
              <Sparkles size={13} className="text-primary" /> AI-powered, every step
            </div>

            {/* Freeze warning tag (scattered, small) */}
            <div className="absolute top-0 left-0 w-40 bg-card rounded-lg shadow-[var(--card-shadow)] p-2.5 rotate-[-5deg] z-[3]">
              <div className="flex items-center gap-1.5">
                <CloudSnow size={13} className="text-blue-500 shrink-0" />
                <p className="text-[11px] font-semibold text-foreground leading-tight">Freeze warning tonight</p>
              </div>
            </div>

            {/* HERO: Diagnosis card */}
            <div className="absolute top-9 left-0 w-64 bg-card rounded-xl shadow-2xl p-4 rotate-[-7deg] z-30 border-2 border-primary/20">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">AI Diagnosis</p>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Stethoscope size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">Water heater making noise</p>
                  <p className="text-xs text-muted-foreground">Likely sediment buildup — not urgent</p>
                </div>
              </div>
            </div>

            {/* HERO: Coverage check card */}
            <div className="absolute top-6 right-0 w-56 bg-accent text-accent-foreground rounded-xl shadow-2xl p-4 rotate-[7deg] z-[28]">
              <p className="text-xs font-bold uppercase tracking-wide mb-2.5 text-accent-foreground/80">Coverage check</p>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="shrink-0" />
                <span className="text-sm font-bold">Covered by home warranty</span>
              </div>
            </div>

            {/* Multi-home chip (scattered) */}
            <div className="absolute top-32 right-0 w-40 bg-card rounded-lg shadow-[var(--card-shadow)] p-2.5 rotate-[9deg] z-[7]">
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-primary shrink-0" />
                <p className="text-[11px] font-semibold text-foreground leading-tight">3 properties tracked</p>
              </div>
            </div>

            {/* Maintenance schedule card (scattered) */}
            <div className="absolute top-28 left-8 w-52 bg-card rounded-xl shadow-[var(--card-shadow)] p-3.5 rotate-[-11deg] z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarCheck size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">Gutter cleaning</p>
                  <p className="text-[11px] text-muted-foreground">Due in 12 days</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
            </div>

            {/* HERO: DIY vs Pro cost card */}
            <div className="absolute top-[230px] left-1/2 -translate-x-1/2 w-64 bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 rotate-[-2deg] z-[35]">
              <p className="text-xs font-bold uppercase tracking-wide mb-2.5 text-primary-foreground/70">DIY or pro?</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>DIY (parts only)</span>
                  <span className="font-bold">$22</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Hire a pro</span>
                  <span className="font-bold">$180</span>
                </div>
              </div>
            </div>

            {/* Document tracking card (scattered) */}
            <div className="absolute top-64 right-2 w-48 bg-card rounded-xl shadow-[var(--card-shadow)] p-3.5 rotate-[8deg] z-[9]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <FolderOpen size={14} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">6 warranties on file</p>
                  <p className="text-[11px] text-muted-foreground">All in one binder</p>
                </div>
              </div>
            </div>

            {/* Manual finder card (scattered) */}
            <div className="absolute bottom-44 left-0 w-44 bg-card rounded-xl shadow-[var(--card-shadow)] p-3.5 rotate-[-6deg] z-[8]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">Manual found</p>
                  <p className="text-[11px] text-muted-foreground">Whirlpool WRF555 fridge</p>
                </div>
              </div>
            </div>

            {/* Garage vehicle card (scattered) */}
            <div className="absolute bottom-28 right-6 w-48 bg-card rounded-xl shadow-[var(--card-shadow)] p-3.5 rotate-[-8deg] z-[6]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Car size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">2024 Civic<br />87,450 mi</p>
                  <p className="text-[11px] text-muted-foreground">Oil change due soon</p>
                </div>
              </div>
            </div>

            {/* Find a pro card (scattered) */}
            <div className="absolute bottom-16 left-10 w-44 bg-card rounded-xl shadow-[var(--card-shadow)] p-3.5 rotate-[5deg] z-[5]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">Ridge Plumbing</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Star size={10} className="fill-amber-400 text-amber-400" /> 4.9 · Verified
                  </p>
                </div>
              </div>
            </div>

            {/* Works for cars too chip */}
            <div className="absolute bottom-2 right-0 bg-foreground text-background rounded-full px-4 py-2 text-sm font-semibold shadow-2xl flex items-center gap-1.5 rotate-[-3deg] z-[25]">
              <Car size={15} /> Works for your car too
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
