import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, SlidersHorizontal, ArrowLeft, Globe, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProviderCard from "@/components/search/ProviderCard";
import AISearchBar from "@/components/search/AISearchBar";
import { fetchProviders, type ProviderWithStats } from "@/lib/api/providers";
import { mockPros } from "@/data/mockPros";

const categories = [
  "All", "Plumbing", "Electrical", "Handyman", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning",
];

type SearchMode = "provider" | "location" | "ai";
type CountryFilter = "all" | "US" | "CA";

const SearchPros = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("provider");
  const [activeCategory, setActiveCategory] = useState("All");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [providers, setProviders] = useState<ProviderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    loadProviders();
  }, [activeCategory, countryFilter, searchMode, searchQuery, locationQuery]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await fetchProviders({
        category: activeCategory,
        country: countryFilter,
        searchQuery: searchMode === "provider" ? searchQuery : undefined,
        locationQuery: searchMode === "location" ? locationQuery : undefined,
      });

      if (data.length === 0 && !searchQuery && !locationQuery && activeCategory === "All" && countryFilter === "all") {
        // No providers in DB yet, use mock data
        setUsingMockData(true);
        setProviders([]);
      } else {
        setUsingMockData(false);
        setProviders(data);
      }
    } catch {
      setUsingMockData(true);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fall back to mock data filtering when no real providers exist
  const displayProviders = usingMockData
    ? mockPros.filter((p) => {
        const matchesCategory = activeCategory === "All" || p.category === activeCategory;
        const matchesCountry = countryFilter === "all" || p.country === countryFilter;
        const query = searchQuery.toLowerCase().trim();
        const locQuery = locationQuery.toLowerCase().trim();

        const matchesProvider = searchMode === "provider" && query
          ? p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || p.city.toLowerCase().includes(query)
          : searchMode !== "location";

        const matchesLocation = searchMode === "location" && locQuery
          ? p.city.toLowerCase().includes(locQuery) || p.state.toLowerCase().includes(locQuery)
          : searchMode !== "location";

        return matchesCategory && matchesCountry && (searchMode === "ai" || matchesProvider || matchesLocation);
      }).map((p) => ({
        id: String(p.id),
        user_id: "",
        business_name: p.name,
        category: p.category,
        description: "",
        hourly_rate_min: parseInt(p.hourlyRate.replace(/[^0-9]/g, "")),
        hourly_rate_max: parseInt(p.hourlyRate.split("–")[1]?.replace(/[^0-9]/g, "") || "0"),
        currency: p.country === "CA" ? "CAD" : "USD",
        licensed: p.licensed,
        available: p.available,
        city: p.city,
        state: p.state,
        country: p.country,
        phone: null,
        website: null,
        years_experience: 0,
        avg_rating: p.rating,
        review_count: p.reviews,
      }))
    : providers;

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
            <p className="text-muted-foreground">Browse trusted service providers across the United States and Canada</p>
          </div>

          {/* Search mode toggle + country filter */}
          <div className="space-y-3 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {([
                { mode: "provider" as SearchMode, icon: Search, label: "By Provider" },
                { mode: "location" as SearchMode, icon: MapPin, label: "By City / State" },
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

              <button
                onClick={() => setSearchMode("ai")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  searchMode === "ai"
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:border-accent/30"
                }`}
              >
                ✨ AI Search
              </button>

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

            {searchMode === "ai" ? (
              <AISearchBar />
            ) : (
              <div className="flex gap-3">
                {searchMode === "provider" ? (
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by provider name, service, or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                      className="pl-10 h-12"
                    />
                  </div>
                )}
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

          {/* Results */}
          {usingMockData && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
              ✨ Showing sample providers. Sign up as a pro to list your business!
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            {displayProviders.length} pro{displayProviders.length !== 1 ? "s" : ""} found
            {countryFilter !== "all" && ` in ${countryFilter === "US" ? "United States" : "Canada"}`}
          </p>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : displayProviders.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <MapPin size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">No pros found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Try adjusting your search, changing the category filter, or searching in a different area.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProviders.map((pro) => (
                <ProviderCard key={pro.id} provider={pro} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchPros;
