import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  provider_id: string;
};

type WithProvider = ReviewRow & { business_name: string; city: string; state: string; slug: string | null };

// Pulls REAL reviews from the database. Renders nothing if there aren't enough
// real testimonials yet — we deliberately do not show placeholders.
const TestimonialsSection = () => {
  const [reviews, setReviews] = useState<WithProvider[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: revs } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, provider_id")
        .gte("rating", 4)
        .eq("hidden", false)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);

      const filtered = (revs || []).filter((r) => (r.comment || "").trim().length > 30);
      if (filtered.length < 3) {
        setLoaded(true);
        return;
      }

      const providerIds = Array.from(new Set(filtered.map((r) => r.provider_id)));
      const { data: provs } = await supabase
        .from("providers")
        .select("id, business_name, city, state, slug")
        .in("id", providerIds);

      const provMap = new Map((provs || []).map((p) => [p.id, p]));
      const enriched = filtered
        .map((r) => {
          const p = provMap.get(r.provider_id);
          if (!p) return null;
          return { ...r, business_name: p.business_name, city: p.city, state: p.state, slug: p.slug };
        })
        .filter(Boolean) as WithProvider[];

      setReviews(enriched.slice(0, 6));
      setLoaded(true);
    })();
  }, []);

  if (!loaded || reviews.length < 3) return null;

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-foreground">
            What homeowners are saying
          </h2>
          <p className="text-muted-foreground mt-2">Real reviews from people who hired real pros on Trimbly.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <Card key={r.id} className="bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 text-primary mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  "{r.comment}"
                </p>
                <div className="text-xs text-muted-foreground">
                  for <span className="font-semibold text-foreground">{r.business_name}</span>
                  {r.city && ` · ${r.city}, ${r.state}`}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
