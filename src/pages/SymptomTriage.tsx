import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Stethoscope, Loader2, AlertTriangle, ShieldAlert, Clock, Calendar,
  Wrench, DollarSign, Crown, CheckCircle2, PhoneCall, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSymptomTriage, type SymptomTriage } from "@/lib/api/symptomTriage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";

const systemOptions = [
  "HVAC", "Plumbing", "Electrical", "Appliance",
  "Roofing", "Structural", "Water Heater", "Other",
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

const SymptomTriagePage = () => {
  const { user } = useAuth();
  const { isPro, loading: limitLoading } = useHomeLimit();
  const { toast } = useToast();

  const [symptom, setSymptom] = useState("");
  const [system, setSystem] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomTriage | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <Stethoscope size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to use AI Symptom Triage</h2>
            <p className="text-muted-foreground mb-6">
              Describe what's wrong with your home — get an instant diagnosis, urgency level, and DIY vs Pro guidance.
            </p>
            <Button asChild><Link to="/auth">Sign In / Sign Up</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!limitLoading && !isPro) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <Crown size={48} className="mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade to Use AI Symptom Triage</h2>
            <p className="text-muted-foreground mb-6">
              AI Symptom Triage is available on Homeowner Pro and Multi-Homeowner Pro plans.
              Get instant diagnosis, urgency level, safety guidance, and DIY vs Pro recommendations whenever something goes wrong.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline"><Link to="/#pricing">View Plans</Link></Button>
              <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
            </div>
          </div>
        </main>
        <Footer />
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
    try {
      const triage = await getSymptomTriage({
        symptom: symptom.trim(),
        system_type: system || undefined,
      });
      setResult(triage);
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 flex items-center gap-3">
              <Stethoscope className="text-primary" size={32} />
              AI Symptom Triage
            </h1>
            <p className="text-muted-foreground">
              Tell us what's happening — a noise, smell, leak, or weird behavior. You'll get an instant diagnosis,
              urgency level, safety check, and DIY vs Pro recommendation.
            </p>
          </div>

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
              {/* Urgency banner */}
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

              {/* Diagnosis */}
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SymptomTriagePage;
