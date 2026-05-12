import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Step = { label: string; done: boolean; href: string };

export default function ProfileCompletenessCard() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { count: homeCount }, { count: taskCount }, { count: binderCount }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, bio").eq("id", user.id).maybeSingle(),
        supabase.from("homes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("maintenance_tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("home_binder_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setSteps([
        { label: "Add your name", done: !!profile?.full_name && profile.full_name.length > 1, href: "/dashboard" },
        { label: "Upload a profile photo", done: !!profile?.avatar_url, href: "/dashboard" },
        { label: "Add your first home", done: (homeCount ?? 0) > 0, href: "/dashboard" },
        { label: "Generate a maintenance plan", done: (taskCount ?? 0) > 0, href: "/maintenance" },
        { label: "Add an item to your Home Binder", done: (binderCount ?? 0) > 0, href: "/binder" },
      ]);
      setLoaded(true);
    })();
  }, [user]);

  if (!loaded || steps.length === 0) return null;
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  if (pct === 100) return null;
  const next = steps.find((s) => !s.done);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">Get the most out of HomeHero</h3>
          <span className="text-xs text-muted-foreground">{pct}% complete</span>
        </div>
        <Progress value={pct} className="h-2 mb-4" />
        <ul className="space-y-2 mb-4">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <CheckCircle2 size={14} className="text-primary" />
              ) : (
                <Circle size={14} className="text-muted-foreground" />
              )}
              <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>{s.label}</span>
            </li>
          ))}
        </ul>
        {next && (
          <Link to={next.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {next.label} <ArrowRight size={14} />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
