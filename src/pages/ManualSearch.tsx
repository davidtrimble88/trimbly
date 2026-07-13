import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Download, BookOpen, FileX, ExternalLink, ShieldCheck, ShieldQuestion, ShieldAlert, Bug } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  sizeBytes?: number;
  confidence?: "likely_full" | "uncertain" | "likely_partial";
};

const buildProxyUrl = (manualUrl: string, mode: "inline" | "download", filename: string) => {
  const params = new URLSearchParams({ url: manualUrl, mode, filename });
  return `${SUPABASE_URL}/functions/v1/manual-proxy?${params.toString()}`;
};

const confidenceStyle: Record<string, { icon: typeof ShieldCheck; className: string; label: string }> = {
  likely_full: { icon: ShieldCheck, className: "border-primary/40 bg-primary/5 text-primary", label: "Likely full manual" },
  uncertain: { icon: ShieldQuestion, className: "border-border bg-muted/40 text-muted-foreground", label: "Unconfirmed" },
  likely_partial: { icon: ShieldAlert, className: "border-orange-400/50 bg-orange-500/5 text-orange-600", label: "May be partial" },
};

const ManualSearch = () => {
  const { toast } = useToast();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [productType, setProductType] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ManualResult[]>([]);
  const [selected, setSelected] = useState<ManualResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requestSources, setRequestSources] = useState<ManualResult[]>([]);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const filename = `${brand}-${model}-manual`.replace(/\s+/g, "-").toLowerCase() || "user-manual";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      toast({ title: "Missing info", description: "Please enter both brand and model number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResults([]);
    setSelected(null);
    setNotFound(false);
    setRequestSources([]);
    setDebugInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke("find-manual", {
        body: { brand, model, productType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const found: ManualResult[] = data?.results || [];
      const sources: ManualResult[] = data?.requestSources || [];
      setDebugInfo(data?.debug || {
        note: "No detailed diagnostics were returned by the manual search function.",
        resultCount: found.length,
        requestSourceCount: sources.length,
        responseKeys: data ? Object.keys(data) : [],
      });
      logSearch({
        search_type: "manual",
        query: `${brand} ${model}`.trim(),
        category: productType || null,
        results_count: found.length,
        metadata: { brand, model, productType, topConfidence: found[0]?.confidence || null },
      });
      if (found.length > 0) {
        setResults(found);
        setSelected(found[0]);
        setRequestSources(sources); // still show request-a-manual sources even with results, in case none are right
      } else {
        setNotFound(true);
        setRequestSources(sources);
        toast({
          title: "No verified manual found",
          description: sources.length
            ? "We found pages where you can request it directly from the manufacturer."
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

  const viewerUrl = selected ? buildProxyUrl(selected.url, "inline", filename) : "";
  const downloadUrl = selected ? buildProxyUrl(selected.url, "download", filename) : "";

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
              Enter the brand and model number. We verify each result is a real, complete PDF before showing it to you.
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
                  <><Loader2 className="animate-spin mr-2" size={18} /> Searching and verifying...</>
                ) : (
                  <><Search className="mr-2" size={18} /> Find Manual</>
                )}
              </Button>
            </form>
          </Card>

          {results.length > 0 && (
            <div className="mb-6 space-y-2">
              {results.length > 1 && (
                <p className="text-sm font-medium text-foreground">
                  {results.length} verified results. Pick the one that looks right:
                </p>
              )}
              {results.map((r) => {
                const style = confidenceStyle[r.confidence || "uncertain"];
                const Icon = style.icon;
                const isSelected = selected?.url === r.url;
                const sizeLabel = r.sizeBytes ? `${(r.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : null;
                return (
                  <button
                    key={r.url}
                    onClick={() => setSelected(r)}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.source}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs gap-1 ${style.className}`}>
                        <Icon size={12} /> {style.label}{sizeLabel ? ` \u00b7 ${sizeLabel}` : ""}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selected && (
            <Card className="overflow-hidden mb-8">
              <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">{brand} {model} User Manual</h2>
                  <p className="text-xs text-muted-foreground truncate">{selected.title}</p>
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
                <h3 className="font-semibold text-foreground mb-1">No verified manual found</h3>
                <p className="text-sm text-muted-foreground">
                  We couldn't confirm a complete PDF manual for that model.
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

          {debugInfo && (
            <Card className="p-4 mt-4 border-dashed">
              <button
                onClick={() => setShowDebug((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
              >
                <Bug size={14} /> {showDebug ? "Hide" : "Show"} search diagnostics (for troubleshooting)
              </button>
              {showDebug && (
                <pre className="mt-3 text-[10px] leading-tight bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
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
