import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, SlidersHorizontal, Star, Shield, Clock, ArrowLeft, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockPros } from "@/data/mockPros";

const categories = [
  "All", "Plumbing", "Electrical", "Handyman", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning",
];

type SearchMode = "provider" | "location";
type CountryFilter = "all" | "US" | "CA";

const SearchPros = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("provider");
  const [activeCategory, setActiveCategory] = useState("All");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");

  const filtered = useMemo(() => {
    return mockPros.filter((p) => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      const matchesCountry = countryFilter === "all" || p.country === countryFilter;

      const query = searchQuery.toLowerCase().trim();
      const locQuery = locationQuery.toLowerCase().trim();

      const matchesProvider = searchMode === "provider" && query
        ? p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.state.toLowerCase().includes(query)
        : searchMode === "provider";

      const matchesLocation = searchMode === "location" && locQuery
        ? p.city.toLowerCase().includes(locQuery) ||
          p.state.toLowerCase().includes(locQuery) ||
          `${p.city}, ${p.state}`.toLowerCase().includes(locQuery) ||
          `${p.city} ${p.state}`.toLowerCase().includes(locQuery)
        : searchMode !== "location";

      return matchesCategory && matchesCountry && (matchesProvider || matchesLocation);
    });
  }, [searchQuery, locationQuery, searchMode, activeCategory, countryFilter]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
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
              <button
                onClick={() => setSearchMode("provider")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  searchMode === "provider"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                <Search size={14} className="inline mr-1.5 -mt-0.5" />
                By Provider
              </button>
              <button
                onClick={() => setSearchMode("location")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  searchMode === "location"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                <MapPin size={14} className="inline mr-1.5 -mt-0.5" />
                By City / State
              </button>

              <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

              <div className="flex gap-1.5">
                {([
                  { value: "all" as CountryFilter, label: "All", icon: Globe },
                  { value: "US" as CountryFilter, label: "🇺🇸 US", icon: null },
                  { value: "CA" as CountryFilter, label: "🇨🇦 Canada", icon: null },
                ]).map(({ value, label, icon: Icon }) => (
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
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} pro{filtered.length !== 1 ? "s" : ""} found
            {countryFilter !== "all" && ` in ${countryFilter === "US" ? "United States" : "Canada"}`}
            {searchMode === "location" && locationQuery && ` matching "${locationQuery}"`}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <MapPin size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">No pros found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Try adjusting your search, changing the category filter, or searching in a different area.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((pro) => (
                <div key={pro.id} className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-card-foreground">{pro.name}</h3>
                      <span className="text-xs text-muted-foreground">{pro.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{pro.country === "US" ? "🇺🇸" : "🇨🇦"}</span>
                      {pro.licensed && (
                        <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                          <Shield size={12} /> Licensed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Star size={14} className="text-accent fill-accent" /> {pro.rating} ({pro.reviews})</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> {pro.city}, {pro.state}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-card-foreground">{pro.hourlyRate}/hr</span>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-xs ${pro.available ? "text-primary" : "text-muted-foreground"}`}>
                        <Clock size={12} /> {pro.available ? "Available" : "Booked"}
                      </span>
                      <Button size="sm" disabled={!pro.available}>
                        {pro.available ? "Request Quote" : "Unavailable"}
                      </Button>
                    </div>
                  </div>
                </div>
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
