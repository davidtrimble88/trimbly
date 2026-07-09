import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Download, BookOpen, FileX, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { logSearch } from "@/lib/analytics/searchLog";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type ManualResult = {
  title: string;
  url: string;
  description?: string;
  isPdf: boolean;
  source: string;
};

const buildProxyUrl = (manualUrl: string, mode: "inline" | "download", filename: string) => {
  const params = new URLSearchParams({ url: manualUrl, mode, filename });
  return `${SUPABASE_URL}/functions/v1/manual-proxy?${params.toString()}`;
};

const ManualSearch = () => {
  const { toast } = useToast();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [productType, setProductType] = useState("");
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState<ManualResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requestSources, setRequestSources] = useState<ManualResult[]>([]);

  const filename = `${brand}-${model}-manual`.replace(/\s+/g, "-").toLowerCase() || "user-manual";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      toast({ title: "Missing info", description: "Please enter both brand and model number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setManual(null);
    setNotFound(false);
    setRequestSources([]);
    try {
      const { data, error } = await supabase.functions.invoke("find-manual", {
        body: { brand, model, productType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const results: ManualResult[] = data?.results || [];
      const sources: ManualResult[] = data?.requestSources || [];
      const topPdf = results.find((r) => r.isPdf) || null;
      logSearch({
        search_type: "manual",
        query: `${brand} ${model}`.trim(),
        category: productType || null,
        results_count: results.length,
        metadata: { brand, model, productType, foundPdf: !!topPdf },
      });
      if (topPdf) {
        setManual(topPdf);
      } else {
        setNotFound(true);
        setRequestSources(sources);
        toast({
          title: "No manual PDF found",
          description: sources.length
            ? "We found pages where you can request it from the manufacturer."
            : "Try a different model number or add the product type.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      toast({ title: "Search error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const viewerUrl = manual ? buildProxyUrl(manual.url, "inline", filename) : "";
  const downloadUrl = manual ? buildProxyUrl(manual.url, "download", filename) : "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
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
              Enter the brand and model number — we'll find the official manual and let you view or download it right here.
            </p>
          </div>

          <Card className="p-6 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Whirlpool" required />
                </div>
                <div>
                  <Label htmlFor="model">Model Number *</Label>
                  <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., WRF555SDFZ" required />
                </div>
              </div>
              <div>
                <Label htmlFor="type">Product Type (optional)</Label>
                <Input id="type" value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="e.g., refrigerator, dishwasher, HVAC" />
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

          {manual && (
            <Card className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">{brand} {model} — User Manual</h2>
                  <p className="text-xs text-muted-foreground truncate">{manual.title}</p>
                </div>
                <Button asChild size="sm">
                  <a href={downloadUrl} download={`${filename}.pdf`}>
                    <Download size={14} className="mr-1.5" /> Download
                  </a>
                </Button>
              </div>
              <iframe
                src={viewerUrl}
                title="User Manual"
                className="w-full h-[75vh] bg-muted"
              />
            </Card>
          )}

          {notFound && !loading && (
            <Card className="p-6">
              <div className="text-center mb-4">
                <FileX className="mx-auto text-muted-foreground mb-3" size={32} />
                <h3 className="font-semibold text-foreground mb-1">No manual found</h3>
                <p className="text-sm text-muted-foreground">
                  We couldn't locate an official PDF manual for that model.
                  {requestSources.length > 0 && " Here's where you can request it directly from the manufacturer:"}
                </p>
              </div>

              {requestSources.length > 0 && (
                <div className="space-y-2 mt-4">
                  {requestSources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.source}</div>
                        {r.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</div>
                        )}
                      </div>
                      <ExternalLink size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              )}

              {requestSources.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Try adjusting the brand, model, or product type.
                </p>
              )}
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManualSearch;
