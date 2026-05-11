import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Briefcase, CheckCircle, Star, Loader2, ShieldCheck, Award,
  MessageSquare, Inbox, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StatsGrid from "@/components/profile/StatsGrid";

interface ProviderRow {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  description: string | null;
  bio: string | null;
  city: string;
  state: string;
  country: string;
  years_experience: number | null;
  licensed: boolean;
  insured: boolean;
  verified: boolean;
  gallery_urls: string[];
  emergency_available: boolean;
  emergency_rate_multiplier: number;
  service_radius_miles: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

const PublicProviderProfile = () => {
  const { providerId = "" } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, bids: 0, reviews: 0, avgRating: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prov } = await supabase
        .from("providers")
        .select("id, user_id, business_name, category, description, bio, city, state, country, years_experience, licensed, insured, verified, gallery_urls, emergency_available, emergency_rate_multiplier, service_radius_miles")
        .eq("id", providerId)
        .maybeSingle();

      if (!prov) {
        setLoading(false);
        return;
      }

      // Track profile view (fire-and-forget; ignore failures)
      const { data: authData } = await supabase.auth.getUser();
      supabase.from("profile_views").insert({
        provider_id: prov.id,
        viewer_id: authData.user?.id ?? null,
      }).then(() => {}, () => {});

      const [{ data: prof }, { count: completed }, { count: bids }, { data: revs }] = await Promise.all([
        supabase.from("profiles").select("avatar_url").eq("id", prov.user_id).maybeSingle(),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", prov.id)
          .eq("status", "completed"),
        supabase.from("job_bids").select("id", { count: "exact", head: true }).eq("provider_id", prov.id),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("provider_id", prov.id)
          .eq("hidden", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const reviewList = revs ?? [];
      const avg = reviewList.length
        ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
        : 0;

      setProvider(prov as ProviderRow);
      setAvatarUrl(prof?.avatar_url ?? null);
      setReviews(reviewList);
      setStats({
        completed: completed ?? 0,
        bids: bids ?? 0,
        reviews: reviewList.length,
        avgRating: Math.round(avg * 10) / 10,
      });
      setLoading(false);
    })();
  }, [providerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 container mx-auto px-4 max-w-md text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Pro not found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
          <Button asChild><Link to="/search">Browse pros</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const bioText = provider.bio?.trim() || provider.description?.trim() || "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              <Avatar className="h-28 w-28">
                <AvatarImage src={avatarUrl ?? undefined} alt={provider.business_name} />
                <AvatarFallback>{provider.business_name?.[0]?.toUpperCase() ?? "P"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-extrabold text-foreground">{provider.business_name}</h1>
                <p className="text-primary font-medium mt-1">{provider.category}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-2">
                  <MapPin size={14} />
                  {[provider.city, provider.state, provider.country].filter(Boolean).join(", ")}
                  {provider.service_radius_miles > 0 && (
                    <span className="text-xs">· serves within {provider.service_radius_miles} mi</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                  {provider.emergency_available && (
                    <Badge className="bg-red-500 text-white hover:bg-red-600 gap-1">
                      <Zap size={12} /> Available for urgent jobs
                    </Badge>
                  )}
                  {provider.verified && (
                    <Badge variant="secondary"><ShieldCheck size={12} className="mr-1" /> Verified</Badge>
                  )}
                  {provider.licensed && <Badge variant="secondary">Licensed</Badge>}
                  {provider.insured && <Badge variant="secondary">Insured</Badge>}
                  {provider.years_experience ? (
                    <Badge variant="outline">
                      <Award size={12} className="mr-1" /> {provider.years_experience}+ yrs experience
                    </Badge>
                  ) : null}
                </div>
                <div className="flex gap-2 mt-5 justify-center sm:justify-start">
                  <Button onClick={() => navigate(`/search?provider=${provider.id}`)}>
                    <MessageSquare size={14} className="mr-1.5" /> Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <StatsGrid
            stats={[
              { label: "Jobs Completed", value: stats.completed, icon: CheckCircle },
              { label: "Bids Submitted", value: stats.bids, icon: Inbox },
              { label: "Reviews", value: stats.reviews, icon: Star },
              { label: "Avg Rating", value: stats.avgRating || "—", icon: Star },
            ]}
          />

          {/* About */}
          {bioText && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg text-foreground mb-3">About</h2>
                <p className="text-muted-foreground whitespace-pre-line">{bioText}</p>
              </CardContent>
            </Card>
          )}

          {/* Recurring Plans */}
          <ProviderPlansList providerId={provider.id} />

          {/* Gallery */}
          {provider.gallery_urls?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg text-foreground mb-4">Portfolio</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {provider.gallery_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity">
                      <img src={url} alt="Portfolio" className="object-cover w-full h-full" loading="lazy" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg text-foreground mb-4">Recent Reviews</h2>
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center text-primary">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicProviderProfile;
