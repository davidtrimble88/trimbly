import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BusinessHoursPanel, { type BusinessHours } from "@/components/pro/BusinessHoursPanel";
import {
  MapPin, Briefcase, Star, Loader2, ShieldCheck, Award,
  MessageSquare, Zap, Clock, Phone, Pencil,

} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthGateDialog from "@/components/AuthGateDialog";
import StatsGrid from "@/components/profile/StatsGrid";
import ProviderPlansList from "@/components/pro/ProviderPlansList";
import SaveProviderButton from "@/components/SaveProviderButton";
import ReportDialog from "@/components/ReportDialog";

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
  slug: string | null;
  years_experience: number | null;
  licensed: boolean;
  insured: boolean;
  verified: boolean;
  subscription_tier: string;
  gallery_urls: string[];
  emergency_available: boolean;
  emergency_rate_multiplier: number;
  service_radius_miles: number;
  business_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  phone: string | null;
  show_phone_publicly: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

const PublicProviderProfile = () => {
  const { providerId = "", slug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gateOpen, setGateOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, bids: 0, reviews: 0, avgRating: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgReplyMinutes, setAvgReplyMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Note: phone/show_phone_publicly are excluded from the anon-visible
      // column grants (intentional, to keep phone numbers out of scraped
      // datasets). Selecting them here breaks the whole query for logged-out
      // visitors — including anyone scanning a yard-sign QR. Fetch them in a
      // second query only when the viewer is authenticated.
      const lookup = supabase
        .from("providers")
        .select("id, user_id, business_name, category, description, bio, city, state, country, slug, years_experience, licensed, insured, verified, subscription_tier, gallery_urls, emergency_available, emergency_rate_multiplier, service_radius_miles, business_hours");
      const { data: provBase, error: provErr } = slug
        ? await lookup.eq("slug", slug).maybeSingle()
        : await lookup.eq("id", providerId).maybeSingle();

      if (provErr) {
        console.error("PublicProviderProfile: failed to load provider", provErr);
        setLoadError(provErr.message);
        setLoading(false);
        return;
      }

      if (!provBase) {
        setLoading(false);
        return;
      }

      // Optional follow-up: phone fields (auth-only column grants).
      let phone: string | null = null;
      let show_phone_publicly = false;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: phoneRow } = await supabase
          .from("providers")
          .select("phone, show_phone_publicly")
          .eq("id", provBase.id)
          .maybeSingle();
        phone = phoneRow?.phone ?? null;
        show_phone_publicly = !!phoneRow?.show_phone_publicly;
      }
      const prov = { ...provBase, phone, show_phone_publicly };

      // Update SEO meta tags for the microsite
      const title = `${prov.business_name} — ${prov.category} in ${prov.city}, ${prov.state} | Trimbly`;
      const desc = (prov.bio || prov.description || `Hire ${prov.business_name}, a ${prov.category.toLowerCase()} pro serving ${prov.city}, ${prov.state}. View reviews, photos, and get a quote on Trimbly.`).slice(0, 158);
      document.title = title;
      const metaDesc = document.querySelector('meta[name="description"]') || (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
      metaDesc.setAttribute("content", desc);
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      if (prov.slug) canonical.setAttribute("href", `${window.location.origin}/pros/${prov.slug}`);

      // Track profile view (fire-and-forget; ignore failures)
      supabase.from("profile_views").insert({
        provider_id: prov.id,
        viewer_id: authUser?.id ?? null,
      }).then(() => {}, () => {});


      const [{ data: prof }, { count: completed }, { count: bids }, { data: revs }, { data: rt }] = await Promise.all([
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
        supabase
          .from("provider_response_times" as any)
          .select("avg_reply_minutes, sample_size")
          .eq("provider_id", prov.id)
          .maybeSingle(),
      ]);

      const reviewList = revs ?? [];
      const avg = reviewList.length
        ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
        : 0;

      setProvider(prov as ProviderRow);
      setAvatarUrl(prof?.avatar_url ?? null);
      setReviews(reviewList);
      const rtRow = rt as { avg_reply_minutes?: number; sample_size?: number } | null;
      if (rtRow?.avg_reply_minutes != null && (rtRow.sample_size || 0) >= 3) {
        setAvgReplyMinutes(Number(rtRow.avg_reply_minutes));
      }
      setStats({
        completed: completed ?? 0,
        bids: bids ?? 0,
        reviews: reviewList.length,
        avgRating: Math.round(avg * 10) / 10,
      });
      setLoading(false);
    })();
  }, [providerId, slug]);

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
          {loadError ? (
            <>
              <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
              <p className="text-muted-foreground mb-6">
                We couldn't load this profile right now — this usually means a temporary issue, not that the profile doesn't exist. Please try again in a moment.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Pro not found</h1>
              <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
            </>
          )}
          <Button asChild><Link to="/search">Browse pros</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const bioText = provider.bio?.trim() || provider.description?.trim() || "";
  const isOwner = !!user && user.id === provider.user_id;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.business_name,
    description: bioText || `${provider.category} pro in ${provider.city}, ${provider.state}`,
    image: avatarUrl || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: provider.city,
      addressRegion: provider.state,
      addressCountry: provider.country,
    },
    aggregateRating: stats.reviews > 0 ? {
      "@type": "AggregateRating",
      ratingValue: stats.avgRating,
      reviewCount: stats.reviews,
    } : undefined,
    url: provider.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/pros/${provider.slug}` : undefined,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="flex-1 pb-16">
        {/* Full-bleed hero — the thing that makes this feel like the pro's own
            site, not a card inside the app. */}
        <div className="relative pt-24 pb-16 sm:pb-20 overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
          <div className="absolute inset-0 opacity-[0.12]" style={{
            backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
            backgroundSize: "26px 26px",
          }} />
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end">
              <Avatar className="h-32 w-32 sm:h-36 sm:w-36 border-4 border-primary-foreground/90 shadow-[var(--card-shadow-hover)] shrink-0">
                <AvatarImage src={avatarUrl ?? undefined} alt={provider.business_name} />
                <AvatarFallback className="font-display text-3xl bg-primary-foreground text-primary">{provider.business_name?.[0]?.toUpperCase() ?? "P"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="font-display text-4xl sm:text-5xl font-semibold text-primary-foreground">{provider.business_name}</h1>
                <p className="text-primary-foreground/80 font-medium mt-1 text-lg">{provider.category}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-primary-foreground/70 mt-2">
                  <MapPin size={14} />
                  {[provider.city, provider.state, provider.country].filter(Boolean).join(", ")}
                  {provider.service_radius_miles > 0 && (
                    <span className="text-xs">· serves within {provider.service_radius_miles} mi</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-6 justify-center sm:justify-start">
              {provider.emergency_available && (
                <Badge className="bg-red-500 text-white hover:bg-red-600 gap-1">
                  <Zap size={12} /> Available for urgent jobs
                </Badge>
              )}
              {provider.verified && (
                <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/25 hover:bg-primary-foreground/20"><ShieldCheck size={12} className="mr-1" /> Verified</Badge>
              )}
              {provider.subscription_tier === "pro" && (
                <Badge className="bg-accent text-accent-foreground gap-1">
                  <Zap size={12} /> Pro
                </Badge>
              )}
              {avgReplyMinutes !== null && avgReplyMinutes <= 60 && (
                <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/25 hover:bg-primary-foreground/20 gap-1">
                  <Clock size={12} /> Replies in under {avgReplyMinutes < 15 ? "15 min" : avgReplyMinutes < 30 ? "30 min" : "1 hr"}
                </Badge>
              )}
              {provider.licensed && <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/25 hover:bg-primary-foreground/20">Licensed</Badge>}
              {provider.insured && <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/25 hover:bg-primary-foreground/20">Insured</Badge>}
              {provider.years_experience ? (
                <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/25 hover:bg-primary-foreground/20">
                  <Award size={12} className="mr-1" /> {provider.years_experience}+ yrs experience
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-6xl -mt-8 sm:-mt-10 relative z-10">
          <div className="grid lg:grid-cols-[1fr,340px] gap-6 items-start">
            {/* Main column */}
            <div className="space-y-6 min-w-0">
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
                <Card className="shadow-[var(--card-shadow)]">
                  <CardContent className="p-6">
                    <h2 className="font-display font-semibold text-lg text-foreground mb-3">About {provider.business_name}</h2>
                    <p className="text-muted-foreground whitespace-pre-line">{bioText}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recurring Plans */}
              <ProviderPlansList providerId={provider.id} />

              {/* Gallery */}
              {provider.gallery_urls?.length > 0 && (
                <Card className="shadow-[var(--card-shadow)]">
                  <CardContent className="p-6">
                    <h2 className="font-display font-semibold text-lg text-foreground mb-4">Portfolio</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                <Card className="shadow-[var(--card-shadow)]">
                  <CardContent className="p-6">
                    <h2 className="font-display font-semibold text-lg text-foreground mb-4">Recent Reviews</h2>
                    <div className="space-y-5">
                      {reviews.map((r) => (
                        <div key={r.id} className="flex gap-3 border-b border-border last:border-0 pb-5 last:pb-0">
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <Star size={15} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center text-accent">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                              <div className="ml-auto">
                                <ReportDialog targetType="review" targetId={r.id} />
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Contact / CTA card — the "get a quote" business-site staple */}
              <Card className="shadow-[var(--card-shadow-hover)] border-primary/15">
                <CardContent className="p-6">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-1">Get in touch</h2>
                  <p className="text-sm text-muted-foreground mb-4">Message {provider.business_name} directly through Trimbly.</p>
                  {provider.show_phone_publicly && provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary mb-4 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/30"
                    >
                      <Phone size={15} className="text-primary shrink-0" />
                      {provider.phone}
                    </a>
                  )}
                  <div className="space-y-2">
                    <Button
                      className="w-full rounded-lg"
                      size="lg"
                      onClick={() => user ? navigate(`/search?provider=${provider.id}`) : setGateOpen(true)}
                    >
                      <MessageSquare size={15} className="mr-1.5" /> Message
                    </Button>
                    {user ? (
                      <SaveProviderButton providerId={provider.id} />
                    ) : (
                      <Button variant="outline" className="w-full rounded-lg" onClick={() => setGateOpen(true)}>
                        Save Pro
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Hours */}
              {(provider.business_hours || isOwner) && (
                <Card className="shadow-[var(--card-shadow)]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
                        <Clock size={18} className="text-primary" /> Business Hours
                      </h2>
                      {isOwner && (
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setHoursDialogOpen(true)}>
                          <Pencil size={12} /> Edit
                        </Button>
                      )}
                    </div>
                    {provider.business_hours ? (
                      <ul className="divide-y divide-border">
                        {([
                          ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"],
                          ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
                        ] as const).map(([k, label]) => {
                          const h = provider.business_hours?.[k];
                          const fmt = (t: string) => {
                            const [hh, mm] = t.split(":").map(Number);
                            const period = hh >= 12 ? "PM" : "AM";
                            const h12 = ((hh + 11) % 12) + 1;
                            return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
                          };
                          return (
                            <li key={k} className="flex justify-between items-center py-2 text-sm">
                              <span className="text-foreground font-medium">{label}</span>
                              <span className={h?.closed ? "text-muted-foreground italic" : "text-muted-foreground"}>
                                {!h || h.closed ? "Closed" : `${fmt(h.open)} – ${fmt(h.close)}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        You haven't set your hours yet — homeowners can't see when you're open. Click Edit to add them.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <AuthGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        title={`Sign in to contact ${provider.business_name}`}
        description="Create a free Trimbly account or log in to message this pro or save them for later."
      />
      {isOwner && (
        <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit business hours</DialogTitle>
            </DialogHeader>
            <BusinessHoursPanel
              providerId={provider.id}
              initial={provider.business_hours as BusinessHours | null}
              onSaved={(hours) => {
                setProvider((p) => p ? { ...p, business_hours: hours } : p);
                setHoursDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      <Footer />
    </div>
  );
};

export default PublicProviderProfile;
