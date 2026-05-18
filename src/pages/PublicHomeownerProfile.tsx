import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Briefcase, CheckCircle, Star, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StatsGrid from "@/components/profile/StatsGrid";

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  created_at: string;
  user_type: string;
  gallery_urls: string[];
}

const PublicHomeownerProfile = () => {
  const { userId = "" } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [homes, setHomes] = useState<{ city: string; state: string; country: string }[]>([]);
  const [stats, setStats] = useState({ posted: 0, completed: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, is_public, created_at, user_type, gallery_urls")
        .eq("id", userId)
        .maybeSingle();

      if (!prof || !prof.is_public) {
        setProfile(prof as ProfileData | null);
        setLoading(false);
        return;
      }

      const [{ data: homeRows }, { count: posted }, { count: completed }, { count: reviews }] = await Promise.all([
        supabase.from("homes").select("city, state, country").eq("user_id", userId),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("homeowner_id", userId),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("homeowner_id", userId)
          .eq("status", "completed"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewer_id", userId),
      ]);

      setProfile(prof as ProfileData);
      setHomes(homeRows ?? []);
      setStats({ posted: posted ?? 0, completed: completed ?? 0, reviews: reviews ?? 0 });
      setLoading(false);
    })();
  }, [userId]);

  const memberSince = profile ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !profile.is_public) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-md text-center py-16">
            <Lock size={48} className="mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Profile is private</h1>
            <p className="text-muted-foreground mb-6">
              This user hasn't made their profile public, or the link is incorrect.
            </p>
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <Card>
            <CardContent className="p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              <Avatar className="h-28 w-28">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                <AvatarFallback>{profile.full_name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-extrabold text-foreground">{profile.full_name || "Trimbly User"}</h1>
                <Badge variant="secondary" className="mt-2">
                  <Calendar size={12} className="mr-1.5" />
                  Member since {memberSince}
                </Badge>
                {profile.bio && <p className="text-muted-foreground mt-4 whitespace-pre-line">{profile.bio}</p>}
              </div>
            </CardContent>
          </Card>

          <StatsGrid
            stats={[
              { label: "Jobs Posted", value: stats.posted, icon: Briefcase },
              { label: "Jobs Completed", value: stats.completed, icon: CheckCircle },
              { label: "Reviews Written", value: stats.reviews, icon: Star },
              { label: "Homes", value: homes.length, icon: MapPin },
            ]}
          />

          {homes.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                  <MapPin size={18} className="text-primary" /> Home locations
                </h2>
                <div className="flex flex-wrap gap-2">
                  {homes.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1.5">
                      {[h.city, h.state, h.country].filter(Boolean).join(", ")}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Street addresses are never shown.</p>
              </CardContent>
            </Card>
          )}

          {profile.gallery_urls?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg text-foreground mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {profile.gallery_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity">
                      <img src={url} alt="Gallery" className="object-cover w-full h-full" loading="lazy" />
                    </a>
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

export default PublicHomeownerProfile;
