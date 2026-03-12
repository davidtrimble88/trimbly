import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";
type UserType = "homeowner" | "provider";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [userType, setUserType] = useState<UserType>("homeowner");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await (await import("@/hooks/useAuth")).useAuth().signUp(
          form.email,
          form.password,
          { full_name: form.name, user_type: userType }
        );
        // Can't call hook like this, let's fix
      }
    } catch {}

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-2xl">H</span>
            </div>
          </Link>
          <h1 className="text-4xl font-extrabold text-primary-foreground mb-4 font-display">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Join HomeHero" : "Reset password"}
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md">
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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">H</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground">HomeHero</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1 font-display">
            {mode === "login" ? "Log in to your account" : mode === "signup" ? "Create your account" : "Forgot your password?"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "login" ? "Enter your credentials to continue" : mode === "signup" ? "Fill in your details to get started" : "Enter your email and we'll send you a reset link"}
          </p>

          {mode === "signup" && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setUserType("homeowner")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                  userType === "homeowner"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                I'm a Homeowner
              </button>
              <button
                onClick={() => setUserType("provider")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                  userType === "provider"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                I'm a Pro
              </button>
            </div>
          )}

          {mode === "forgot" ? (
            <ForgotPasswordForm onBack={() => setMode("login")} />
          ) : (
            <AuthForm
              mode={mode}
              userType={userType}
              form={form}
              setForm={setForm}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onForgot={() => setMode("forgot")}
            />
          )}

          {mode !== "forgot" && (
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? (
              <>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Sign up</button></>
            ) : mode === "signup" ? (
              <>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Log in</button></>
            ) : (
              <>Remember your password?{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Log in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

// Separate form component to use hooks properly
function AuthForm({
  mode,
  userType,
  form,
  setForm,
  showPassword,
  setShowPassword,
  onForgot,
}: {
  mode: AuthMode;
  userType: UserType;
  form: { name: string; email: string; password: string };
  setForm: (f: { name: string; email: string; password: string }) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onForgot: () => void;
}) {
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(form.email, form.password, {
          full_name: form.name,
          user_type: userType,
        });
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Check your email", description: "We sent you a confirmation link to verify your account." });
        }
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        } else {
          navigate("/search");
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            {userType === "provider" ? "Business Name" : "Full Name"}
          </Label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              placeholder={userType === "provider" ? "Your business name" : "Your full name"}
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
            type="email"
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
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {mode === "login" && (
        <div className="text-right">
          <button type="button" onClick={onForgot} className="text-sm text-primary hover:underline">Forgot password?</button>
        </div>
      )}

      <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
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
    </form>
  );
}

export default Auth;