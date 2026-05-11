import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, FileText, ExternalLink, Loader2, Download, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Result = {
  title: string;
  url: string;
  description?: string;
  isPdf: boolean;
  source: string;
};

const ManualSearch = () => {
  const { toast } = useToast();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [productType, setProductType] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      toast({ title: "Missing info", description: "Please enter both brand and model number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("find-manual", {
        body: { brand, model, productType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data?.results || []);
      if (!data?.results?.length) {
        toast({ title: "No manuals found", description: "Try a different model number or add a product type." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      toast({ title: "Search error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} /> Back to dashboard
          </Link>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="text-primary" size={24} />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
              User Manual Finder
            </h1>
            <p className="text-muted-foreground">
              Enter the brand and model number of any appliance or device — we'll find the user manual and make it downloadable.
            </p>
          </div>

          <Card className="p-6 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g., Whirlpool"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model Number *</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g., WRF555SDFZ"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="type">Product Type (optional)</Label>
                <Input
                  id="type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="e.g., refrigerator, dishwasher, HVAC"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <><Loader2 className="animate-spin mr-2" size={18} /> Searching...</>
                ) : (
                  <><Search className="mr-2" size={18} /> Find Manual</>
                )}
              </Button>
            </form>
          </Card>

          {searched && !loading && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                {results.length > 0 ? `${results.length} result${results.length === 1 ? "" : "s"}` : "No results"}
              </h2>
              {results.map((r, i) => (
                <Card key={i} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.isPdf ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-foreground truncate">{r.title}</h3>
                        {r.isPdf && <Badge variant="secondary" className="text-[10px]">PDF</Badge>}
                      </div>
                      {r.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">{r.source}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button asChild size="sm" variant={r.isPdf ? "default" : "outline"}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" download={r.isPdf}>
                            {r.isPdf ? <><Download size={14} className="mr-1.5" /> Download</> : <><ExternalLink size={14} className="mr-1.5" /> Open</>}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManualSearch;
