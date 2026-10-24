import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Gift as GiftIcon, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatGiftCode } from "@/lib/gift";

// Landing page for the link in the gift email. Signed-out visitors are sent
// to create an account or sign in and then come straight back with the code.
const RedeemGift = () => {
  const [searchParams] = useSearchParams();
  const { user, loading, refreshProfile } = useAuth();
  const [code, setCode] = useState(() => formatGiftCode(searchParams.get("code") ?? ""));
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const fromLink = searchParams.get("code");
    if (fromLink) setCode(formatGiftCode(fromLink));
  }, [searchParams]);

  const returnPath = `/redeem-gift${code ? `?code=${encodeURIComponent(code)}` : ""}`;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("redeem_gift_code" as never, { p_code: formatGiftCode(code) } as never);
      const result = data as { success?: boolean; error?: string; expires_at?: string } | null;
      if (rpcError || !result?.success) {
        setError(result?.error || "We couldn't redeem that code. Please try again.");
        return;
      }
      setExpiresAt(result.expires_at ?? null);
      await refreshProfile();
    } finally {
      setRedeeming(false);
    }
  };

  const until = expiresAt ? new Date(expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <GiftIcon className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Redeem your gift</h1>
            <p className="mt-2 text-muted-foreground">Enter your code to turn on a year of Trimbly Home Hero.</p>
          </div>

          {until ? (
            <Card className="border-success/40 bg-success/10">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                <p className="mt-3 text-lg font-semibold text-foreground">Home Hero is on.</p>
                <p className="text-sm text-muted-foreground">Your gift runs through {until}.</p>
                <Button asChild className="mt-5"><Link to="/dashboard">Go to my dashboard</Link></Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !user ? (
            <Card>
              <CardHeader>
                <CardTitle>First, a free account</CardTitle>
                <CardDescription>Your gift attaches to your Trimbly account. It takes a minute.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {code && <p className="rounded-md bg-secondary px-3 py-2 text-center font-mono text-sm text-foreground">{code}</p>}
                <Button asChild className="w-full">
                  <Link to={`/auth?mode=signup&type=homeowner&redirect=${encodeURIComponent(returnPath)}`}>Create a free account</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/auth?redirect=${encodeURIComponent(returnPath)}`}>I already have an account</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleRedeem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="giftCode">Gift code</Label>
                    <Input id="giftCode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GIFT-XXXX-XXXX-XXXX"
                      autoComplete="off" autoCapitalize="characters" className="font-mono" />
                  </div>
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={redeeming || !code.trim()}>
                    {redeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Redeem gift
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Want to give one? <Link className="underline text-primary" to="/gift">Send a gift</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RedeemGift;
