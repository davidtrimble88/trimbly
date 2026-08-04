import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, CheckCircle, Eye, EyeOff } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AccountRecovery = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<"identify" | "answer" | "done">("identify");
  const [identifier, setIdentifier] = useState("");
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setNotFound(false);
    try {
      const { data, error } = await supabase.functions.invoke("recover-account", {
        body: { action: "get-questions", identifier: identifier.trim() },
      });
      if (error) {
        toast({ title: "Something went wrong", description: "Please try again in a moment.", variant: "destructive" });
        return;
      }
      if (!data?.questions) {
        setNotFound(true);
        return;
      }
      setQuestions(data.questions);
      setStep("answer");
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.some((a) => !a.trim())) {
      toast({ title: "Answer all three", description: "Every question needs an answer.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("recover-account", {
        body: {
          action: "recover",
          identifier: identifier.trim(),
          answer1: answers[0], answer2: answers[1], answer3: answers[2],
          newPassword,
        },
      });
      if (error || data?.error) {
        toast({ title: "Couldn't recover account", description: data?.error || "Please try again.", variant: "destructive" });
        return;
      }
      setStep("done");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 font-display">Password reset</h1>
          <p className="text-muted-foreground mb-6">Your password has been updated. You can log in now.</p>
          <Button onClick={() => navigate("/auth")} className="w-full h-11" size="lg">Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8"><BrandMark className="w-8 h-8" /></div>
          <span className="font-display font-bold text-xl text-foreground">Trimbly</span>
        </div>

        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1 font-display">Recover your account</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Answer your security questions to reset your password without needing email access.
        </p>

        {step === "identify" && (
          <form onSubmit={handleIdentify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">Email or username</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {notFound && (
              <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/30 p-3">
                If that account exists and has security questions set up, we'd show them here. Double-check what you entered,
                or use the <Link to="/auth" className="text-primary hover:underline">email reset link</Link> instead.
              </p>
            )}
            <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
              {loading ? "Looking..." : "Continue"}
            </Button>
          </form>
        )}

        {step === "answer" && questions && (
          <form onSubmit={handleRecover} className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="space-y-2">
                <Label className="text-sm font-medium">{q}</Label>
                <Input
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="Your answer"
                  required
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label className="text-sm font-medium">New password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Confirm new password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
              {loading ? "Verifying..." : "Reset Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AccountRecovery;
