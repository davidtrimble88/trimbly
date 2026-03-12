import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare, Star, Lock, Crown } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const allServices = [
  {
    icon: Wrench,
    title: "Find Local Pros",
    description: "Search by service, distance, rating, and availability.",
    route: "/search",
    minTier: "free",
  },
  {
    icon: Brain,
    title: "AI Job Estimator",
    description: "Get instant cost estimates, material lists, and DIY vs. pro recommendations.",
    route: "/estimator",
    minTier: "pro",
  },
  {
    icon: CalendarCheck,
    title: "Maintenance Autopilot",
    description: "Automated schedules based on your home profile.",
    route: "/maintenance",
    minTier: "free",
  },
  {
    icon: FolderOpen,
    title: "Digital Home Binder",
    description: "Store appliance info, warranties, past jobs, and documents.",
    route: "/binder",
    minTier: "free",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat directly with pros, share photos, and track job status.",
    route: null,
    minTier: "pro",
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Read and leave honest reviews from real homeowners.",
    route: "/search",
    minTier: "free",
  },
];

const tierOrder: Record<string, number> = { free: 0, pro: 1, multi_pro: 2 };
const tierLabels: Record<string, string> = { free: "Free", pro: "Homeowner Pro", multi_pro: "Multi-Homeowner Pro" };

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, profileName } = useAuth();
  const { subscriptionTier, maxHomes, maxBinderItems, loading: limitLoading } = useHomeLimit();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || limitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const userTierLevel = tierOrder[subscriptionTier] ?? 0;
  const displayName = profileName || user.user_metadata?.full_name || user.email;

  const isUnlocked = (minTier: string) => userTierLevel >= (tierOrder[minTier] ?? 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
              Welcome back, {displayName}
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <Crown size={14} className="mr-1.5 text-primary" />
                {tierLabels[subscriptionTier] ?? "Free"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {maxHomes} home{maxHomes !== 1 ? "s" : ""} · {maxBinderItems === Infinity ? "Unlimited" : maxBinderItems} binder items
              </span>
            </div>
          </div>

          {/* Service Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allServices.map((service) => {
              const unlocked = isUnlocked(service.minTier);
              const comingSoon = !service.route;

              return (
                <Card
                  key={service.title}
                  className={`relative transition-all duration-200 ${
                    unlocked && !comingSoon
                      ? "hover:border-primary/30 hover:shadow-lg cursor-pointer"
                      : "opacity-60"
                  }`}
                >
                  {!unlocked && (
                    <div className="absolute top-4 right-4">
                      <Lock size={18} className="text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <service.icon size={24} className="text-primary" />
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comingSoon ? (
                      <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
                    ) : unlocked ? (
                      <Button onClick={() => navigate(service.route!)} className="w-full">
                        Open
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                        Upgrade to Unlock
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
