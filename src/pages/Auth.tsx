import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TESTING_NOTICE_ACK_KEY } from "@/pages/TestingNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Home, Building2, Wrench, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BrandMark from "@/components/BrandMark";
import { TosAgreement } from "@/components/TosAgreement";
import { validatePassword, PASSWORD_MIN } from "@/lib/passwordPolicy";

type AuthMode = "login" | "signup" | "forgot";
type SignupStep = "info" | "type";
type AccountKind = "homeowner" | "provider" | "mechanic";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get("mode") as AuthMode) === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>("info");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sync mode if URL changes. Note: useSearchParams() returns a new object
  // reference on every render, so this must depend on the derived string
  // value, not searchParams itself — depending on searchParams re-fires the
  // effect on every render (including ones caused by signupStep changing),
  // which was resetting signupStep back to "info" the instant it advanced.
  const modeParam = searchParams.get("mode");
  useEffect(() => {
    if (modeParam === "signup" || modeParam === "login") setMode(modeParam);
  }, [modeParam]);

  // Reset the signup sub-step when the mode itself changes, so switching
  // away from signup and back doesn't strand someone on the "which are you" step.
  useEffect(() => {
    setSignupStep("info");
  }, [mode]);

  // Redirect if already logged in — someone landing on /auth with an active
  // session shouldn't see a login form, same behavior as the homepage. If they
  // arrived here from a gated action (e.g. "message this pro"), send them back
  // to that page instead of always defaulting to the dashboard.
  useEffect(() => {
    if (!authLoading && user) {
      const redirect = searchParams.get("redirect");
      navigate(redirect || "/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate, searchParams]);

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
          backgroundSize: "26px 26px",
        }} />
        <div className="relative z-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <BrandMark className="w-14 h-14" fillClassName="fill-primary-foreground" markClassName="fill-primary" />
          </Link>
          <h1 className="text-4xl font-semibold text-primary-foreground mb-4 font-display">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Join Trimbly" : "Reset password"}
          </h1>
          <p className="text-primary-foreground/75 text-lg max-w-md">
            {mode === "login"
              ? "Log in to manage your home, connect with pros, and stay on top of maintenance."
              : mode === "signup"
              ? "Create your account and start finding trusted pros or growing your business."
              : "No worries — we'll send you a link to reset your password."}
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-6">
            <BrandMark className="w-8 h-8" />
            <span className="font-display font-bold text-xl text-foreground">Trimbly</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1 font-display">
            {mode === "login" ? "Log in to your account"
              : mode === "signup" ? (signupStep === "type" ? "One more thing" : "Create your account")
              : "Forgot your password?"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "login" ? "Enter your credentials to continue"
              : mode === "signup" ? (signupStep === "type" ? "Which best describes you?" : "Fill in your details to get started")
              : "Enter your email and we'll send you a reset link"}
          </p>

          {mode === "forgot" ? (
            <ForgotPasswordForm onBack={() => setMode("login")} />
          ) : (
            <AuthForm
              mode={mode}
              signupStep={signupStep}
              setSignupStep={setSignupStep}
              form={form}
              setForm={setForm}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onForgot={() => setMode("forgot")}
            />
          )}

          {mode !== "forgot" && signupStep !== "type" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or continue with</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) toast({ title: "Error", description: String(error), variant: "destructive" });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("apple", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) toast({ title: "Error", description: String(error), variant: "destructive" });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Apple
                </Button>
              </div>
            </>
          )}

          {signupStep !== "type" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === "login" ? (
                <>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Sign up</button></>
              ) : mode === "signup" ? (
                <>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Log in</button></>
              ) : (
                <>Remember your password?{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Log in</button></>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Separate form component to use hooks properly
function AuthForm({
  mode,
  signupStep,
  setSignupStep,
  form,
  setForm,
  showPassword,
  setShowPassword,
  onForgot,
}: {
  mode: AuthMode;
  signupStep: SignupStep;
  setSignupStep: (s: SignupStep) => void;
  form: { name: string; email: string; password: string };
  setForm: (f: { name: string; email: string; password: string }) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onForgot: () => void;
}) {
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [loading, setLoading] = useState(false);
  const [creatingKind, setCreatingKind] = useState<AccountKind | null>(null);
  const [acceptedTos, setAcceptedTos] = useState(false);

  // Step 1 of signup (or the only step for login): collect name/email/password.
  // For signup this just advances to the "which are you" step — the account
  // isn't created until a kind is picked, so we never have to fix up
  // user_type after the fact.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!acceptedTos) {
        toast({ title: "Please accept the Terms", description: "You must agree to the Terms of Service and Privacy Policy to create an account.", variant: "destructive" });
        return;
      }
      const pwError = validatePassword(form.password);
      if (pwError) {
        toast({ title: "Password doesn't meet requirements", description: pwError, variant: "destructive" });
        return;
      }
      setSignupStep("type");
      return;
    }

    setLoading(true);
    try {
      // A bare username (no "@") is treated as a staff login and silently
      // mapped to its internal account — see supabase/migrations/20260803100000_staff_cheat_code_login.sql.
      const trimmedEmail = form.email.trim();
      const loginEmail = trimmedEmail.includes("@")
        ? trimmedEmail
        : `${trimmedEmail.toLowerCase()}@staff.trimbly.internal`;
      const { error } = await signIn(loginEmail, form.password);
      // During the testing period, send testers through the beta notice once
      // per browser before dropping them at their destination.
      const goAfterLogin = (dest: string) => {
        let acked = false;
        try {
          acked = localStorage.getItem(TESTING_NOTICE_ACK_KEY) === "1";
        } catch {
          acked = false;
        }
        if (acked || loginEmail.endsWith("@staff.trimbly.internal")) {
          navigate(dest);
        } else {
          navigate(`/testing-notice?next=${encodeURIComponent(dest)}`);
        }
      };
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else if (redirect) {
        goAfterLogin(redirect);
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const uid = authUser?.id || "";
        // Only internal staff logins land in the Staff Portal. A regular
        // email account always goes to its normal dashboard, even if the
        // person also holds a staff role.
        if (loginEmail.endsWith("@staff.trimbly.internal")) {
          const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", uid);
          const staffRoles = ["admin", "moderator", "support", "analyst"];
          if ((roleRows || []).some((r: any) => staffRoles.includes(r.role))) {
            navigate("/staff");
            return;
          }
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", uid)
          .maybeSingle();
        if (profile?.user_type === "provider") {
          const { data: prov } = await supabase
            .from("providers")
            .select("provider_type")
            .eq("user_id", uid)
            .maybeSingle();
          goAfterLogin((prov as any)?.provider_type === "mechanic" ? "/mechanic-dashboard" : "/pro-dashboard");
        } else {
          goAfterLogin("/dashboard");
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of signup: creates the account with the right user_type and sends
  // them straight into the flow that matches it — homeowners pick a plan,
  // providers/mechanics land directly on their business-profile step (already
  // signed in, so ProRegister/MechanicRegister skip their own auth step).
  const handleAccountKindSelect = async (kind: AccountKind) => {
    setCreatingKind(kind);
    try {
      const { error } = await signUp(form.email, form.password, {
        full_name: form.name,
        user_type: kind === "homeowner" ? "homeowner" : "provider",
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        return;
      }
      if (kind === "provider") {
        navigate("/pro-register");
      } else if (kind === "mechanic") {
        navigate("/mechanic-register");
      } else if (redirect) {
        toast({ title: "Welcome!", description: "You're all set." });
        navigate(redirect);
      } else {
        toast({ title: "Welcome!", description: "Let's pick the right plan for you." });
        navigate("/homeowner-upsell?onboarding=1");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingKind(null);
    }
  };

  if (mode === "signup" && signupStep === "type") {
    const options: { kind: AccountKind; icon: typeof Home; label: string; description: string }[] = [
      { kind: "homeowner", icon: Home, label: "Homeowner", description: "Manage maintenance, find pros, track your home" },
      { kind: "provider", icon: Building2, label: "Provider", description: "A contractor or service business taking jobs" },
      { kind: "mechanic", icon: Wrench, label: "Mechanic", description: "Auto/motorcycle repair, shop or mobile" },
    ];
    return (
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.kind}
            type="button"
            disabled={creatingKind !== null}
            onClick={() => handleAccountKindSelect(opt.kind)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all text-left disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {creatingKind === opt.kind ? (
                <Loader2 size={18} className="text-primary animate-spin" />
              ) : (
                <opt.icon size={18} className="text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSignupStep("info")}
          disabled={creatingKind !== null}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="pl-10"
              required
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type={mode === "login" ? "text" : "email"}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="pl-10 pr-10"
            required
            minLength={mode === "signup" ? PASSWORD_MIN : 6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {mode === "signup" && (
          <p className="text-xs text-muted-foreground">
            At least {PASSWORD_MIN} characters, with a letter and a number.
          </p>
        )}
      </div>

      {mode === "login" && (
        <div className="text-right">
          <button type="button" onClick={onForgot} className="text-sm text-primary hover:underline">Forgot password?</button>
        </div>
      )}

      {mode === "signup" && (
        <TosAgreement audience="homeowner" checked={acceptedTos} onCheckedChange={setAcceptedTos} />
      )}

      <Button type="submit" className="w-full h-11" size="lg" disabled={loading || (mode === "signup" && !acceptedTos)}>
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Continue"}
      </Button>
    </form>
  );
}

// Forgot password form
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setSent(true);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Check your email</h3>
        <p className="text-sm text-muted-foreground mb-4">We sent a password reset link to <strong>{email}</strong></p>
        <button onClick={onBack} className="text-sm text-primary hover:underline">Back to login</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Link"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Can't access that email?{" "}
        <Link to="/account-recovery" className="text-primary hover:underline">Recover with security questions</Link>
      </p>
    </form>
  );
}

export default Auth;