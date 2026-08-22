import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Minus, HelpCircle, Loader2, Crown,
  DollarSign, Percent, Clock, HardHat, Wrench, Lightbulb,
  ShieldCheck, AlertTriangle, FileWarning, ClipboardList, ChevronRight, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getQuickValueEstimate, getDetailedValueEstimate,
  type QuickValueEstimate, type DetailedValueEstimate, type ValueVerdict,
} from "@/lib/api/homeValueAdvisor";

type HomeOption = { id: string; name: string; home_type: string; year_built: number | null; square_feet: number | null; city: string; state: string };

const verdictMeta: Record<ValueVerdict, { label: string; icon: typeof TrendingUp; className: string }> = {
  increases_value: { label: "Likely Increases Value", icon: TrendingUp, className: "border-primary/20 bg-primary/5 text-primary" },
  neutral: { label: "Likely Neutral", icon: Minus, className: "border-border bg-muted/40 text-muted-foreground" },
  decreases_value: { label: "May Decrease Value", icon: TrendingDown, className: "border-destructive/20 bg-destructive/5 text-destructive" },
  depends: { label: "It Depends", icon: HelpCircle, className: "border-accent/20 bg-accent/5 text-accent" },
};

const recommendationLabel: Record<string, string> = { diy: "DIY", pro_recommended: "Hire a Pro", either: "DIY or Pro" };
const recommendationClass: Record<string, string> = {
  diy: "bg-primary/10 text-primary",
  pro_recommended: "bg-accent/10 text-accent",
  either: "bg-secondary text-secondary-foreground",
};

const HomeValueAdvisor = () => {
  const { user, profileName, loading: authLoading } = useAuth();
  const { isPro, subscriptionTier, loading: limitLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [homes, setHomes] = useState<HomeOption[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>("");
  const [description, setDescription] = useState("");

  const [quickLoading, setQuickLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickValueEstimate | null>(null);

  const [wantsDetailed, setWantsDetailed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [detailedResult, setDetailedResult] = useState<DetailedValueEstimate | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("homes")
      .select("id, name, home_type, year_built, square_feet, city, state")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        setHomes((data as HomeOption[]) || []);
      });
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedHome = homes.find((h) => h.id === selectedHomeId);
  const homeContext = selectedHome
    ? `${selectedHome.home_type.replace("_", " ")} home${selectedHome.year_built ? `, built ${selectedHome.year_built}` : ""}${selectedHome.square_feet ? `, ${selectedHome.square_feet.toLocaleString()} sq ft` : ""}, in ${selectedHome.city}, ${selectedHome.state}`
    : undefined;

  const resetDownstream = () => {
    setQuickResult(null);
    setWantsDetailed(false);
    setAnswers({});
    setDetailedResult(null);
  };

  const handleQuickSubmit = async () => {
    if (description.trim().length < 10) {
      toast({ title: "Too short", description: "Please describe the upgrade in more detail (at least 10 characters).", variant: "destructive" });
      return;
    }
    resetDownstream();
    setQuickLoading(true);
    try {
      const result = await getQuickValueEstimate({ description: description.trim(), homeContext });
      setQuickResult(result);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to generate estimate. Please try again.", variant: "destructive" });
    } finally {
      setQuickLoading(false);
    }
  };

  const handleDetailedSubmit = async () => {
    if (!quickResult) return;
    const followUpAnswers = quickResult.follow_up_questions.map((q, i) => ({ question: q, answer: (answers[i] || "").trim() }));
    if (followUpAnswers.some((a) => a.answer.length === 0)) {
      toast({ title: "A few answers are missing", description: "Fill in each question for the most accurate estimate.", variant: "destructive" });
      return;
    }
    setDetailedLoading(true);
    try {
      const result = await getDetailedValueEstimate({ description: description.trim(), homeContext, followUpAnswers });
      setDetailedResult(result);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to generate detailed estimate. Please try again.", variant: "destructive" });
    } finally {
      setDetailedLoading(false);
    }
  };

  const VMeta = quickResult ? verdictMeta[quickResult.verdict] : null;
  const DMeta = detailedResult ? verdictMeta[detailedResult.verdict] : null;
  const materialsTotal = detailedResult?.materials.reduce((s, m) => s + m.estimated_cost, 0) || 0;
  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="tools"
      onNavigate={() => {}}
      header={{
        avatarIcon: Home,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp size={22} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Home Value Advisor</h1>
          </div>
          <p className="text-muted-foreground">Describe an upgrade you're considering and find out if it's likely to pay off at resale.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Just need a repair cost, not a resale opinion? Try the{" "}
            <Link to="/estimator" className="text-primary hover:underline font-medium">AI Job Estimator</Link> instead.
          </p>
        </div>

        {limitLoading ? (
          <Skeleton className="h-64" />
        ) : (
        <UpgradeGate
            hasAccess={isPro}
            variant="card"
            featureName="Home Value Advisor"
            description="Describe an upgrade you're considering and find out if it's likely to pay off at resale."
            benefits={["AI-powered resale value analysis", "Full project cost breakdowns", "DIY vs. pro cost comparisons"]}
            pricingRoute="/#pricing"
            icon={Crown}
          >
          {/* Input Form */}
          <div className="rounded-xl border border-border bg-card p-6 mb-8">
            <div className="space-y-4">
              {homes.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Which home? (optional, improves accuracy)</label>
                  <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                    <SelectTrigger><SelectValue placeholder="General estimate — no specific home" /></SelectTrigger>
                    <SelectContent>
                      {homes.map((h) => (
                        <SelectItem key={h.id} value={h.id}>{h.name} — {h.city}, {h.state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">What upgrade are you considering? *</label>
                <Textarea
                  placeholder="e.g. I'm thinking about finishing the basement to add a bedroom and bathroom, roughly 600 sq ft..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
              <Button onClick={handleQuickSubmit} disabled={quickLoading} size="lg" className="gap-2">
                {quickLoading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                {quickLoading ? "Analyzing..." : "Get Rough Estimate"}
              </Button>
            </div>
          </div>

          {quickLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={36} className="animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Weighing your upgrade against typical resale value...</p>
            </div>
          )}

          {/* Quick Result */}
          {quickResult && !quickLoading && VMeta && (
            <div className="space-y-6 animate-fade-in-up mb-8">
              <div className={`rounded-xl border p-6 ${VMeta.className}`}>
                <div className="flex items-start gap-3">
                  <VMeta.icon size={24} className="mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{quickResult.project_title}</h2>
                    <p className="text-sm font-semibold mt-0.5">{VMeta.label}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{quickResult.summary}</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <DollarSign size={16} className="text-primary" /> Rough Project Cost
                  </div>
                  <p className="text-xl font-extrabold text-foreground">
                    ${quickResult.estimated_cost_low.toLocaleString()} – ${quickResult.estimated_cost_high.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <TrendingUp size={16} className="text-primary" /> Estimated Home Value Increase
                  </div>
                  <p className="text-xl font-extrabold text-primary">
                    +${quickResult.estimated_value_added_low.toLocaleString()} – +${quickResult.estimated_value_added_high.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Percent size={16} className="text-primary" /> Est. Resale ROI
                  </div>
                  <p className="text-xl font-extrabold text-foreground">
                    {quickResult.estimated_roi_percent_low}% – {quickResult.estimated_roi_percent_high}%
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">This is a rough estimate.</strong> {quickResult.regional_note}
                </p>
              </div>

              {!wantsDetailed && !detailedResult && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
                  <h3 className="font-bold text-foreground mb-1">Want a more accurate estimate?</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Answer a few quick questions and we'll give you a full breakdown — materials, timeline, skill level, step-by-step DIY vs. pro guidance, and a real cost comparison.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => toast({ title: "No problem — the rough estimate above is ready when you need it." })}>
                      No, this is enough
                    </Button>
                    <Button onClick={() => setWantsDetailed(true)} className="gap-1.5">
                      Yes, get the full analysis <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Follow-up Questions */}
              {wantsDetailed && !detailedResult && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <ClipboardList size={18} className="text-primary" /> A few quick questions
                  </h3>
                  <div className="space-y-4">
                    {quickResult.follow_up_questions.map((q, i) => (
                      <div key={i}>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{q}</label>
                        <Input
                          value={answers[i] || ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleDetailedSubmit} disabled={detailedLoading} size="lg" className="gap-2 mt-5">
                    {detailedLoading ? <Loader2 size={18} className="animate-spin" /> : <ClipboardList size={18} />}
                    {detailedLoading ? "Building full analysis..." : "Get Full Analysis"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {detailedLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={36} className="animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Building your full materials, timeline, and cost breakdown...</p>
            </div>
          )}

          {/* Detailed Result */}
          {detailedResult && !detailedLoading && DMeta && (
            <div className="space-y-6 animate-fade-in-up">
              <div className={`rounded-xl border p-6 ${DMeta.className}`}>
                <div className="flex items-start gap-3">
                  <DMeta.icon size={24} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-foreground">{detailedResult.project_title}</h2>
                      <Badge variant="outline" className="text-xs capitalize">{detailedResult.confidence} confidence</Badge>
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{DMeta.label}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{detailedResult.summary}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <DollarSign size={16} className="text-primary" /> Project Cost
                  </div>
                  <p className="text-xl font-extrabold text-foreground">
                    ${detailedResult.estimated_cost_low.toLocaleString()} – ${detailedResult.estimated_cost_high.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <TrendingUp size={16} className="text-primary" /> Estimated Home Value Increase
                  </div>
                  <p className="text-xl font-extrabold text-primary">
                    +${detailedResult.estimated_value_added_low.toLocaleString()} – +${detailedResult.estimated_value_added_high.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Percent size={16} className="text-primary" /> Resale ROI
                  </div>
                  <p className="text-xl font-extrabold text-foreground">
                    {detailedResult.estimated_roi_percent_low}% – {detailedResult.estimated_roi_percent_high}%
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock size={16} className="text-primary" /> Total Time
                  </div>
                  <p className="text-lg font-bold text-foreground">{detailedResult.total_time_estimate}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <HardHat size={16} className="text-primary" /> Overall Skill Level
                  </div>
                  <p className="text-lg font-bold text-foreground capitalize">{detailedResult.overall_skill_level.replace("_", " ")}</p>
                </div>
              </div>

              {/* DIY vs Pro total comparison */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Wrench size={16} className="text-primary" /> Full-Project Cost: DIY vs. Hiring a Pro
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Full DIY</p>
                    <p className="text-lg font-extrabold text-foreground">
                      ${detailedResult.total_diy_cost_low.toLocaleString()} – ${detailedResult.total_diy_cost_high.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">Hire a Pro</p>
                    <p className="text-lg font-extrabold text-foreground">
                      ${detailedResult.total_pro_cost_low.toLocaleString()} – ${detailedResult.total_pro_cost_high.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Wrench size={16} className="text-primary" /> Materials Needed
                </h3>
                <div className="space-y-2">
                  {detailedResult.materials.map((m, i) => (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-foreground font-medium">{m.name}</span>
                        {m.quantity && <span className="text-xs text-muted-foreground ml-2">({m.quantity})</span>}
                      </div>
                      <span className="text-sm font-semibold text-foreground">${m.estimated_cost.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                    <span className="text-sm font-bold text-foreground">Materials Total</span>
                    <span className="text-sm font-bold text-primary">${materialsTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Step by step */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <ClipboardList size={16} className="text-primary" /> Step-by-Step Breakdown
                </h3>
                <div className="space-y-3">
                  {detailedResult.steps.map((s) => (
                    <div key={s.step_number} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {s.step_number}
                          </span>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">{s.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs shrink-0 ${recommendationClass[s.recommendation]}`}>
                          {recommendationLabel[s.recommendation]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-3 pl-9 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><HardHat size={12} /> {s.skill_level.replace("_", " ")}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {s.estimated_time}</span>
                        <span className="flex items-center gap-1 text-primary"><DollarSign size={12} /> DIY ~${s.diy_cost_estimate.toLocaleString()}</span>
                        <span className="flex items-center gap-1 text-accent"><DollarSign size={12} /> Pro ~${s.pro_cost_estimate.toLocaleString()}</span>
                      </div>
                      {s.safety_notes && (
                        <p className="flex items-start gap-1.5 mt-2 pl-9 text-xs text-destructive">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {s.safety_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Permits */}
              {detailedResult.permits_likely_needed && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
                  <div className="flex items-start gap-3">
                    <FileWarning size={20} className="text-accent mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground mb-1">Permits May Be Required</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{detailedResult.permit_note}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb size={16} className="text-accent" /> Pro Tips
                </h3>
                <ul className="space-y-3">
                  {detailedResult.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-3">
                <ShieldCheck size={20} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ready to move forward?{" "}
                  <Link to="/post-job" className="text-primary font-medium hover:underline">Post this job</Link> to get bids from local pros, or{" "}
                  <Link to="/search" className="text-primary font-medium hover:underline">find a pro</Link> directly.
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This is an AI-generated estimate for informational purposes only. Actual costs, timelines, and resale value depend on your local market, contractor rates, and project specifics.
              </p>
            </div>
          )}
        </UpgradeGate>
        )}
      </div>
    </DashboardShell>
  );
};

export default HomeValueAdvisor;
