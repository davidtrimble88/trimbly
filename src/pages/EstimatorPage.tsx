import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain, Loader2, DollarSign, Clock, Wrench, Lightbulb, ShieldCheck, AlertTriangle, ChevronRight, Crown, PlayCircle, ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getJobEstimate, type JobEstimate } from "@/lib/api/jobEstimator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";

const categories = ["Plumbing", "Electrical", "Handyman", "General Contractor", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning", "Other"];


const difficultyLabels = ["", "Easy — DIY Friendly", "Moderate", "Intermediate", "Advanced", "Expert Only"];
const difficultyColors = ["", "text-primary", "text-primary", "text-accent", "text-destructive", "text-destructive"];

const EstimatorPage = () => {
  const { user } = useAuth();
  const { hasEstimator, loading: limitLoading } = useHomeLimit();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<JobEstimate | null>(null);
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <Brain size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to use AI Job Estimator</h2>
            <p className="text-muted-foreground mb-6">Get instant cost estimates, material lists, and DIY vs. pro recommendations.</p>
            <Button asChild><Link to="/auth">Sign In / Sign Up</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!limitLoading && !hasEstimator) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <Crown size={48} className="mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade to Use AI Job Estimator</h2>
            <p className="text-muted-foreground mb-6">
              The AI Job Estimator is available on Home Hero and Home Super Hero plans.
              Get unlimited instant cost estimates, material breakdowns, and DIY vs. pro recommendations.
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
    if (description.trim().length < 10) {
      toast({ title: "Too short", description: "Please describe the job in more detail (at least 10 characters).", variant: "destructive" });
      return;
    }
    setLoading(true);
    setEstimate(null);
    try {
      const result = await getJobEstimate({
        description: description.trim(),
        category: category || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      });
      setEstimate(result);
    } catch (err: any) {
      console.error("Estimate error:", err);
      toast({ title: "Error", description: err?.message || "Failed to generate estimate. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const materialTotal = estimate?.materials.reduce((sum, m) => sum + m.estimated_cost, 0) || 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={16} /> Back to home
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain size={22} className="text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">AI Job Estimator</h1>
            </div>
            <p className="text-muted-foreground">Describe your home repair or project and get an instant AI-powered cost estimate.</p>
          </div>

          {/* Input Form */}
          <div className="rounded-xl border border-border bg-card p-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Describe the job *</label>
                <Textarea
                  placeholder="e.g. My kitchen faucet is leaking from the base. It's a single-handle Moen faucet, about 5 years old. The leak gets worse when the water is running..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">City (optional)</label>
                  <Input placeholder="e.g. Austin" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">State (optional)</label>
                  <Input placeholder="e.g. TX" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={loading} size="lg" className="gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
                {loading ? "Analyzing..." : "Get Estimate"}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={36} className="animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Our AI is analyzing your job description...</p>
            </div>
          )}

          {/* Results */}
          {estimate && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Summary Header */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <h2 className="text-xl font-bold text-foreground mb-1">{estimate.job_title}</h2>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">{estimate.category}</span>
                <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{estimate.summary}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <DollarSign size={16} className="text-primary" /> Estimated Cost
                  </div>
                  <p className="text-2xl font-extrabold text-foreground">
                    ${estimate.cost_low.toLocaleString()} – ${estimate.cost_high.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock size={16} className="text-primary" /> Time Estimate
                  </div>
                  <p className="text-2xl font-extrabold text-foreground">
                    {estimate.time_hours_low}–{estimate.time_hours_high} hrs
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Wrench size={16} className="text-primary" /> Difficulty
                  </div>
                  <p className={`text-2xl font-extrabold ${difficultyColors[estimate.difficulty]}`}>
                    {estimate.difficulty}/5
                  </p>
                  <p className={`text-xs font-medium ${difficultyColors[estimate.difficulty]}`}>
                    {difficultyLabels[estimate.difficulty]}
                  </p>
                </div>
              </div>

              {/* DIY Recommendation */}
              <div className={`rounded-xl border p-5 ${estimate.diy_recommended ? "border-primary/20 bg-primary/5" : "border-accent/20 bg-accent/5"}`}>
                <div className="flex items-start gap-3">
                  {estimate.diy_recommended ? (
                    <ShieldCheck size={22} className="text-primary mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={22} className="text-accent mt-0.5 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      {estimate.diy_recommended ? "DIY Recommended ✓" : "Hire a Pro Recommended"}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{estimate.diy_reasoning}</p>
                    {estimate.diy_recommended && (
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-3 gap-1.5"
                        onClick={() => {
                          const query = encodeURIComponent(`how to ${estimate.job_title} DIY tutorial`);
                          window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <PlayCircle size={14} /> Show Me How
                      </Button>
                    )}
                    {!estimate.diy_recommended && (
                      <Button variant="outline" size="sm" className="mt-3 gap-1" asChild>
                        <Link to="/search">
                          Find a Pro Near You <ChevronRight size={14} />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Wrench size={16} className="text-primary" /> Materials Needed
                </h3>
                <div className="space-y-2">
                  {estimate.materials.map((m, i) => (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-foreground font-medium">{m.name}</span>
                        {m.quantity && <span className="text-xs text-muted-foreground ml-2">({m.quantity})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">${m.estimated_cost.toLocaleString()}</span>
                        <a
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(m.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 hover:underline whitespace-nowrap"
                        >
                          <ShoppingCart size={12} /> Shop <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
                    <span className="text-sm font-bold text-foreground">Materials Total</span>
                    <span className="text-sm font-bold text-primary">${materialTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb size={16} className="text-accent" /> Pro Tips
                </h3>
                <ul className="space-y-3">
                  {estimate.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center">
                This is an AI-generated estimate for informational purposes only. Actual costs may vary based on local rates, specific conditions, and materials chosen.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EstimatorPage;
