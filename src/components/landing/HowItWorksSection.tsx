import { useNavigate } from "react-router-dom";
import { Search, FileText, MessageSquare, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Describe Your Job",
    description: "Tell us what you need — or let our AI analyze a photo and suggest the right service.",
    route: "/search",
  },
  {
    icon: FileText,
    step: "02",
    title: "Get Instant Quotes",
    description: "Receive AI-powered estimates and compare quotes from verified local pros.",
    route: "/estimator",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Chat & Schedule",
    description: "Message pros directly, agree on timing and price, and book your appointment.",
    route: null,
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Job Done, Review Left",
    description: "Get the work done by a trusted pro, then leave a review to help others.",
    route: null,
  },
];

const HowItWorksSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleClick = (step: typeof steps[0]) => {
    if (step.route) {
      navigate(step.route);
    } else {
      toast({ title: "Coming Soon", description: `${step.title} is under development. Stay tuned!` });
    }
  };

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            From problem to solved in 4 steps
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <button
              key={s.step}
              onClick={() => handleClick(s)}
              className="relative text-center cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                <s.icon size={28} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Step {s.step}</span>
              <h3 className="font-bold text-lg text-foreground mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              {!s.route && (
                <span className="inline-block mt-3 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">Coming Soon</span>
              )}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-border" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
