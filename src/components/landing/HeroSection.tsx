import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Stethoscope, CheckCircle2, Car,
  CalendarCheck, FolderOpen, Building2, Wrench,
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
          <div className="relative h-[420px] sm:h-[460px] hidden sm:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-[2rem]" style={{ background: "var(--hero-gradient)" }} />
            <div className="absolute inset-0 rounded-[2rem] opacity-[0.15]" style={{
              backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
              backgroundSize: "22px 22px",
            }} />

            {/* Diagnosis card */}
            <div className="absolute top-10 left-6 w-64 bg-card rounded-xl shadow-[var(--card-shadow-hover)] p-4 rotate-[-6deg]">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Stethoscope size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Water heater making noise</p>
                  <p className="text-xs text-muted-foreground">Likely sediment buildup — not urgent</p>
                </div>
              </div>
            </div>

            {/* Coverage check card */}
            <div className="absolute top-6 right-2 w-56 bg-card rounded-xl shadow-[var(--card-shadow-hover)] p-4 rotate-[4deg]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Coverage check</p>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-accent shrink-0" />
                <span className="text-sm font-semibold text-foreground">Covered by home warranty</span>
              </div>
            </div>

            {/* DIY vs Pro cost card */}
            <div className="absolute bottom-8 left-16 w-60 bg-card rounded-xl shadow-[var(--card-shadow-hover)] p-4 rotate-[3deg]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">DIY or pro?</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">DIY (parts only)</span>
                  <span className="font-semibold text-foreground">$22</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Hire a pro</span>
                  <span className="font-semibold text-foreground">$180</span>
                </div>
              </div>
            </div>

            {/* Works for cars too chip */}
            <div className="absolute bottom-4 right-6 bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-semibold shadow-[var(--card-shadow-hover)] flex items-center gap-1.5 rotate-[-3deg]">
              <Car size={15} /> Works for your car too
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
