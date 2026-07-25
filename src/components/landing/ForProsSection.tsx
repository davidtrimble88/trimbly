import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, Sparkles, Home, Hammer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const providerFeatures = [
  { icon: DollarSign, title: "0% Commission, Ever", desc: "Keep 100% of every job. Trimbly charges a flat subscription — never a cut of your earnings.", route: "/pro-pricing" },
  { icon: Sparkles, title: "AI Runs Your Follow-Ups", desc: "Message Copilot drafts your replies, and AI automatically nudges leads who've gone quiet.", route: "/pro-pricing" },
  { icon: Home, title: "Free SEO Microsite", desc: "Your own page at trimbly.com/pros/you, built to rank in Google for your service area — plus yard sign QR codes.", route: "/pro-pricing" },
  { icon: Hammer, title: "Rent Out Your Equipment", desc: "List tools between jobs and earn extra with e-signed rental agreements, fully archived.", route: "/pro-pricing" },
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
              Real leads. Real AI tools. 0% commission.
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Trimbly isn't a lead-gen site that takes a cut of every job. It's an AI
              copilot that drafts your replies, follows up on quiet leads, and builds
              your local SEO presence — while you keep every dollar you earn.
            </p>
            <Button size="lg" className="gap-2" onClick={() => navigate("/pro-pricing")}>
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
