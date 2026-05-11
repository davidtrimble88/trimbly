import { Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare, Star, Shield, Briefcase } from "lucide-react";

const features = [
  {
    icon: Wrench,
    title: "Find Local Pros",
    description: "Search by service, distance, rating, and availability. Get matched with vetted professionals near you.",
    tab: "pros",
  },
  {
    icon: Brain,
    title: "AI Job Estimator",
    description: "Snap a photo, describe the issue, and get instant cost estimates, material lists, and DIY vs. pro recommendations.",
    tab: "estimator",
  },
  {
    icon: CalendarCheck,
    title: "Maintenance Autopilot",
    description: "Automated schedules based on your home profile. Never forget an HVAC filter, gutter clean, or seasonal checkup.",
    tab: "maintenance",
  },
  {
    icon: FolderOpen,
    title: "Digital Home Binder",
    description: "Store appliance info, warranties, past jobs, receipts, and documents — all organized in one dashboard.",
    tab: "binder",
  },
  {
    icon: Shield,
    title: "Coverage Advisor",
    description: "Upload your home warranty and insurance docs, then ask AI questions about what's covered and how to file claims.",
    tab: "coverage",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat directly with pros, share photos, negotiate quotes, and track job status from request to completion.",
    tab: "messages",
  },
  {
    icon: Briefcase,
    title: "Job Requests & Bidding",
    description: "Post a job and let pros come to you. Review bids, messages, and credentials — you control who can call.",
    tab: "jobs",
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Read honest reviews from real homeowners. Rate your experience and help the community find the best pros.",
    tab: "pros",
  },
];

const FeaturesSection = () => {
  const handleClick = (feature: typeof features[0]) => {
    window.dispatchEvent(new CustomEvent("how-it-works:set-tab", { detail: feature.tab }));
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
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
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
