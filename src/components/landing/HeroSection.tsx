import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Wrench, MessageCircle, CheckCircle2 } from "lucide-react";

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
              Built by people who've worked in home services
            </div>

            <h1 className="font-display text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem] font-semibold text-foreground mb-6 tracking-tight">
              Your home,
              <br />
              <span className="text-primary italic">actually</span> handled.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-9 max-w-lg">
              Trimbly runs the maintenance schedule, tracks every warranty, and answers
              "what's wrong with this" before you ever need to call anyone. When you do
              need a pro, we've already vetted one nearby.
            </p>

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
              <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-primary" /> Background-checked pros</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-primary" /> No lead fees, ever</span>
            </div>
          </div>

          {/* Right: signature card-stack visual */}
          <div className="relative h-[420px] sm:h-[460px] hidden sm:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-[2rem]" style={{ background: "var(--hero-gradient)" }} />
            <div className="absolute inset-0 rounded-[2rem] opacity-[0.15]" style={{
              backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
              backgroundSize: "22px 22px",
            }} />

            {/* Maintenance card */}
            <div className="absolute top-10 left-6 w-64 bg-card rounded-xl shadow-[var(--card-shadow-hover)] p-4 rotate-[-6deg]">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Water heater flush</p>
                  <p className="text-xs text-muted-foreground">Due in 12 days</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
            </div>

            {/* Quote comparison card */}
            <div className="absolute top-6 right-2 w-56 bg-card rounded-xl shadow-[var(--card-shadow-hover)] p-4 rotate-[4deg]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Quotes in</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Ridge Plumbing</span>
                  <span className="font-semibold text-foreground">$240</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Cascade Co.</span>
                  <span className="font-semibold text-foreground">$275</span>
                </div>
              </div>
            </div>

            {/* Chat card */}
            <div className="absolute bottom-8 left-16 w-60 bg-card rounded-xl shadow-[var(--card-shadow-hover)] p-4 rotate-[3deg]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <MessageCircle size={14} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-foreground">Marcus, Ridge Plumbing</p>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                "I can come by Thursday afternoon — does 2pm work?"
              </p>
            </div>

            {/* Verified badge chip */}
            <div className="absolute bottom-4 right-6 bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-semibold shadow-[var(--card-shadow-hover)] flex items-center gap-1.5 rotate-[-3deg]">
              <ShieldCheck size={15} /> Verified
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
