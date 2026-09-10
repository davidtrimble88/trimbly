import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, CalendarCheck, Car, Check, CloudRain, CloudSnow, FileText, FolderOpen, Home, House, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import waterHeater from "@/assets/landing/trimbly-water-heater.jpg";
import binderPhoto from "@/assets/landing/trimbly-home-binder.jpg";
import garagePhoto from "@/assets/landing/trimbly-home-garage.jpg";

const journey = [
  ["01", "Understand the problem", "Describe a strange noise, leak, smell, warning, or maintenance issue. Trimbly identifies what may be happening and how urgent it is."],
  ["02", "Know what it costs", "See a realistic range, materials, labor expectations, and DIY-vs-pro guidance before you spend money."],
  ["03", "Know what's covered", "Store warranties and insurance documents, then ask Trimbly what may be covered and how to approach a claim."],
  ["04", "Decide DIY or pro", "Follow clear guidance yourself or connect with a trusted local professional who already understands the project."],
];

const HomeJourneySection = () => {
  const navigate = useNavigate();

  return (
    <>
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-14 max-w-3xl">
            <p className="brand-kicker">Your home comes first</p>
            <h2 className="brand-title mt-4">Your home has a lot to remember.<br />Now it doesn't all have to live in your head.</h2>
          </div>
          <div className="grid border-y border-border lg:grid-cols-4">
            {journey.map(([number, title, copy]) => (
              <article key={number} className="border-b border-border py-8 lg:border-b-0 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0">
                <span className="text-sm font-bold text-primary">{number}</span>
                <h3 className="mt-5 text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-20 md:py-28">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-2xl">
            <img src={waterHeater} alt="A homeowner using Trimbly while checking a water heater" width={1408} height={1024} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-card/60 bg-card/95 p-4 shadow-[var(--product-shadow)] sm:left-auto sm:w-72">
              <div className="flex items-center gap-2"><BrandMark className="h-8 w-8" /><p className="text-xs font-bold text-primary">DON'T WORRY.</p></div>
              <p className="mt-2 text-sm font-semibold text-foreground">Here's what I'd check first.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Turn off power, let the tank cool, then check for sediment popping.</p>
            </div>
          </div>
          <div>
              <p className="brand-kicker">What's wrong?</p>
              <h2 className="brand-title mt-4">Start with what you notice.</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Ask the questions that come up in real life. Trimbly uses intelligent guidance to answer in plain language, with the context of your home behind it.</p>
            <div className="mt-8 space-y-3">
              {["Why is my water heater making this noise?", "Is this covered by my warranty?", "How much should this repair cost?", "Should I fix this myself?", "What should I maintain this month?"].map((q) => (
                <button key={q} onClick={() => navigate("/symptom-triage")} className="flex w-full items-center justify-between border-b border-border py-3 text-left font-semibold text-foreground transition-colors hover:text-primary">“{q}” <ArrowRight className="h-4 w-4 shrink-0" /></button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="brand-kicker">Your home. Under control.</p>
              <h2 className="brand-title mt-4">See what matters today — and what's coming next.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Maintenance, weather, aging systems and emergency information come together around the place that matters most: your home.</p>
              <Button variant="outline" size="lg" className="mt-7 rounded-lg" onClick={() => navigate("/auth")}>See My Home <ArrowRight /></Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--product-shadow)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-6">
                <div className="flex items-center gap-3"><BrandMark className="h-11 w-11" /><div><p className="text-xs font-bold text-primary">GOOD MORNING</p><h3 className="mt-1 text-2xl font-bold text-foreground">Your Home</h3><p className="text-sm text-muted-foreground">3 things need attention</p></div></div>
                <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-bold text-success"><Activity className="h-4 w-4" /> Looking good</div>
              </div>
              <div className="grid md:grid-cols-[1.15fr_0.85fr]">
                <div className="divide-y divide-border p-6">
                  {[[CalendarCheck, "HVAC filter", "Due in 12 days", "bg-warning/10", "text-warning"], [Wrench, "Gutters", "Due this week", "bg-primary/10", "text-primary"], [CloudSnow, "Freeze warning", "Tonight", "bg-intelligence/10", "text-intelligence"], [Activity, "Water heater", "Looking good", "bg-success/10", "text-success"]].map(([Icon, title, detail, backgroundClass, iconClass]) => {
                    const I = Icon as typeof CalendarCheck;
                    return <div key={title as string} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><div className={`rounded-lg p-2.5 ${backgroundClass as string}`}><I className={`h-5 w-5 ${iconClass as string}`} /></div><div className="min-w-0 flex-1"><p className="font-bold text-foreground">{title as string}</p><p className="text-sm text-muted-foreground">{detail as string}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>;
                  })}
                </div>
                <div className="m-4 rounded-xl border border-primary/20 bg-primary/[0.07] p-5 md:m-6 md:ml-0">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary"><BrandMark className="h-8 w-8" /> TRIMBLY SAYS</div>
                  <h4 className="mt-5 text-xl font-bold text-foreground">Your home has 3 things to take care of this week.</h4>
                  <div className="mt-4 divide-y divide-primary/15 text-sm">
                    <div className="flex gap-3 py-3 first:pt-0"><CalendarCheck className="h-4 w-4 shrink-0 text-primary" /><p><strong className="text-foreground">HVAC filter</strong><span className="block text-muted-foreground">Due Thursday</span></p></div>
                    <div className="flex gap-3 py-3"><CloudRain className="h-4 w-4 shrink-0 text-intelligence" /><p><strong className="text-foreground">Gutters</strong><span className="block text-muted-foreground">Rain coming Friday</span></p></div>
                    <div className="flex gap-3 py-3 last:pb-0"><Activity className="h-4 w-4 shrink-0 text-success" /><p><strong className="text-foreground">Water heater</strong><span className="block text-muted-foreground">Check expected lifespan</span></p></div>
                  </div>
                  <Button className="mt-6 w-full rounded-lg" onClick={() => navigate("/maintenance")}>See What To Do</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary py-20 md:py-28">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="brand-kicker">Digital Home Binder</p>
            <h2 className="brand-title mt-4">THE MEMORY OF YOUR HOME.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Your home has a lot to remember. Trimbly remembers it for you — warranties, receipts, manuals, service history, projects, appliances and maintenance records, organized for the life of your home.</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm font-semibold text-foreground">
              {["Warranties", "Receipts", "Manuals", "Service history", "Projects", "Important documents"].map((item) => <div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{item}</div>)}
            </div>
            <Button className="mt-8 rounded-lg" onClick={() => navigate("/binder")}>Explore Home Binder <ArrowRight /></Button>
          </div>
          <div className="relative">
            <img src={binderPhoto} alt="A homeowner organizing house records in a bright kitchen" width={1408} height={1024} loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
            <div className="absolute -bottom-6 left-4 right-4 rounded-xl border border-border bg-card p-4 shadow-[var(--product-shadow)] sm:left-8 sm:right-8">
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><BrandMark className="h-8 w-8" /><p className="text-xs font-bold text-primary">MY HOME BINDER</p></div><span className="text-xs text-muted-foreground">Everything in its place</span></div>
              <div className="grid grid-cols-3 gap-2"><div className="rounded-lg bg-secondary p-3"><FileText className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-bold">Water Heater</p><p className="text-[11px] text-muted-foreground">2021 · Warranty</p></div><div className="rounded-lg bg-secondary p-3"><FolderOpen className="h-4 w-4 text-intelligence" /><p className="mt-2 text-xs font-bold">HVAC</p><p className="text-[11px] text-muted-foreground">2022 · Manual</p></div><div className="rounded-lg bg-secondary p-3"><ShieldCheck className="h-4 w-4 text-success" /><p className="mt-2 text-xs font-bold">Roof</p><p className="text-[11px] text-muted-foreground">2019 · Documents</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--card-shadow)] lg:grid-cols-[1.05fr_0.95fr]">
            <img src={garagePhoto} alt="A vehicle parked in a bright, organized home garage" width={1408} height={1024} loading="lazy" className="h-full min-h-[360px] w-full object-cover" />
            <div className="flex items-center p-7 sm:p-10 lg:p-12">
              <div>
                <p className="text-sm font-bold text-primary">YOUR HOME. YOUR GARAGE. ONE TRIMBLY.</p>
                <h2 className="mt-4 text-4xl font-bold leading-tight text-foreground">The same smart care extends to everything you drive.</h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Service history, maintenance, insurance, warranties, diagnosis, cost estimates, parts and trusted mechanics — organized in My Garage.</p>
                <div className="mt-6 flex flex-wrap gap-2 text-sm text-foreground">{["Maintenance", "Coverage", "Cost estimates", "Service history", "Trusted mechanics"].map((x) => <span key={x} className="rounded-md bg-secondary px-3 py-2">{x}</span>)}</div>
                <Button size="lg" className="mt-8 rounded-lg" onClick={() => navigate("/garage/upsell")}>Explore My Garage <Car /> </Button>
                <p className="mt-3 text-xs text-muted-foreground">Optional $3.99/month add-on. Stacks on any plan, including Free.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary py-20 md:py-28">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-card p-7 shadow-[var(--card-shadow)] md:p-10">
            <p className="brand-kicker">My properties</p>
            <h2 className="mt-4 text-3xl font-bold text-foreground">One view for every place you call home.</h2>
            <p className="mt-4 text-muted-foreground">See each home individually or understand everything across your properties at once.</p>
            <div className="mt-8 space-y-3">{[[Home, "Home", "Primary residence"], [House, "Lake House", "Vacation home"], [Home, "Maple Street", "Rental property"]].map(([Icon, title, subtitle], i) => { const I = Icon as typeof Home; return <div key={title as string} className={`flex items-center gap-4 rounded-lg border p-4 ${i === 0 ? "border-primary bg-primary/5" : "border-border"}`}><I className="text-primary" /><div className="flex-1"><p className="font-bold text-foreground">{title as string}</p><p className="text-xs text-muted-foreground">{subtitle as string}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>; })}</div>
          </div>
          <div className="rounded-2xl bg-card p-7 shadow-[var(--card-shadow)] md:p-10">
            <p className="brand-kicker">Before an emergency</p>
            <h2 className="mt-4 text-3xl font-bold text-foreground">One card everyone in the home can use.</h2>
            <p className="mt-4 text-muted-foreground">Keep water, gas and electrical shutoff locations plus emergency contacts ready when seconds count.</p>
            <div className="mt-8 rounded-xl border border-warning/30 bg-warning/5 p-5">
              <div className="flex items-center gap-3"><AlertTriangle className="text-warning" /><div><p className="text-xs font-bold text-warning">EMERGENCY INFO</p><p className="font-bold text-foreground">Primary Home</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{["Water shutoff", "Gas shutoff", "Electrical panel", "Emergency contacts"].map((x) => <div key={x} className="rounded-lg bg-card p-3 text-sm font-semibold text-foreground">{x}</div>)}</div>
            </div>
            <Button variant="outline" className="mt-6 rounded-lg" onClick={() => navigate("/emergency-info")}>Create My Card <ArrowRight /></Button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="brand-kicker">Know what you need before you call</p>
            <h2 className="brand-title mt-4">Get help without giving up control.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Start with your Trimbly diagnosis and estimated cost. Then choose clear DIY guidance or share a well-defined project with trusted local professionals.</p>
            <Button className="mt-8 rounded-lg" onClick={() => navigate("/search")}>Find a Trusted Pro <ArrowRight /></Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--product-shadow)]">
            <div className="flex items-center gap-3 border-b border-border pb-5"><BrandMark className="h-10 w-10" /><div><p className="text-xs font-bold text-primary">YOUR PROJECT</p><p className="font-bold text-foreground">Water heater inspection</p></div></div>
            <div className="grid gap-3 py-5 sm:grid-cols-3"><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Diagnosis</p><p className="mt-1 text-sm font-bold">Sediment buildup</p></div><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Estimate</p><p className="mt-1 text-sm font-bold">$180–$320</p></div><div className="rounded-lg bg-success/10 p-3"><p className="text-xs text-success">Status</p><p className="mt-1 text-sm font-bold text-success">Ready for bids</p></div></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2"><Wrench className="text-primary" /></div><div><p className="font-bold text-foreground">Ridge Plumbing</p><p className="text-xs text-muted-foreground">Verified · Replies in under 1 hr</p></div></div><span className="font-bold text-foreground">$240</span></div>
            <p className="mt-4 text-xs text-muted-foreground">Message first. Your phone number stays private until you approve a call.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomeJourneySection;