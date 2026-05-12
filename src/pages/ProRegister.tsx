import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, MapPin, Briefcase, Phone, Globe,
  Shield, FileText, DollarSign, Loader2, Star, Zap
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const categories = [
  "Plumbing", "Electrical", "HVAC", "Roofing", "Painting",
  "Landscaping", "Cleaning", "Handyman", "Pest Control", "Flooring",
  "Carpentry", "Masonry", "Windows & Doors", "Appliance Repair", "Other",
];

const tierLabels: Record<string, { label: string; icon: typeof Star; color: string }> = {
  free: { label: "Free", icon: Star, color: "secondary" },
  pro: { label: "Pro", icon: Zap, color: "default" },
};

const ProRegister = () => {
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedTier = searchParams.get("tier") || "free";
  const tierInfo = tierLabels[selectedTier] || tierLabels.free;

  const [step, setStep] = useState<"auth" | "profile">(user ? "profile" : "auth");
  const [loading, setLoading] = useState(false);

  // Auth form
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });

  // Profile form
  const [form, setForm] = useState({
    business_name: "",
    category: "",
    city: "",
    state: "",
    phone: "",
    website: "",
    description: "",
    hourly_rate_min: 50,
    hourly_rate_max: 100,
    years_experience: 0,
    licensed: false,
    license_number: "",
    insured: false,
    insurance_details: "",
  });

  const [acceptedTos, setAcceptedTos] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTos) {
      toast({ title: "Please accept the Terms", description: "You must agree to the Terms of Service and Privacy Policy to create an account.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(authForm.email, authForm.password, {
        full_name: authForm.name,
        user_type: "provider",
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "Verify your email, then come back to complete your profile." });
        // Don't advance to profile step until email is verified and user logs in
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not signed in", description: "Please sign in first.", variant: "destructive" });
      return;
    }
    if (!form.business_name || !form.category || !form.city || !form.state) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("providers").insert({
        user_id: user.id,
        business_name: form.business_name,
        category: form.category,
        city: form.city,
        state: form.state,
        phone: form.phone || null,
        website: form.website || null,
        description: form.description || null,
        hourly_rate_min: form.hourly_rate_min,
        hourly_rate_max: form.hourly_rate_max,
        years_experience: form.years_experience,
        licensed: form.licensed,
        license_number: form.licensed ? form.license_number : null,
        insured: form.insured,
        insurance_details: form.insured ? form.insurance_details : null,
        subscription_tier: selectedTier,
      });
      if (error) throw error;
      toast({ title: "Welcome aboard! 🎉", description: "Your pro profile has been created. Homeowners can now find you." });
      navigate("/search");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // If user just logged in, auto-advance to profile
  if (user && step === "auth") {
    setStep("profile");
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link to="/pro-pricing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={16} /> Back to pricing
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground font-display">
                Register as a Pro
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={tierInfo.color as any}>
                  <tierInfo.icon size={12} className="mr-1" />
                  {tierInfo.label} Plan
                </Badge>
                <Link to="/pro-pricing" className="text-xs text-primary hover:underline">Change plan</Link>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === "auth" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              1. Create Account
            </div>
            <div className="h-px w-6 bg-border" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === "profile" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              2. Business Profile
            </div>
          </div>

          {step === "auth" && !user && (
            <form onSubmit={handleAuthSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-6 md:p-8">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Your name" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min 6 characters" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating account...</> : "Create Account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/auth" className="text-primary hover:underline">Log in</Link>, then return here.
              </p>
            </form>
          )}

          {step === "profile" && user && (
            <form onSubmit={handleProfileSubmit} className="space-y-6 bg-card border border-border rounded-2xl p-6 md:p-8">
              {/* Business info */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-primary" /> Business Information
                </h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input placeholder="e.g. Smith Plumbing LLC" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Category *</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, category: cat }))}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            form.category === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "text-muted-foreground border-border hover:border-primary/30"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm min-h-[80px] resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Tell homeowners about your services, specialties, and experience..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin size={16} className="text-primary" /> Service Area
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input placeholder="e.g. Austin" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input placeholder="e.g. TX" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Phone size={16} className="text-primary" /> Contact Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="(555) 123-4567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input placeholder="https://yoursite.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Rates & Experience */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" /> Rates & Experience
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Rate ($/hr)</Label>
                    <Input type="number" min={0} value={form.hourly_rate_min} onChange={e => setForm(f => ({ ...f, hourly_rate_min: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Rate ($/hr)</Label>
                    <Input type="number" min={0} value={form.hourly_rate_max} onChange={e => setForm(f => ({ ...f, hourly_rate_max: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Years Experience</Label>
                    <Input type="number" min={0} value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-primary" /> Credentials
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.licensed} onChange={() => setForm(f => ({ ...f, licensed: !f.licensed }))} className="w-4 h-4 rounded border-border accent-primary" />
                    <span className="text-sm text-foreground">I am licensed</span>
                  </label>
                  {form.licensed && (
                    <div className="ml-7 space-y-2">
                      <Label>License Number</Label>
                      <Input placeholder="e.g. LIC-12345" value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.insured} onChange={() => setForm(f => ({ ...f, insured: !f.insured }))} className="w-4 h-4 rounded border-border accent-primary" />
                    <span className="text-sm text-foreground">I carry insurance</span>
                  </label>
                  {form.insured && (
                    <div className="ml-7 space-y-2">
                      <Label>Insurance Details</Label>
                      <Input placeholder="e.g. General liability, $1M coverage" value={form.insurance_details} onChange={e => setForm(f => ({ ...f, insurance_details: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating profile...</> : "Create My Pro Profile"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProRegister;
