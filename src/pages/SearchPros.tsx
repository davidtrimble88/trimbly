import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, ArrowLeft, Globe, Loader2, Home, Crown, Navigation } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import ProviderCard from "@/components/search/ProviderCard";
import ProviderDetailDialog from "@/components/search/ProviderDetailDialog";

import { fetchProviders, discoverWebProviders, type ProviderWithStats } from "@/lib/api/providers";
import { geocode, geocodeBatch, distanceMiles, type LatLon } from "@/lib/geocode";
import { logSearch } from "@/lib/analytics/searchLog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  "All", "General Contractor", "Plumbing", "Electrical", "Handyman", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning",
];

const radiusOptions = [
  { value: "25", label: "25 mi" },
  { value: "50", label: "50 mi" },
  { value: "100", label: "100 mi" },
  { value: "any", label: "Any distance" },
] as const;

type SearchMode = "provider" | "location";
type CountryFilter = "all" | "US" | "CA";
type RadiusValue = typeof radiusOptions[number]["value"];

const DEFAULT_SERVICE_RADIUS = 30; // miles, used when a provider hasn't set their own service_radius_miles

const SearchPros = () => {
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const { active: hasGarage } = useGarageSubscription();
  const [userType, setUserType] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");

  useEffect(() => {
    if (!user) { setUserType(null); return; }
    supabase.from("profiles").select("user_type, subscription_tier").eq("id", user.id).maybeSingle().then(({ data }) => {
      setUserType(data?.user_type ?? "homeowner");
      setSubscriptionTier(data?.subscription_tier ?? "free");
    });
  }, [user]);

  // Only swap to the homeowner dashboard shell once we positively know the user is a
  // logged-in homeowner — logged-out visitors and providers keep the public Navbar/Footer,
  // since this page is also reachable from marketing pages, SEO landing pages, and provider profiles.
  const isHomeownerCtx = !!user && userType !== null && userType !== "provider";

  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("location");
  const [activeCategory, setActiveCategory] = useState("All");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [radiusMiles, setRadiusMiles] = useState<RadiusValue>("50");
  const [dbProviders, setDbProviders] = useState<ProviderWithStats[]>([]);
  const [webProviders, setWebProviders] = useState<ProviderWithStats[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [geocodingCenter, setGeocodingCenter] = useState(false);
  const [locatingProviders, setLocatingProviders] = useState(false);
  const [loadingWeb, setLoadingWeb] = useState(false);
  const [webSearched, setWebSearched] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithStats | null>(null);
  const [locCoords, setLocCoords] = useState<Record<string, LatLon | null>>({});
  const { toast } = useToast();

  const [searchTrigger, setSearchTrigger] = useState(0);
  const hasSearched = searchTrigger > 0;

  const triggerSearch = () => {
    setSearchTrigger((n) => n + 1);
    const q = searchMode === "provider" ? searchQuery : locationQuery;
    if (q && q.trim()) {
      logSearch({
        search_type: "provider",
        query: q.trim(),
        category: activeCategory === "All" ? null : activeCategory,
        location: searchMode === "location" ? locationQuery : null,
        metadata: { mode: searchMode, country: countryFilter, radiusMiles },
      });
    }
  };

  // Load registered DB providers only after user searches
  useEffect(() => {
    if (!hasSearched) return;
    loadDbProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, countryFilter, searchMode, searchQuery, locationQuery, radiusMiles, searchTrigger]);

  const loadDbProviders = async () => {
    setLoadingDb(true);
    try {
      const data = await fetchProviders({
        category: activeCategory,
        country: countryFilter,
        searchQuery: searchMode === "provider" ? searchQuery : undefined,
      });

      // Location mode: geocode the search location + each unique provider location, then
      // filter/sort by real distance — respecting each pro's own service radius (falling back
      // to a sensible default when a pro hasn't set one) so nearby, relevant pros surface first.
      if (searchMode === "location" && locationQuery.trim()) {
        setGeocodingCenter(true);
        const center = await geocode(locationQuery.trim());
        setGeocodingCenter(false);

        if (!center) {
          toast({ title: "Couldn't pinpoint that location", description: "Showing broader matches by city/state instead.", variant: "destructive" });
          const fallback = await fetchProviders({
            category: activeCategory,
            country: countryFilter,
            locationTextFallback: locationQuery.trim(),
          });
          setDbProviders(fallback);
          setLoadingDb(false);
          return;
        }

        if (data.length > 0) {
          setLocatingProviders(true);
          const keys = data.map((p) => `${p.city}, ${p.state}, ${p.country}`);
          const freshlyGeocoded = await geocodeBatch(keys, locCoords);
          const mergedCoords = { ...locCoords, ...freshlyGeocoded };
          setLocCoords(mergedCoords);
          setLocatingProviders(false);

          const maxRadius = radiusMiles === "any" ? Infinity : Number(radiusMiles);
          const withDistance = data
            .map((p) => {
              const key = `${p.city}, ${p.state}, ${p.country}`;
              const coords = mergedCoords[key];
              if (!coords) return { ...p, distanceMiles: undefined };
              return { ...p, distanceMiles: distanceMiles(center, coords) };
            })
            .filter((p) => {
              if (p.distanceMiles === undefined) return false;
              const serviceRadius = p.service_radius_miles || DEFAULT_SERVICE_RADIUS;
              return p.distanceMiles <= maxRadius && p.distanceMiles <= serviceRadius;
            })
            .sort((a, b) => {
              const tierOrder = { elite: 0, pro: 1, free: 2 };
              const tierDiff = (tierOrder[a.subscription_tier as keyof typeof tierOrder] ?? 2) - (tierOrder[b.subscription_tier as keyof typeof tierOrder] ?? 2);
              if (tierDiff !== 0) return tierDiff;
              return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0);
            });

          setDbProviders(withDistance);
          setLoadingDb(false);
          return;
        }
      }

      setDbProviders(data);
    } catch {
      setDbProviders([]);
    } finally {
      setLoadingDb(false);
    }
  };

  // Auto-discover web providers only after user searches
  useEffect(() => {
    if (!hasSearched) return;
    setWebSearched(false);
    setWebProviders([]);

    const timer = setTimeout(() => {
      discoverFromWeb();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, countryFilter, searchQuery, locationQuery, searchMode, searchTrigger]);

  const discoverFromWeb = useCallback(async () => {
    setLoadingWeb(true);
    try {
      // Parse location from queries
      let city = "";
      let state = "";
      if (searchMode === "location" && locationQuery) {
        const parts = locationQuery.split(",").map((s) => s.trim());
        city = parts[0] || "";
        state = parts[1] || "";
      }

      const data = await discoverWebProviders({
        category: activeCategory !== "All" ? activeCategory : undefined,
        city: city || undefined,
        state: state || undefined,
        country: countryFilter !== "all" ? countryFilter : undefined,
        searchQuery: searchMode === "provider" ? searchQuery : undefined,
      });
      setWebProviders(data);
      setWebSearched(true);
    } catch (err: any) {
      console.error("Web discovery failed:", err);
      if (err?.message?.includes("429") || err?.message?.includes("Rate limit")) {
        toast({ title: "Rate limited", description: "Too many searches. Please wait a moment.", variant: "destructive" });
      }
      setWebProviders([]);
      setWebSearched(true);
    } finally {
      setLoadingWeb(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, countryFilter, searchQuery, locationQuery, searchMode]);

  const sortedDbProviders = dbProviders.map((p) => ({ ...p, source: "db" as const }));

  const uniqueWebProviders = webProviders.filter(
    (wp) =>
      (wp.phone || wp.website) &&
      !dbProviders.some((dp) => dp.business_name.toLowerCase() === wp.business_name.toLowerCase() && dp.city.toLowerCase() === wp.city.toLowerCase())
  );

  // Registered pros (real, in-service-area matches) always come first; web-discovered
  // providers only fill the remaining slots, up to 20 total.
  const webSlots = Math.max(0, 20 - sortedDbProviders.length);
  const allProviders = [
    ...sortedDbProviders,
    ...uniqueWebProviders.slice(0, webSlots),
  ];

  const loading = loadingDb || loadingWeb || geocodingCenter || locatingProviders;

  const mainContent = (
    <>
      <div className="mb-8">
        {!isHomeownerCtx && (
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft size={16} /> Back to home
          </Link>
        )}
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display mb-2">Find a Pro Near You</h1>
        <p className="text-muted-foreground">Registered, verified pros in your area show up first — we only fill in with web results if there aren't enough nearby.</p>
      </div>

      {/* Search card */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {([
            { mode: "location" as SearchMode, icon: MapPin, label: "By City / State" },
            { mode: "provider" as SearchMode, icon: Search, label: "By Provider" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                searchMode === mode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              <Icon size={14} className="inline mr-1.5 -mt-0.5" />
              {label}
            </button>
          ))}

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          <div className="flex gap-1.5">
            {([
              { value: "all" as CountryFilter, label: "All", icon: Globe },
              { value: "US" as CountryFilter, label: "🇺🇸 US", icon: null },
              { value: "CA" as CountryFilter, label: "🇨🇦 Canada", icon: null },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setCountryFilter(value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  countryFilter === value
                    ? "bg-secondary text-foreground border-border"
                    : "text-muted-foreground border-transparent hover:bg-secondary/50"
                }`}
              >
                {Icon && <Icon size={14} className="inline mr-1 -mt-0.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {searchMode === "provider" ? (
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by provider name, service, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
                className="pl-10 h-12"
              />
            </div>
          ) : (
            <div className="relative flex-1">
              <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter city or state (e.g. Austin, TX or Miami, FL)..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
                className="pl-10 h-12"
              />
            </div>
          )}
          <Button onClick={() => triggerSearch()} size="lg" className="h-12 gap-2" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
          </Button>
        </div>

        {searchMode === "location" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Navigation size={12} /> Radius:</span>
            {radiusOptions.map((r) => (
              <button
                key={r.value}
                onClick={() => setRadiusMiles(r.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  radiusMiles === r.value
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground border-transparent hover:bg-secondary/50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Source indicators */}
      {dbProviders.length > 0 && webProviders.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" /> {dbProviders.length} verified pro{dbProviders.length !== 1 ? "s" : ""} nearby
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" /> {webProviders.length} more found online
          </span>
        </div>
      )}

      {!hasSearched ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Search size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-bold text-lg text-foreground mb-2">Search for a pro</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter a search term or location above and hit Search to find service providers.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {geocodingCenter ? "Finding that location..." : locatingProviders ? "Measuring distance to pros..." : loading ? "Searching..." : `${allProviders.length} pro${allProviders.length !== 1 ? "s" : ""} found`}
            {countryFilter !== "all" && ` in ${countryFilter === "US" ? "United States" : "Canada"}`}
          </p>

          {loading && allProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {geocodingCenter ? "Finding that location..." : locatingProviders ? "Measuring distance to nearby pros..." : "Discovering providers..."}
              </p>
            </div>
          ) : allProviders.length === 0 && webSearched ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <MapPin size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">No pros found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Try a wider radius, a different category, or a nearby city.
              </p>
            </div>
          ) : (
            <>
              {loadingWeb && dbProviders.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Loader2 size={14} className="animate-spin" /> Discovering more providers online...
                </div>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProviders.map((pro) => (
                  <ProviderCard key={pro.id} provider={pro} onRequestQuote={setSelectedProvider} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ProviderDetailDialog
        provider={selectedProvider}
        open={!!selectedProvider}
        onOpenChange={(open) => !open && setSelectedProvider(null)}
      />
    </>
  );

  if (!isHomeownerCtx) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {mainContent}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = profileName || user!.user_metadata?.full_name || user!.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="find-pro"
      onNavigate={() => {}}
      header={{
        avatarIcon: Home,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
      {mainContent}
    </DashboardShell>
  );
};

export default SearchPros;
