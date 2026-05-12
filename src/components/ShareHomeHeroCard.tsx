import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Lightweight, untracked invite surface for homeowners.
// (Server-side referral crediting is currently Pro-only; this exposes the share action.)
export const ShareHomeHeroCard = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/?invited=1` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: "Link copied", description: "Send it to a friend who owns a home." });
  };

  const share = async () => {
    const text = `I'm using HomeHero to stay on top of home maintenance and find trusted local pros — thought you'd like it too: ${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: "HomeHero", text, url }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Message copied", description: "Paste it into a text or email." });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={18} className="text-primary" />
          <h3 className="font-bold text-foreground">Know someone who owns a home?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          HomeHero is better when your neighbors use it too — more local pros, faster bids, real reviews. Share the link.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button onClick={copy} variant="outline" size="icon" aria-label="Copy invite link">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
          <Button onClick={share} className="gap-1.5">
            <Share2 size={14} /> Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareHomeHeroCard;
