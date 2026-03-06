import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, SlidersHorizontal, Star, Shield, Clock, ArrowLeft } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categories = [
  "All", "Plumbing", "Electrical", "Handyman", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning",
];

const mockPros = [
  { id: 1, name: "Mike's Plumbing Co.", category: "Plumbing", rating: 4.9, reviews: 127, distance: "2.3 mi", hourlyRate: "$85–120", licensed: true, available: true, city: "Austin", state: "TX" },
  { id: 2, name: "Spark Electric Services", category: "Electrical", rating: 4.8, reviews: 89, distance: "3.1 mi", hourlyRate: "$90–140", licensed: true, available: true, city: "Austin", state: "TX" },
  { id: 3, name: "HandyDan Repairs", category: "Handyman", rating: 4.7, reviews: 203, distance: "1.5 mi", hourlyRate: "$60–95", licensed: true, available: false, city: "Round Rock", state: "TX" },
  { id: 4, name: "CoolBreeze HVAC", category: "HVAC", rating: 4.9, reviews: 156, distance: "4.2 mi", hourlyRate: "$100–160", licensed: true, available: true, city: "Dallas", state: "TX" },
  { id: 5, name: "GreenThumb Landscaping", category: "Landscaping", rating: 4.6, reviews: 74, distance: "5.0 mi", hourlyRate: "$55–80", licensed: false, available: true, city: "Houston", state: "TX" },
  { id: 6, name: "Perfect Coat Painters", category: "Painting", rating: 4.8, reviews: 112, distance: "3.8 mi", hourlyRate: "$70–110", licensed: true, available: true, city: "San Antonio", state: "TX" },
];

type SearchMode = "provider" | "location";

const SearchPros = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("provider");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = mockPros.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesProvider = searchMode === "provider"
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesLocation = searchMode === "location" && locationQuery
      ? `${p.city} ${p.state}`.toLowerCase().includes(locationQuery.toLowerCase())
      : searchMode === "provider" || !locationQuery;
    return matchesCategory && matchesProvider && matchesLocation;
  });

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
            <p className="text-muted-foreground">Browse trusted service providers in your area</p>
          </div>

          {/* Search mode toggle + inputs */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
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
            </div>

            <div className="flex gap-3">
              {searchMode === "provider" ? (
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by provider name or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              ) : (
                <div className="relative flex-1">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter city or state (e.g. Austin, TX)..."
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
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} pros found</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((pro) => (
              <div key={pro.id} className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-card-foreground">{pro.name}</h3>
                    <span className="text-xs text-muted-foreground">{pro.category}</span>
                  </div>
                  {pro.licensed && (
                    <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      <Shield size={12} /> Licensed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Star size={14} className="text-accent fill-accent" /> {pro.rating} ({pro.reviews})</span>
                  <span className="flex items-center gap-1"><MapPin size={14} /> {pro.city}, {pro.state} · {pro.distance}</span>
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchPros;
