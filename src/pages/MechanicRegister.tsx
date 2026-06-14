import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Wrench, MapPin, Phone, Shield, DollarSign, Loader2, Star, Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const categories = [
  "Auto Repair", "Motorcycle Repair", "Mobile Mechanic", "Auto Body",
  "Tire Shop", "Transmission", "Diesel", "Performance / Tuning",
  "Detailing", "Glass / Windshield", "Other",
];

const tierLabels: Record<string, { label: string; icon: typeof Star; color: string }> = {
  free: { label: "Free", icon: Star, color: "secondary" },
  pro: { label: "Pro Mechanic", icon: Zap, color: "default" },
};

const MechanicRegister = () => {
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedTier = searchParams.get("tier") || "free";
  const tierInfo = tierLabels[selectedTier] || tierLabels.free;

  const [step, setStep] = useState<"auth" | "profile">(user ? "profile" : "auth");
  const [loading, setLoading] = useState(false);

  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });

  const [form, setForm] = useState({
    business_name: "",
    category: "",
    city: "",
    state: "",
    phone: "",
    website: "",
    description: "",
    hourly_rate_min: 75,
    hourly_rate_max: 150,
    years_experience: 0,
    licensed: false,
    license_number: "",
    insured: false,
    insurance_details: "",
    mobile_service: false,
  });

  const [acceptedTos, setAcceptedTos] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTos) {
      toast({ title: "Please accept the Terms", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(authForm.email, authForm.password, {
        full_name: authForm.name,
        user_type: "provider",
      });
      if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      else toast({ title: "Check your email", description: "Verify your email, then come back to finish your shop profile." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }
    if (!form.business_name || !form.category || !form.city || !form.state) {
      toast({ title: "Missing fields", description: "Fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const description = form.mobile_service
        ? `${form.description || ""}\n\nMobile service available.`.trim()
        : form.description || null;

      const { error } = await supabase.from("providers").insert({
        user_id: user.id,
        business_name: form.business_name,
        category: form.category,
        city: form.city,
        state: form.state,
        phone: form.phone || null,
        website: form.website || null,
        description,
        hourly_rate_min: form.hourly_rate_min,
        hourly_rate_max: form.hourly_rate_max,
        years_experience: form.years_experience,
        licensed: form.licensed,
        license_number: form.licensed ? form.license_number : null,
        insured: form.insured,
        insurance_details: form.insured ? form.insurance_details : null,
        subscription_tier: selectedTier,
        provider_type: "mechanic",
      } as any);
      if (error) throw error;
      toast({ title: "Welcome aboard! 🔧", description: "Your mechanic profile is live. Vehicle jobs incoming." });
      navigate("/mechanic-dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (user && step === "auth") setStep("profile");

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link to="/mechanic-pricing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={16} /> Back to pricing
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground font-display">
                Register as a Mechanic
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={tierInfo.color as any}>
                  <tierInfo.icon size={12} className="mr-1" />
                  {tierInfo.label} Plan
                </Badge>
                <Link to="/mechanic-pricing" className="text-xs text-primary hover:underline">Change plan</Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === "auth" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>1. Create Account</div>
            <div className="h-px w-6 bg-border" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === "profile" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>2. Shop Profile</div>
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
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={acceptedTos} onChange={(e) => setAcceptedTos(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border accent-primary" />
                <span>
                  I agree to the <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">Terms</Link> and <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
                </span>
              </label>
              <Button type="submit" className="w-full" size="lg" disabled={loading || !acceptedTos}>
                {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating account...</> : "Create Account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/auth" className="text-primary hover:underline">Log in</Link>, then return here.
              </p>
            </form>
          )}

          {step === "profile" && user && (
            <form onSubmit={handleProfileSubmit} className="space-y-6 bg-card border border-border rounded-2xl p-6 md:p-8">
              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Wrench size={16} className="text-primary" /> Shop Information
                </h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Shop / Business Name *</Label>
                    <Input placeholder="e.g. Mike's Auto & Moto" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty *</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            form.category === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "text-muted-foreground border-border hover:border-primary/30"
                          }`}>{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>About your shop</Label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm min-h-[80px] resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Specialties, makes you service, certifications (ASE, factory training), turnaround time..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.mobile_service} onChange={() => setForm(f => ({ ...f, mobile_service: !f.mobile_service }))} className="w-4 h-4 rounded border-border accent-primary" />
                    <span className="text-sm text-foreground">I offer mobile / on-site service</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin size={16} className="text-primary" /> Service Area
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>City *</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>State *</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Phone size={16} className="text-primary" /> Contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" /> Labor Rate & Experience
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Min ($/hr)</Label><Input type="number" min={0} value={form.hourly_rate_min} onChange={e => setForm(f => ({ ...f, hourly_rate_min: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>Max ($/hr)</Label><Input type="number" min={0} value={form.hourly_rate_max} onChange={e => setForm(f => ({ ...f, hourly_rate_max: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>Years</Label><Input type="number" min={0} value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: Number(e.target.value) }))} /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-primary" /> Credentials
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.licensed} onChange={() => setForm(f => ({ ...f, licensed: !f.licensed }))} className="w-4 h-4 rounded border-border accent-primary" />
                    <span className="text-sm text-foreground">Licensed / certified (ASE, state license, etc.)</span>
                  </label>
                  {form.licensed && (
                    <div className="ml-7 space-y-2"><Label>License / Cert #</Label><Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} /></div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.insured} onChange={() => setForm(f => ({ ...f, insured: !f.insured }))} className="w-4 h-4 rounded border-border accent-primary" />
                    <span className="text-sm text-foreground">Garage keeper's / liability insurance</span>
                  </label>
                  {form.insured && (
                    <div className="ml-7 space-y-2"><Label>Insurance Details</Label><Input value={form.insurance_details} onChange={e => setForm(f => ({ ...f, insurance_details: e.target.value }))} /></div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating shop profile...</> : "Create My Mechanic Profile"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MechanicRegister;
