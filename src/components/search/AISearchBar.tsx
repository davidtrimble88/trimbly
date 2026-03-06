import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X } from "lucide-react";
import { searchProvidersWithAI } from "@/lib/api/providers";
import { useToast } from "@/hooks/use-toast";

const AISearchBar = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAISearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const recommendation = await searchProvidersWithAI(query);
      setResult(recommendation);
    } catch {
      toast({
        title: "AI Search Error",
        description: "Could not get AI recommendations. Try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
          <Input
            placeholder="Ask AI: 'I need a licensed plumber in Toronto for a bathroom reno'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
            className="pl-10 h-12"
          />
        </div>
        <Button onClick={handleAISearch} disabled={loading || !query.trim()} size="lg" className="h-12 gap-2">
          <Sparkles size={16} />
          {loading ? "Thinking..." : "Ask AI"}
        </Button>
      </div>
      {result && (
        <div className="relative bg-accent/5 border border-accent/20 rounded-xl p-4">
          <button onClick={() => setResult("")} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-foreground whitespace-pre-wrap">{result}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISearchBar;
