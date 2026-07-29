import { useNavigate } from "react-router-dom";
import {
  Lock, CalendarCheck, FolderOpen, Shield, Stethoscope, Zap,
  Wrench, Briefcase, Star, Hammer, Brain, BookOpen, MessageSquare, TrendingUp,
  Activity, AlertTriangle, FileWarning,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tierOrder } from "./types";

type ServiceCategory = "home_care" | "get_help" | "tools" | "communication";

const allServices: Array<{
  icon: any; title: string; description: string; route: string; minTier: string; group: ServiceCategory;
}> = [
  { icon: CalendarCheck, title: "Maintenance Autopilot", description: "Automated, personalized maintenance schedules for your home.", route: "/maintenance", minTier: "free", group: "home_care" },
  { icon: FolderOpen, title: "Digital Home Binder", description: "Store appliance info, warranties, and documents.", route: "/binder", minTier: "homeowner_pro", group: "home_care" },
  { icon: Shield, title: "Coverage Advisor", description: "Upload warranty & insurance docs and ask AI about your coverage.", route: "/coverage", minTier: "homeowner_pro", group: "home_care" },
  { icon: Stethoscope, title: "AI Symptom Triage", description: "Describe a noise, smell, or issue — get instant diagnosis, urgency, and DIY vs. pro guidance.", route: "/symptom-triage", minTier: "homeowner_pro", group: "home_care" },
  { icon: Zap, title: "Energy & Utility Advisor", description: "AI-prioritized upgrades with real cost, savings, and payback numbers.", route: "/energy-advisor", minTier: "homeowner_pro", group: "home_care" },
  { icon: TrendingUp, title: "Home Value Advisor", description: "Planning a bigger upgrade or renovation? See if it pays off at resale, with a full cost and DIY vs. pro breakdown.", route: "/value-advisor", minTier: "homeowner_pro", group: "home_care" },
  { icon: Activity, title: "System Lifespan Tracker", description: "See what's aging out before it breaks, based on purchase dates already in your Home Binder.", route: "/systems", minTier: "homeowner_pro", group: "home_care" },
  { icon: AlertTriangle, title: "Emergency Home Info Card", description: "Water, gas, and electrical shutoff locations plus emergency contacts — one printable card per home.", route: "/emergency-info", minTier: "homeowner_pro", group: "home_care" },

  { icon: Wrench, title: "Find Local Pros", description: "Search by service, distance, rating, and availability.", route: "/search", minTier: "free", group: "get_help" },
  { icon: Briefcase, title: "Post a Job", description: "Post job requests for pros to bid on.", route: "/post-job", minTier: "free", group: "get_help" },
  { icon: Star, title: "Verified Reviews", description: "Read honest reviews from real homeowners.", route: "/search", minTier: "free", group: "get_help" },
  { icon: Hammer, title: "Equipment Rentals", description: "Browse tools & equipment from local pros. Sign waivers and message owners in-app.", route: "/equipment", minTier: "free", group: "get_help" },
  { icon: FileWarning, title: "Quote & Contract Reviewer", description: "Paste a contractor's quote or contract and get an instant red-flag check before you sign.", route: "/quote-reviewer", minTier: "homeowner_pro", group: "get_help" },

  { icon: Brain, title: "AI Job Estimator", description: "Instant cost estimate for a specific repair or small project — materials, time, and DIY vs. pro guidance.", route: "/estimator", minTier: "homeowner_pro", group: "tools" },
  { icon: BookOpen, title: "User Manual Finder", description: "Enter brand & model — instantly find and download the user manual.", route: "/manual-search", minTier: "free", group: "tools" },

  { icon: MessageSquare, title: "In-App Messaging", description: "Chat directly with pros, share photos, and track jobs.", route: "/messages", minTier: "free", group: "communication" },
];

const groupTitles: Record<ServiceCategory, string> = {
  home_care: "Home Care",
  get_help: "Get Help",
  tools: "Tools",
  communication: "Communication",
};

interface HomeToolsTabProps {
  subscriptionTier: string;
}

const HomeToolsTab = ({ subscriptionTier }: HomeToolsTabProps) => {
  const navigate = useNavigate();
  const userTierLevel = tierOrder[subscriptionTier] ?? 0;
  const isUnlocked = (minTier: string) => userTierLevel >= (tierOrder[minTier] ?? 0);

  return (
    <div className="space-y-8">
      {(Object.keys(groupTitles) as ServiceCategory[]).map((group) => {
        const items = allServices.filter((s) => s.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <h2 className="text-lg font-bold text-foreground mb-3">{groupTitles[group]}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((service) => {
                const unlocked = isUnlocked(service.minTier);
                const comingSoon = !service.route;
                return (
                  <button
                    key={service.title}
                    onClick={() => (unlocked && !comingSoon ? navigate(service.route!) : navigate("/#pricing"))}
                    className={`group relative text-left rounded-lg border border-border bg-card p-4 transition-all ${
                      unlocked && !comingSoon
                        ? "hover:border-primary/40 hover:shadow-sm"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {!unlocked && (
                      <Lock size={14} className="absolute top-3 right-3 text-muted-foreground" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <service.icon size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground">{service.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</div>
                        {!unlocked && (
                          <div className="text-xs text-primary mt-2 font-medium">Upgrade to unlock →</div>
                        )}
                        {comingSoon && (
                          <Badge variant="outline" className="text-xs mt-2">Coming Soon</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HomeToolsTab;
