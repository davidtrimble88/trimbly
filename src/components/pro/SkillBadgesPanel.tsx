import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Zap, Trophy, Shield, Flame, MessageCircle, ThumbsUp, Lock } from "lucide-react";

type BadgeDef = {
  id: string;
  label: string;
  desc: string;
  icon: any;
  earned: boolean;
  progress?: string;
};

export default function SkillBadgesPanel({ providerId, userId }: { providerId: string; userId: string }) {
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: jobs }, { data: reviews }, { data: bids }, { data: provider }] = await Promise.all([
        supabase.from("jobs").select("id, status").eq("provider_id", providerId),
        supabase.from("reviews").select("rating").eq("provider_id", providerId),
        supabase.from("job_bids").select("id, status, created_at").eq("provider_id", providerId),
        supabase.from("providers").select("verified, licensed, insured, years_experience, emergency_available").eq("id", providerId).maybeSingle(),
      ]);

      const completed = (jobs || []).filter(j => j.status === "completed").length;
      const totalReviews = (reviews || []).length;
      const fiveStars = (reviews || []).filter(r => r.rating === 5).length;
      const avgRating = totalReviews ? (reviews || []).reduce((s, r) => s + r.rating, 0) / totalReviews : 0;
      const acceptedBids = (bids || []).filter(b => b.status === "accepted").length;
      const totalBids = (bids || []).length;
      const winRate = totalBids ? acceptedBids / totalBids : 0;

      const defs: BadgeDef[] = [
        { id: "first-job", label: "First Job", desc: "Complete your first job", icon: Trophy, earned: completed >= 1, progress: `${completed}/1` },
        { id: "ten-jobs", label: "Veteran", desc: "10 completed jobs", icon: Award, earned: completed >= 10, progress: `${completed}/10` },
        { id: "fifty-jobs", label: "Master Pro", desc: "50 completed jobs", icon: Flame, earned: completed >= 50, progress: `${completed}/50` },
        { id: "five-star", label: "5-Star Rated", desc: "Average rating 4.8+ with 5+ reviews", icon: Star, earned: avgRating >= 4.8 && totalReviews >= 5 },
        { id: "ten-fives", label: "Crowd Favorite", desc: "10 five-star reviews", icon: ThumbsUp, earned: fiveStars >= 10, progress: `${fiveStars}/10` },
        { id: "responsive", label: "Quick Bidder", desc: "Send 25 bids", icon: Zap, earned: totalBids >= 25, progress: `${totalBids}/25` },
        { id: "high-win", label: "High Win Rate", desc: "50%+ win rate with 10+ bids", icon: MessageCircle, earned: winRate >= 0.5 && totalBids >= 10 },
        { id: "verified", label: "Verified Pro", desc: "Identity & credentials verified", icon: Shield, earned: !!provider?.verified },
        { id: "licensed", label: "Licensed", desc: "License on file", icon: Shield, earned: !!provider?.licensed },
        { id: "insured", label: "Insured", desc: "Insurance on file", icon: Shield, earned: !!provider?.insured },
        { id: "experienced", label: "10+ Years", desc: "A decade of experience", icon: Award, earned: (provider?.years_experience || 0) >= 10 },
        { id: "emergency", label: "Emergency Ready", desc: "Available after-hours", icon: Flame, earned: !!provider?.emergency_available },
      ];

      setBadges(defs);
      setLoading(false);
    })();
  }, [providerId]);

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Skill Badges</h3>
          </div>
          <Badge variant="secondary" className="text-xs">{earnedCount} / {badges.length} earned</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {badges.map(b => {
              const Icon = b.earned ? b.icon : Lock;
              return (
                <div
                  key={b.id}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    b.earned
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/30 opacity-60"
                  }`}
                >
                  <Icon className={`mx-auto h-6 w-6 mb-1.5 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-xs font-semibold ${b.earned ? "text-foreground" : "text-muted-foreground"}`}>{b.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{b.desc}</p>
                  {b.progress && !b.earned && (
                    <p className="text-[10px] text-primary mt-1 font-medium">{b.progress}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
