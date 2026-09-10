import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, BriefcaseBusiness, Car, CheckCircle2, CloudSun, FolderOpen, Home, House, ShieldCheck, ShoppingCart, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import modernHome from "@/assets/landing/trimbly-modern-home.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  const homeCapabilities = [
    { icon: Wrench, label: "Fix it", detail: "Diagnosis · DIY · Cost" },
    { icon: CloudSun, label: "Stay ahead", detail: "Maintenance · Weather · Lifespan" },
    { icon: ShieldCheck, label: "Protect it", detail: "Coverage · Warranties · Insurance" },
    { icon: FolderOpen, label: "Remember it", detail: "Home Binder · Manuals · Receipts · Service history" },
    { icon: Zap, label: "Understand it", detail: "Home Value · Energy · Home Systems" },
    { icon: BriefcaseBusiness, label: "Get help", detail: "Pros · Quotes · Bidding · Messaging · Reviews" },
  ];

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
            <div className="max-w-[680px] pt-4 lg:pt-8">
              <div className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-primary">
                <BrandMark className="h-12 w-12 shadow-[var(--card-shadow)]" />
                <span>One app. Your entire home.</span>
              </div>
              <h1 className="max-w-[680px] text-[2.55rem] font-bold leading-[1.04] text-foreground sm:text-[3.55rem] lg:text-[4.25rem]">
                Everything your home needs.
                <span className="mt-2 block text-primary">All in one place.</span>
              </h1>
              <p className="mt-5 text-lg font-semibold leading-snug text-foreground/85 sm:text-xl">
                Fix it. Maintain it. Protect it. Understand it. Organize it. Find help when you need it.
              </p>
              <p className="mt-4 text-base font-medium leading-relaxed text-foreground/70 md:text-lg">
                <span className="font-bold text-foreground">Tell it what's wrong. It tells you what to do.</span> — just one of the ways Trimbly helps you take care of your home.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
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
                  <div><p className="text-xs font-bold text-primary">MY HOME</p><p className="text-sm font-semibold text-foreground">Trimbly is ready to help</p></div>
                </div>
                <span className="rounded-md bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent-foreground">Home system</span>
              </div>
              <p className="mt-4 text-lg font-bold text-foreground">Water heater making noise</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-secondary p-3"><p className="text-[11px] font-bold text-muted-foreground">LIKELY CAUSE</p><p className="mt-1 text-sm font-semibold text-foreground">Sediment buildup</p></div>
                <div className="rounded-lg bg-success/10 p-3"><p className="text-[11px] font-bold text-success">URGENCY</p><p className="mt-1 text-sm font-semibold text-foreground">Low</p></div>
                <div className="rounded-lg bg-secondary p-3"><p className="text-[11px] font-bold text-muted-foreground">ESTIMATED REPAIR</p><p className="mt-1 text-sm font-semibold text-foreground">$180–$320</p></div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/[0.08] p-3 text-sm text-foreground"><ShieldCheck className="h-4 w-4 text-primary" /><span><strong>Coverage:</strong> Home warranty may apply</span></div>
              <div className="mt-4"><p className="text-[11px] font-bold text-muted-foreground">NEXT STEP</p><p className="mt-1 text-sm leading-relaxed text-foreground">Flush the tank or schedule a professional inspection.</p></div>
              <Button className="mt-4 w-full rounded-lg" onClick={() => navigate("/symptom-triage")}>See What To Do <ArrowRight /></Button>
            </div>
          </div>
        </div>

        <div className="border-b border-border py-8 md:py-10">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="brand-kicker">Whatever your home needs</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Whatever your home needs, start here.</h2>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Home className="h-5 w-5" /> Your Home</div>
          </div>
          <div className="grid border-y border-border sm:grid-cols-2 lg:grid-cols-3">
            {homeCapabilities.map(({ icon: Icon, label, detail }, index) => (
              <div key={label} className={`flex gap-3 py-5 sm:px-5 ${index % 2 === 0 ? "sm:border-r" : ""} ${index < 4 ? "border-b border-border lg:border-b-0" : ""} ${index % 3 !== 2 ? "lg:border-r" : "lg:border-r-0"} ${index === 0 ? "lg:pl-0" : ""}`}>
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div><p className="text-sm font-bold uppercase text-foreground">{label}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-foreground/75">
            <span className="flex items-center gap-2"><Car className="h-4 w-4 text-intelligence" /> Garage</span>
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-intelligence" /> Shopping</span>
            <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-intelligence" /> Rentals</span>
            <span className="flex items-center gap-2"><House className="h-4 w-4 text-intelligence" /> Multiple homes</span>
            <span className="ml-auto hidden items-center gap-2 text-success sm:flex"><CheckCircle2 className="h-4 w-4" /> One place to manage it all</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
