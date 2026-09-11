import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileWarning, Loader2, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  HelpCircle, ArrowRight, Crown, Home as HomeIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useToast } from "@/hooks/use-toast";
import { reviewQuote, type QuoteReview, type RiskLevel } from "@/lib/api/quoteReviewer";

const riskMeta: Record<RiskLevel, { label: string; icon: typeof ShieldCheck; className: string }> = {
  low: { label: "Looks Reasonable", icon: ShieldCheck, className: "border-primary/20 bg-primary/5 text-primary" },
  medium: { label: "Some Concerns", icon: AlertTriangle, className: "border-accent/20 bg-accent/5 text-accent" },
  high: { label: "Multiple Red Flags", icon: ShieldAlert, className: "border-destructive/20 bg-destructive/5 text-destructive" },
};

const severityBadgeClass: Record<RiskLevel, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-accent/10 text-accent",
  low: "bg-secondary text-secondary-foreground",
};

const QuoteReviewer = () => {
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const { isPro, subscriptionTier, loading: limitLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();

  const [quoteText, setQuoteText] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<QuoteReview | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <FileWarning size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to use the Quote & Contract Reviewer</h2>
            <p className="text-muted-foreground mb-6">
              Paste a contractor's quote or contract and get an instant red-flag check before you sign.
            </p>
            <Button asChild><Link to="/auth">Sign In / Sign Up</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (quoteText.trim().length < 20) {
      toast({ title: "Too short", description: "Paste the full quote or contract text (at least 20 characters).", variant: "destructive" });
      return;
    }
    setLoading(true);
    setReview(null);
    try {
      const result = await reviewQuote({ quoteText: quoteText.trim(), projectContext: projectContext.trim() || undefined });
      setReview(result);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to review the quote. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);
  const RMeta = review ? riskMeta[review.overall_risk] : null;

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="quote-reviewer"
      onNavigate={() => {}}
      header={{
        avatarIcon: HomeIcon,
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileWarning size={22} className="text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Quote & Contract Reviewer</h1>
          </div>
          <p className="text-muted-foreground">Paste a contractor's quote or contract and get an instant red-flag check before you sign.</p>
        </div>

        {limitLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 h-48 animate-pulse" />
        ) : (
        <UpgradeGate
          hasAccess={isPro}
          featureName="Quote & Contract Reviewer"
          description="Paste a contractor's quote or contract and get an instant red-flag check before you sign."
          benefits={["Flags common scam red flags", "Notes what a solid contract should include", "Gives you specific questions to ask before signing"]}
          pricingRoute="/#pricing"
          icon={Crown}
        >
          <div className="rounded-xl border border-border bg-card p-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Paste the quote or contract text *</label>
                <Textarea
                  placeholder="Paste the full text of the quote, estimate, or contract here..."
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  className="min-h-[180px] resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Project type (optional)</label>
                <Input
                  placeholder="e.g. Kitchen remodel, roof replacement, HVAC install"
                  value={projectContext}
                  onChange={(e) => setProjectContext(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={loading} size="lg" className="gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileWarning size={18} />}
                {loading ? "Reviewing..." : "Review This Quote"}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={36} className="animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Checking for red flags...</p>
            </div>
          )}

          {review && !loading && RMeta && (
            <div className="space-y-6 animate-fade-in-up">
              <div className={`rounded-xl border p-6 ${RMeta.className}`}>
                <div className="flex items-start gap-3">
                  <RMeta.icon size={24} className="mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{RMeta.label}</h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.risk_summary}</p>
                  </div>
                </div>
              </div>

              {review.red_flags.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-destructive" /> Red Flags
                  </h3>
                  <div className="space-y-3">
                    {review.red_flags.map((f, i) => (
                      <div key={i} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm text-foreground">{f.issue}</p>
                          <Badge className={`text-xs shrink-0 ${severityBadgeClass[f.severity]}`}>{f.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{f.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.positive_signs.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Positive Signs
                  </h3>
                  <ul className="space-y-2">
                    {review.positive_signs.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {review.missing_items.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <FileWarning size={16} className="text-accent" /> Missing From This Quote
                  </h3>
                  <ul className="space-y-2">
                    {review.missing_items.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <HelpCircle size={16} className="text-primary" /> Questions to Ask Before Signing
                </h3>
                <ul className="space-y-3">
                  {review.questions_to_ask.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-3">
                <ArrowRight size={20} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{review.suggested_next_step}</p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This is an AI-generated review for informational purposes only and is not legal advice. When in doubt, have a contract reviewed by a licensed professional.
              </p>
            </div>
          )}
        </UpgradeGate>
        )}
      </div>
    </DashboardShell>
  );
};

export default QuoteReviewer;
