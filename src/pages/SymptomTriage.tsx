import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Stethoscope, Loader2, AlertTriangle, ShieldAlert, Clock, Calendar,
  Wrench, DollarSign, Crown, CheckCircle2, PhoneCall, ChevronRight, Home,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import TrimblyResultCard from "@/components/tools/TrimblyResultCard";
import CoverageCallout from "@/components/tools/CoverageCallout";
import { useCoverageCheck } from "@/components/tools/useCoverageCheck";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { getSymptomTriage, type SymptomTriage } from "@/lib/api/symptomTriage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";


const systemOptions = [
  "HVAC", "Plumbing", "Electrical", "Appliance",
  "Roofing", "Structural", "Water Heater",
  "Fencing", "Landscaping", "Trees", "Pool", "Deck", "Shed",
  "Outdoor Structure", "Driveway", "Irrigation", "Other",
];

const urgencyMeta: Record<
  SymptomTriage["urgency"],
  { label: string; icon: any; classes: string; description: string }
> = {
  emergency: {
    label: "Emergency — Act Now",
    icon: ShieldAlert,
    classes: "bg-destructive/10 text-destructive border-destructive/40",
    description: "Stop using the system. Follow safety steps below.",
  },
  urgent: {
    label: "Urgent — Same Day",
    icon: AlertTriangle,
    classes: "bg-accent/10 text-accent border-accent/40",
    description: "Call a pro today to prevent damage.",
  },
  soon: {
    label: "Soon — Within a Week",
    icon: Clock,
    classes: "bg-primary/10 text-primary border-primary/40",
    description: "Schedule a repair in the next few days.",
  },
  monitor: {
    label: "Monitor — Not Urgent",
    icon: Calendar,
    classes: "bg-muted text-muted-foreground border-border",
    description: "Keep an eye on it; schedule when convenient.",
  },
};

const likelihoodBadge: Record<"high" | "medium" | "low", string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-accent/10 text-accent",
  low: "bg-muted text-muted-foreground",
};

const urgencyTile: Record<SymptomTriage["urgency"], { word: string; box: string; label: string }> = {
  emergency: { word: "Emergency", box: "bg-destructive/10", label: "text-destructive" },
  urgent: { word: "High", box: "bg-warning/15", label: "text-warning-foreground" },
  soon: { word: "Medium", box: "bg-primary/10", label: "text-primary" },
  monitor: { word: "Low", box: "bg-success/10", label: "text-success" },
};

const coverageStatusLabel: Record<CoverageVerdict["status"], string> = {
  likely_covered: "Likely covered",
  possibly_covered: "May be covered",
  not_covered: "Not covered",
  unclear: "Couldn't confirm from your documents",
};


const SymptomTriagePage = () => {
  const { user, profileName, loading: authLoading } = useAuth();
  const { isPro, subscriptionTier, loading: limitLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [symptom, setSymptom] = useState("");
  const [system, setSystem] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomTriage | null>(null);
  const [docRefs, setDocRefs] = useState<{ url: string; mimeType: string; label: string }[]>([]);
  const [docsChecked, setDocsChecked] = useState(false);
  const [coverage, setCoverage] = useState<CoverageVerdict | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const refs = await loadCoverageDocRefs(user.id);
      if (!cancelled) { setDocRefs(refs); setDocsChecked(true); }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (symptom.trim().length < 10) {
      toast({
        title: "More detail needed",
        description: "Describe what you're seeing/hearing/smelling in a sentence or two.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    setCoverage(null);
    setCoverageError(false);
    try {
      const triage = await getSymptomTriage({
        symptom: symptom.trim(),
        system_type: system || undefined,
      });
      setResult(triage);

      if (docRefs.length > 0) {
        setCoverageLoading(true);
        try {
          const verdict = await checkCoverage(
            `${triage.diagnosis_title} (${triage.system}). ${triage.summary} Homeowner described: ${symptom.trim()}`,
            docRefs,
          );
          setCoverage(verdict);
        } catch {
          setCoverageError(true);
        } finally {
          setCoverageLoading(false);
        }
      }
    } catch (e) {
      toast({
        title: "Couldn't analyze symptom",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const UrgencyIcon = result ? urgencyMeta[result.urgency].icon : null;
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
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display mb-2 flex items-center gap-3">
            <Stethoscope className="text-primary" size={28} />
            AI Symptom Triage
          </h1>
          <p className="text-muted-foreground">
            Tell us what's happening — a noise, smell, leak, or weird behavior. You'll get an instant diagnosis,
            urgency level, safety check, and DIY vs Pro recommendation.
          </p>
        </div>

        {limitLoading ? (
          <Skeleton className="h-64" />
        ) : (
        <UpgradeGate
            hasAccess={isPro}
            variant="card"
            featureName="AI Symptom Triage"
            description="Describe what's wrong with your home — get an instant diagnosis, urgency level, and DIY vs Pro guidance."
            benefits={["Instant diagnosis & urgency level", "Safety warnings when needed", "DIY vs Pro recommendations"]}
            pricingRoute="/#pricing"
            icon={Crown}
          >
          <Card className="mb-8">
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  What's going on? <span className="text-muted-foreground font-normal">(noise, smell, behavior, error code…)</span>
                </label>
                <Textarea
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="e.g. My AC is making a grinding noise when it kicks on, and the air feels warmer than usual."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Affected system <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Select value={system} onValueChange={setSystem}>
                  <SelectTrigger><SelectValue placeholder="Not sure — let AI figure it out" /></SelectTrigger>
                  <SelectContent>
                    {systemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <><Loader2 className="mr-2 animate-spin" size={18} /> Analyzing…</>
                ) : (
                  <>Analyze Symptom <ChevronRight size={18} className="ml-1" /></>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <div className="space-y-5">
              {/* Summary card — matches the diagnosis card shown on the Trimbly landing page */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--product-shadow)]">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <BrandMark className="h-9 w-9" />
                    <div>
                      <p className="text-xs font-bold text-primary">MY HOME</p>
                      <p className="text-sm font-semibold text-foreground">Here's what Trimbly found</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent-foreground">{result.system}</span>
                </div>

                <p className="mt-4 text-lg font-bold text-foreground">{result.diagnosis_title}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-[11px] font-bold text-muted-foreground">LIKELY CAUSE</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{result.likely_causes[0]?.cause ?? "See details below"}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${urgencyTile[result.urgency].box}`}>
                    <p className={`text-[11px] font-bold ${urgencyTile[result.urgency].label}`}>URGENCY</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{urgencyTile[result.urgency].word}</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-[11px] font-bold text-muted-foreground">ESTIMATED REPAIR</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      ${result.estimated_cost_low.toLocaleString()}–${result.estimated_cost_high.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Coverage — reads the homeowner's uploaded warranty & insurance documents */}
                <div className="mt-3 rounded-lg bg-primary/[0.08] p-3 text-sm text-foreground">
                  {coverageLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking your warranty and insurance documents…
                    </span>
                  ) : coverage ? (
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p><strong>Coverage:</strong> {coverageStatusLabel[coverage.status]}{coverage.source && coverage.source !== "None" ? ` — ${coverage.source}` : ""}</p>
                        <p className="mt-1 text-muted-foreground">{coverage.explanation}</p>
                        {coverage.next_step && <p className="mt-1 text-muted-foreground">{coverage.next_step}</p>}
                      </div>
                    </div>
                  ) : coverageError ? (
                    <span className="flex items-start gap-2 text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      We couldn't check your coverage documents this time. Try again in a moment.
                    </span>
                  ) : docsChecked && docRefs.length === 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          <strong>Coverage:</strong> This repair might be covered. Add your home warranty or insurance policy and Trimbly will check it against issues like this one automatically.
                        </span>
                      </div>
                      <Button asChild size="sm" variant="outline" className="bg-card">
                        <Link to="/coverage"><Upload size={14} className="mr-1.5" /> Upload your documents</Link>
                      </Button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> Checking your coverage…
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-bold text-muted-foreground">NEXT STEP</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {result.diy_steps[0] ?? `Schedule a ${result.recommended_pro_type} to take a look.`}
                  </p>
                </div>
              </div>

              {/* Urgency detail */}
              <Card className={`border-2 ${urgencyMeta[result.urgency].classes}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {UrgencyIcon && <UrgencyIcon size={28} className="shrink-0 mt-0.5" />}
                    <div>
                      <div className="text-lg font-bold">{urgencyMeta[result.urgency].label}</div>
                      <div className="text-sm opacity-90">{urgencyMeta[result.urgency].description}</div>
                      <div className="text-sm mt-2">{result.urgency_reasoning}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Safety warning */}
              {result.safety_warning && result.safety_warning.trim() && (
                <Card className="border-2 border-destructive/40 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-destructive flex items-center gap-2 text-base">
                      <ShieldAlert size={20} /> Safety First
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground">{result.safety_warning}</CardContent>
                </Card>
              )}

              {/* Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xl">{result.diagnosis_title}</CardTitle>
                    <Badge variant="outline">{result.system}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-muted-foreground">{result.summary}</p>


                  {/* Likely causes */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">Likely Causes</h3>
                    <ul className="space-y-2">
                      {result.likely_causes.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge className={`shrink-0 ${likelihoodBadge[c.likelihood]} border-0 capitalize`}>{c.likelihood}</Badge>
                          <span className="text-foreground">{c.cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cost */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={16} className="text-primary" />
                    <span className="text-foreground font-semibold">
                      Typical pro repair: ${result.estimated_cost_low.toLocaleString()}–${result.estimated_cost_high.toLocaleString()}
                    </span>
                  </div>

                  {/* DIY recommendation */}
                  <div className={`p-4 rounded-lg border ${result.diy_recommended ? "bg-primary/5 border-primary/30" : "bg-accent/5 border-accent/30"}`}>
                    <div className="font-bold text-foreground flex items-center gap-2 mb-2">
                      {result.diy_recommended ? (
                        <><CheckCircle2 size={18} className="text-primary" /> DIY Looks Reasonable</>
                      ) : (
                        <><Wrench size={18} className="text-accent" /> Recommended: Call a {result.recommended_pro_type}</>
                      )}
                    </div>

                    {result.diy_steps.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Try first</div>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-foreground">
                          {result.diy_steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </div>
                    )}

                    {result.when_to_call_pro.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                          Stop and call a pro if…
                        </div>
                        <ul className="space-y-1 text-sm text-foreground">
                          {result.when_to_call_pro.map((w, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-accent mt-1">•</span><span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button asChild>
                      <Link to={`/search?q=${encodeURIComponent(result.recommended_pro_type)}`}>
                        <PhoneCall size={16} className="mr-1.5" /> Find a {result.recommended_pro_type}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/post-job">Post a Job for Bids</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                AI guidance is informational and not a substitute for a licensed professional.
                When in doubt, call a pro — and for gas, smoke, or electrical hazards, call 911 / your utility immediately.
              </p>
            </div>
          )}
        </UpgradeGate>
        )}
      </div>
    </DashboardShell>
  );
};

export default SymptomTriagePage;
