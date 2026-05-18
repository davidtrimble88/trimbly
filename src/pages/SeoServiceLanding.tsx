import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Star, ShieldCheck, Briefcase, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseCityStateSlug, setSeo, injectJsonLd, slugify } from "@/lib/seo";

type Provider = {
  id: string;
  business_name: string;
  category: string;
  city: string;
  state: string;
  slug: string | null;
  verified: boolean;
  licensed: boolean;
  insured: boolean;
  years_experience: number | null;
};

const titleCase = (s: string) =>
  s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

const SeoServiceLanding = () => {
  const { category = "", location = "" } = useParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const { city, state } = parseCityStateSlug(location);
  const categoryLabel = titleCase(category.replace(/-/g, " "));
  const locationLabel = [city, state].filter(Boolean).join(", ");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("providers")
        .select("id, business_name, category, city, state, slug, verified, licensed, insured, years_experience")
        .ilike("category", categoryLabel)
        .ilike("city", city || "%")
        .eq("hidden", false)
        .order("verified", { ascending: false })
        .order("years_experience", { ascending: false })
        .limit(50);
      setProviders((data as Provider[]) || []);
      setLoading(false);
    })();
  }, [category, location, city, categoryLabel]);

  useEffect(() => {
    const title = `${categoryLabel} in ${locationLabel} | Vetted Local Pros — Trimbly`;
    const description = `Find trusted ${categoryLabel.toLowerCase()} pros in ${locationLabel}. Compare reviews, response times, and bids on Trimbly.`.slice(0, 158);
    const canonical = `${window.location.origin}/services/${slugify(categoryLabel)}/${location}`;
    setSeo({ title, description, canonical });

    injectJsonLd("ld-seo-landing", {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      itemListElement: providers.slice(0, 20).map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "LocalBusiness",
          name: p.business_name,
          url: p.slug ? `${window.location.origin}/pros/${p.slug}` : `${window.location.origin}/pro/${p.id}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: p.city,
            addressRegion: p.state,
          },
        },
      })),
    });
  }, [providers, categoryLabel, locationLabel, location]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <nav className="text-xs text-muted-foreground mb-3">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span className="mx-1.5">/</span>
            <Link to="/search" className="hover:text-foreground">Services</Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{categoryLabel} {locationLabel && `in ${locationLabel}`}</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-foreground">
              {categoryLabel} pros in {locationLabel || "your area"}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Compare vetted local {categoryLabel.toLowerCase()} pros{locationLabel ? ` near ${locationLabel}` : ""}. See reviews, licensing, and typical response times — then message them directly through Trimbly.
            </p>
            <div className="flex gap-2 mt-4">
              <Button asChild><Link to={`/search?category=${encodeURIComponent(categoryLabel)}&location=${encodeURIComponent(locationLabel)}`}>Browse all pros</Link></Button>
              <Button variant="outline" asChild><Link to="/post-job">Post a job</Link></Button>
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
          ) : providers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Briefcase size={32} className="mx-auto text-muted-foreground mb-3" />
                <h2 className="font-bold text-lg mb-1">No {categoryLabel.toLowerCase()} pros listed yet in {locationLabel || "this area"}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Post a job and pros in nearby areas will bid to help.
                </p>
                <Button asChild><Link to="/post-job">Post a job</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {providers.map((p) => (
                <Card key={p.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-5">
                    <Link to={p.slug ? `/pros/${p.slug}` : `/pro/${p.id}`} className="block group">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {p.business_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin size={12} /> {p.city}, {p.state}
                        <span>·</span>
                        <Briefcase size={12} /> {p.category}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.verified && <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck size={10} /> Verified</Badge>}
                        {p.licensed && <Badge variant="outline" className="text-[10px]">Licensed</Badge>}
                        {p.insured && <Badge variant="outline" className="text-[10px]">Insured</Badge>}
                        {p.years_experience ? <Badge variant="outline" className="text-[10px]">{p.years_experience}+ yrs</Badge> : null}
                      </div>
                      <div className="text-xs text-primary font-medium mt-3 inline-flex items-center gap-1">
                        View profile <ArrowRight size={12} />
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <section className="mt-12 prose prose-sm max-w-none text-muted-foreground">
            <h2 className="text-xl font-bold text-foreground font-display">How Trimbly works in {locationLabel || "your area"}</h2>
            <p>
              Every pro on Trimbly is verified and reviewed by real homeowners. Messaging is in-app for your safety — pros only get your phone number after you approve it. No spam calls, no surprise charges.
            </p>
            <ol>
              <li><strong className="text-foreground">Tell us what you need.</strong> Post a job or browse {categoryLabel.toLowerCase()} pros above.</li>
              <li><strong className="text-foreground">Compare bids.</strong> Pros send you quotes through the app — you pick who you trust.</li>
              <li><strong className="text-foreground">Get it done.</strong> Track the job, message your pro, and leave a review when it's complete.</li>
            </ol>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SeoServiceLanding;
