import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Star, Zap, Wrench } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const tiers = [
  {
    name: "Free",
    icon: Star,
    price: "$0",
    cadPrice: "CA$0",
    period: "",
    description: "Get listed and start receiving vehicle jobs",
    features: [
      "Shop / mobile mechanic profile",
      "Appear in My Garage search results",
      "Up to 3 bids per month on vehicle jobs",
      "Customer reviews & ratings",
    ],
    cta: "Get Started Free",
    highlighted: false,
    tier: "free",
  },
  {
    name: "Pro Mechanic",
    icon: Zap,
    price: "$15",
    cadPrice: "CA$21",
    period: "/month",
    description: "More vehicle leads, more bay throughput",
    features: [
      "Everything in Free",
      "Priority placement on Vehicle Jobs board",
      "Verified Mechanic badge",
      "Bid analytics & win-rate insights",
      "Direct messaging with vehicle owners",
      "Shop photo portfolio (up to 20 images)",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
    tier: "pro",
  },
];

const MechanicPricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 inline-flex items-center justify-center gap-2">
              <Wrench size={14} /> For Mechanics & Auto Shops
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 font-display">
              Fill your bays with Trimbly
            </h1>
            <p className="text-muted-foreground text-lg">
              Auto, motorcycle, mobile mechanics & body shops. Choose your plan — upgrade or downgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 border relative ${
                  tier.highlighted
                    ? "border-primary bg-card shadow-xl ring-2 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <tier.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold text-xl text-card-foreground">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mt-3 mb-1">
                  <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground text-sm">{tier.period} USD</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-3">≈ {tier.cadPrice}{tier.period ? ` ${tier.period} CAD` : " CAD"}</p>
                <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-card-foreground">
                      <Check size={16} className="text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  size="lg"
                  onClick={() => navigate(`/mechanic-register?tier=${tier.tier}`)}
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto mt-20 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>
            <div className="text-left space-y-6">
              {[
                { q: "Do I need a shop to join?", a: "No. Independent and mobile mechanics are welcome alongside full shops." },
                { q: "What kinds of vehicles?", a: "Cars, trucks, SUVs, and motorcycles. You pick your specialties at signup." },
                { q: "Can I switch plans later?", a: "Yes. Upgrade or downgrade any time — changes take effect on your next cycle." },
                { q: "Is there a contract?", a: "No contracts. All plans are month-to-month and you can cancel anytime." },
              ].map(faq => (
                <div key={faq.q} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-1">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MechanicPricing;
