import { useNavigate } from "react-router-dom";
import { Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const features = [
  {
    icon: Wrench,
    title: "Find Local Pros",
    description: "Search by service, distance, rating, and availability. Get matched with vetted professionals near you.",
    route: "/search",
  },
  {
    icon: Brain,
    title: "AI Job Estimator",
    description: "Snap a photo, describe the issue, and get instant cost estimates, material lists, and DIY vs. pro recommendations.",
    route: null,
  },
  {
    icon: CalendarCheck,
    title: "Maintenance Autopilot",
    description: "Automated schedules based on your home profile. Never forget an HVAC filter, gutter clean, or seasonal checkup.",
    route: null,
  },
  {
    icon: FolderOpen,
    title: "Digital Home Binder",
    description: "Store appliance info, warranties, past jobs, receipts, and documents — all organized in one dashboard.",
    route: null,
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat directly with pros, share photos, negotiate quotes, and track job status from request to completion.",
    route: null,
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Read honest reviews from real homeowners. Rate your experience and help the community find the best pros.",
    route: "/search",
  },
];

const FeaturesSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleClick = (feature: typeof features[0]) => {
    if (feature.route) {
      navigate(feature.route);
    } else {
      toast({ title: "Coming Soon", description: `${feature.title} is under development. Stay tuned!` });
    }
  };

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            Everything your home needs
          </h2>
          <p className="text-muted-foreground text-lg">
            From finding a plumber to automating your seasonal maintenance — HomeHero has you covered.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <button
              key={f.title}
              onClick={() => handleClick(f)}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg text-left cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-bold text-lg text-card-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              {!f.route && (
                <span className="inline-block mt-3 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">Coming Soon</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
