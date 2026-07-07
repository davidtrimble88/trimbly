import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Wrench, FileText, Bell, Bike, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { startGarageCheckout } from "@/lib/billing";

export default function GarageUpsell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const MONTHLY_PRICE = 3.99;
  const YEARLY_PRICE = 29;
  const yearlySavingsPct = Math.round((1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100);

  const startTrial = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setActivating(true);
    const { url, error } = await startGarageCheckout(billingInterval);
    setActivating(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (url) window.location.href = url;
  };

  const PlanToggle = () => (
    <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1">
      <button
        type="button"
        onClick={() => setBillingInterval("monthly")}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${billingInterval === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
      >
        Monthly · ${MONTHLY_PRICE}/mo
      </button>
      <button
        type="button"
        onClick={() => setBillingInterval("yearly")}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${billingInterval === "yearly" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
      >
        Yearly · ${YEARLY_PRICE}/yr
        <span className="text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
          Save {yearlySavingsPct}%
        </span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="bg-gradient-to-br from-foreground via-foreground to-foreground/90 text-background">
          <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-4">
              <Car size={14} /> Optional Add-On
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-tight mb-4">
              My Garage
            </h1>
            <p className="text-lg md:text-xl text-background/80 max-w-2xl mb-8">
              The same hassle-free maintenance tracking you love for your home — now for your cars and motorcycles.
              Service history, smart reminders, documents, and nearby mechanics in one place.
            </p>
            <div className="mb-5">
              <PlanToggle />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={startTrial} disabled={activating} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {activating ? "Redirecting…" : "Start 14-day free trial"}
              </Button>
              <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10" asChild>
                <a href="#features">See what's inside</a>
              </Button>
            </div>
            <p className="text-xs text-background/60 mt-4">
              {billingInterval === "monthly" ? `$${MONTHLY_PRICE}/mo` : `$${YEARLY_PRICE}/yr`} after your 14-day trial. Cancel anytime.
            </p>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-16 max-w-5xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Built for cars & bikes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Car, title: "Your Vehicles", body: "Cars, trucks, and motorcycles — VIN, plate, mileage, photo, the works." },
              { icon: Wrench, title: "Service Log", body: "Every oil change, brake job, chain lube. Costs, shops, receipts." },
              { icon: Bell, title: "Smart Reminders", body: "Mileage- and time-based alerts so you never miss an interval." },
              { icon: FileText, title: "Documents", body: "Registration, insurance, title, manuals — encrypted and ready when you need them." },
              { icon: Bike, title: "Motorcycle-aware", body: "Chain, valve adjust, sprocket — bike intervals out of the box." },
              { icon: CheckCircle2, title: "Find a Mechanic", body: "Search Trimbly's auto and motorcycle pros, message-first." },
            ].map((f) => (
              <Card key={f.title} className="bg-card">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <f.icon size={20} />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold mb-3">Add it to your account</h2>
          <p className="text-muted-foreground mb-6">
            My Garage stacks on top of any Trimbly plan, including Free. Cancel any time from your dashboard.
          </p>
          <div className="mb-5 flex justify-center">
            <PlanToggle />
          </div>
          <Button size="lg" onClick={startTrial} disabled={activating}>
            {activating ? "Redirecting…" : `Start free trial — then $${billingInterval === "monthly" ? MONTHLY_PRICE + "/mo" : YEARLY_PRICE + "/yr"}`}
          </Button>
          {!user && (
            <p className="text-xs text-muted-foreground mt-3">
              <Link to="/auth" className="underline">Sign in</Link> first, then activate.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
