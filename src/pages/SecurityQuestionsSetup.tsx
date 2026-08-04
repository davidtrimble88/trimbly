import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldQuestion, LogOut } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SECURITY_QUESTIONS } from "@/lib/securityQuestions";

const SecurityQuestionsSetup = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  const [questions, setQuestions] = useState<[string, string, string]>(["", "", ""]);
  const [answers, setAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [loading, setLoading] = useState(false);

  const setQuestion = (i: number, v: string) => {
    const next = [...questions] as [string, string, string];
    next[i] = v;
    setQuestions(next);
  };
  const setAnswer = (i: number, v: string) => {
    const next = [...answers] as [string, string, string];
    next[i] = v;
    setAnswers(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.some((q) => !q) || answers.some((a) => !a.trim())) {
      toast({ title: "All three required", description: "Pick a question and give an answer for each of the three.", variant: "destructive" });
      return;
    }
    if (new Set(questions).size !== 3) {
      toast({ title: "Pick three different questions", description: "Each of the three questions must be different.", variant: "destructive" });
      return;
    }
    if (answers.some((a) => a.trim().length < 2)) {
      toast({ title: "Answers too short", description: "Each answer should be at least 2 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc("set_security_questions" as any, {
        p_question_1: questions[0], p_answer_1: answers[0],
        p_question_2: questions[1], p_answer_2: answers[1],
        p_question_3: questions[2], p_answer_3: answers[2],
      } as any);
      if (error) {
        toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Security questions saved", description: "You can use these to recover your account if you ever forget your password." });
      navigate(redirect, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8"><BrandMark className="w-8 h-8" /></div>
          <span className="font-display font-bold text-xl text-foreground">Trimbly</span>
        </div>

        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <ShieldQuestion className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1 font-display">Set up account recovery</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Pick three security questions and answer them. If you ever forget your password and can't access your email,
          these let you get back in on your own.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-4">
              <Label className="text-xs">Question {i + 1}</Label>
              <Select value={questions[i]} onValueChange={(v) => setQuestion(i, v)}>
                <SelectTrigger><SelectValue placeholder="Choose a question" /></SelectTrigger>
                <SelectContent>
                  {SECURITY_QUESTIONS.filter((q) => q === questions[i] || !questions.includes(q)).map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs">Your answer</Label>
              <Input
                value={answers[i]}
                onChange={(e) => setAnswer(i, e.target.value)}
                placeholder="Answer"
              />
            </div>
          ))}

          <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </form>

        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out instead
        </button>
      </div>
    </div>
  );
};

export default SecurityQuestionsSetup;
