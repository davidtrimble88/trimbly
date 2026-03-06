import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye, BarChart3, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const providerFeatures = [
  { icon: Eye, title: "Get Discovered", desc: "Appear in local search results for homeowners near you.", route: "/auth" },
  { icon: TrendingUp, title: "Boost Your Leads", desc: "Upgrade to Pro or Elite tiers for top placement and more leads.", route: "/auth" },
  { icon: BarChart3, title: "Track Performance", desc: "View analytics on profile views, quote requests, and conversion rates.", route: "/auth" },
  { icon: Zap, title: "Instant Boosts", desc: "Purchase one-time boosts to appear at the top of search results.", route: "/auth" },
];

const ForProsSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleClick = (f: typeof providerFeatures[0]) => {
    if (f.route) {
      navigate(f.route);
    } else {
      toast({ title: "Coming Soon", description: `${f.title} is under development. Stay tuned!` });
    }
  };

  return (
    <section id="pros" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">For Service Providers</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">
              Grow your business with HomeHero
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of pros who use HomeHero to find new customers, manage leads, and grow their revenue — with flexible subscription tiers to match your goals.
            </p>
            <Button size="lg" className="gap-2" onClick={() => navigate("/auth")}>
              Join as a Pro
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {providerFeatures.map((f) => (
              <button
                key={f.title}
                onClick={() => handleClick(f)}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg text-left cursor-pointer group"
              >
                <f.icon size={22} className="text-primary mb-3" />
                <h3 className="font-bold text-card-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
                {!f.route && (
                  <span className="inline-block mt-2 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">Coming Soon</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForProsSection;
