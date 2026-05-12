import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, SlidersHorizontal, ArrowLeft, Globe, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProviderCard from "@/components/search/ProviderCard";
import ProviderDetailDialog from "@/components/search/ProviderDetailDialog";

import { fetchProviders, discoverWebProviders, type ProviderWithStats } from "@/lib/api/providers";
import { logSearch } from "@/lib/analytics/searchLog";
import { useToast } from "@/hooks/use-toast";

const categories = [
  "All", "Plumbing", "Electrical", "Handyman", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning",
];

type SearchMode = "provider" | "location";
type CountryFilter = "all" | "US" | "CA";

const SearchPros = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("location");
  const [activeCategory, setActiveCategory] = useState("All");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [dbProviders, setDbProviders] = useState<ProviderWithStats[]>([]);
  const [webProviders, setWebProviders] = useState<ProviderWithStats[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [loadingWeb, setLoadingWeb] = useState(false);
  const [webSearched, setWebSearched] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithStats | null>(null);
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
        metadata: { mode: searchMode, country: countryFilter },
      });
    }
  };

  // Load registered DB providers only after user searches
  useEffect(() => {
    if (!hasSearched) return;
    loadDbProviders();
  }, [activeCategory, countryFilter, searchMode, searchQuery, locationQuery, searchTrigger]);

  const loadDbProviders = async () => {
    setLoadingDb(true);
    try {
      const data = await fetchProviders({
        category: activeCategory,
        country: countryFilter,
        searchQuery: searchMode === "provider" ? searchQuery : undefined,
        locationQuery: searchMode === "location" ? locationQuery : undefined,
      });
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
  }, [activeCategory, countryFilter, searchQuery, locationQuery, searchMode]);

  // Merge: registered pros first (sorted by tier + rating), then web fills up to 20
  const tierOrder = { elite: 0, pro: 1, free: 2 };
  const sortedDbProviders = [...dbProviders]
    .map((p) => ({ ...p, source: "db" as const }))
    .sort((a, b) => {
      const tierDiff = (tierOrder[a.subscription_tier as keyof typeof tierOrder] ?? 2) - (tierOrder[b.subscription_tier as keyof typeof tierOrder] ?? 2);
      if (tierDiff !== 0) return tierDiff;
      return (b.avg_rating || 0) - (a.avg_rating || 0);
    });

  const uniqueWebProviders = webProviders.filter(
    (wp) =>
      (wp.phone || wp.website) &&
      !dbProviders.some((dp) => dp.business_name.toLowerCase() === wp.business_name.toLowerCase() && dp.city.toLowerCase() === wp.city.toLowerCase())
  );

  // Show all registered pros; fill remaining slots (up to 20 total) with web providers
  const webSlots = Math.max(0, 20 - sortedDbProviders.length);
  const allProviders = [
    ...sortedDbProviders,
    ...uniqueWebProviders.slice(0, webSlots),
  ];

  const loading = loadingDb || loadingWeb;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={16} /> Back to home
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display mb-2">Find a Pro Near You</h1>
            <p className="text-muted-foreground">Discover trusted service providers across the United States and Canada</p>
          </div>

          {/* Search mode toggle + country filter */}
          <div className="space-y-3 mb-6">
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
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
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

            {(
              <div className="flex gap-3">
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
                      placeholder="Enter city or state/province (e.g. Toronto, ON or Miami, FL)..."
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
                      className="pl-10 h-12"
                    />
                  </div>
                )}
                <Button onClick={() => triggerSearch()} size="lg" className="h-12 gap-2">
                  <Search size={16} /> Search
                </Button>
                <Button variant="outline" size="lg" className="h-12 gap-2">
                  <SlidersHorizontal size={16} /> Filters
                </Button>
              </div>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
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
                <span className="w-2 h-2 rounded-full bg-primary" /> {dbProviders.length} verified pro{dbProviders.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" /> {webProviders.length} discovered online
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
            {loading ? "Searching..." : `${allProviders.length} pro${allProviders.length !== 1 ? "s" : ""} found`}
            {countryFilter !== "all" && ` in ${countryFilter === "US" ? "United States" : "Canada"}`}
          </p>

          {loading && allProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Discovering providers...</p>
            </div>
          ) : allProviders.length === 0 && webSearched ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <MapPin size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">No pros found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Try adjusting your search, changing the category filter, or searching in a different area.
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchPros;
