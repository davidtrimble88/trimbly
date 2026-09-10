import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleDollarSign, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import modernHome from "@/assets/landing/trimbly-modern-home.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden border-b border-border bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1500px] px-4 pb-14 sm:px-6 md:pb-20 lg:px-8">
        <div className="relative min-h-[660px] overflow-hidden rounded-[1.75rem] bg-secondary lg:min-h-[710px]">
          <img
            src={modernHome}
            alt="A welcoming modern home in warm morning light"
            width={1536}
            height={1024}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background)/0.96)_34%,hsl(var(--background)/0.38)_65%,transparent_100%)]" />

          <div className="relative z-10 flex min-h-[660px] flex-col justify-between p-6 sm:p-10 lg:min-h-[710px] lg:p-14">
            <div className="max-w-[650px] pt-4 lg:pt-10">
              <div className="mb-7 flex items-center gap-3 text-sm font-bold text-primary">
                <BrandMark className="h-12 w-12 shadow-[var(--card-shadow)]" />
                <span>Meet the home assistant that remembers everything.</span>
              </div>
              <h1 className="max-w-[640px] text-[2.65rem] font-bold leading-[1.02] text-foreground sm:text-6xl lg:text-[4.6rem]">
                TELL IT WHAT'S WRONG.
                <span className="mt-2 block text-primary">IT TELLS YOU WHAT TO DO.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/75 md:text-xl">
                AI-powered maintenance, diagnosis, records, coverage and trusted pros — all in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="h-12 rounded-lg px-6 text-base shadow-[var(--brand-shadow)]" onClick={() => navigate("/auth?mode=signup&type=homeowner")}>
                  Get Started Free <ArrowRight />
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-lg bg-card/90 px-6 text-base" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                  See How It Works
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-foreground/70">
                <button onClick={() => navigate("/pro-pricing")} className="transition-colors hover:text-primary">For service providers <ArrowRight className="inline h-3.5 w-3.5" /></button>
                <button onClick={() => navigate("/mechanic-pricing")} className="transition-colors hover:text-primary">For mechanics <ArrowRight className="inline h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="mt-12 w-full max-w-md self-end rounded-2xl border border-card/70 bg-card/95 p-5 shadow-[var(--product-shadow)] backdrop-blur-sm lg:absolute lg:bottom-10 lg:right-10 lg:mt-0">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <BrandMark className="h-9 w-9" />
                  <div><p className="text-xs font-bold text-primary">TRIMBLY SAYS</p><p className="text-sm font-semibold text-foreground">Your home</p></div>
                </div>
                <span className="rounded-md bg-success/10 px-2.5 py-1 text-xs font-bold text-success">Low urgency</span>
              </div>
              <p className="mt-4 text-lg font-bold text-foreground">Water heater making noise</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary p-3"><p className="text-[11px] font-bold text-muted-foreground">LIKELY CAUSE</p><p className="mt-1 text-sm font-semibold text-foreground">Sediment buildup</p></div>
                <div className="rounded-lg bg-secondary p-3"><p className="text-[11px] font-bold text-muted-foreground">ESTIMATED REPAIR</p><p className="mt-1 text-sm font-semibold text-foreground">$180–$320</p></div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/8 p-3 text-sm text-foreground"><ShieldCheck className="h-4 w-4 text-primary" /><span>Home warranty may apply</span></div>
              <div className="mt-4"><p className="text-[11px] font-bold text-muted-foreground">NEXT STEP</p><p className="mt-1 text-sm leading-relaxed text-foreground">Flush the tank or schedule a professional inspection.</p></div>
              <Button className="mt-4 w-full rounded-lg" onClick={() => navigate("/symptom-triage")}>See What To Do <ArrowRight /></Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border py-8 sm:grid-cols-3">
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground"><Sparkles className="text-primary" /> Understand the problem first</div>
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground"><CircleDollarSign className="text-blue" /> Know the cost before you spend</div>
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground"><CheckCircle2 className="text-success" /> DIY or hire — you decide</div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;