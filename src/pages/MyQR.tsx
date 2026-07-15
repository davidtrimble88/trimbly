import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Download, Share2, ArrowLeft, Printer } from "lucide-react";

const MyQR = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [provider, setProvider] = useState<{
    id: string;
    slug: string | null;
    business_name: string;
    category: string;
    city: string;
    state: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const profileUrl = provider
    ? `${window.location.origin}${provider.slug ? `/pros/${provider.slug}` : `/pro/${provider.id}`}`
    : "";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadProvider = async () => {
      const { data } = await supabase
        .from("providers")
        .select("id, slug, business_name, category, city, state")
        .eq("user_id", user.id)
        .maybeSingle();
      setProvider(data);
      setLoading(false);
    };
    loadProvider();
  }, [user]);

  useEffect(() => {
    if (!profileUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, profileUrl, { width: 360, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
    QRCode.toDataURL(profileUrl, { width: 720, margin: 1 }).then(setDataUrl);
  }, [profileUrl]);

  const downloadPNG = () => {
    if (!dataUrl || !provider) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${provider.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  const shareQR = async () => {
    if (!provider || !dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${provider.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`, { type: "image/png" });
      const shareData: ShareData = {
        title: `${provider.business_name} on Trimbly`,
        text: `Scan my QR code to view my profile and book me directly.`,
        url: profileUrl,
        files: "canShare" in navigator && (navigator as any).canShare?.({ files: [file] }) ? [file] : undefined,
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast({ title: "Link copied to clipboard" });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast({ title: "Could not share", variant: "destructive" });
      }
    }
  };

  const printSign = () => {
    if (!provider || !dataUrl) return;
    const w = window.open("", "_blank", "width=816,height=1056");
    if (!w) return;
    w.document.write(`
      <html><head><title>${provider.business_name} – Yard Sign</title>
      <style>
        @page { size: letter; margin: 0.5in; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; margin: 0; padding: 40px; text-align: center; color: #0f172a; }
        .sign { border: 6px solid #3da06e; border-radius: 20px; padding: 40px 32px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 42px; margin: 0 0 8px; font-weight: 800; }
        .tag { color: #3da06e; font-weight: 700; font-size: 22px; margin-bottom: 4px; }
        .loc { color: #64748b; font-size: 18px; margin-bottom: 24px; }
        img { width: 320px; height: 320px; }
        .cta { font-size: 20px; margin-top: 18px; font-weight: 700; }
        .footer { margin-top: 18px; color: #64748b; font-size: 14px; }
      </style></head>
      <body>
        <div class="sign">
          <div class="tag">${provider.category}</div>
          <h1>${provider.business_name}</h1>
          <div class="loc">${provider.city}, ${provider.state}</div>
          <img src="${dataUrl}" alt="QR code" />
          <div class="cta">Scan to view reviews &amp; book</div>
          <div class="footer">${profileUrl.replace(/^https?:\/\//, "")}</div>
        </div>
        <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
      </body></html>
    `);
    w.document.close();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
          <Button
            variant="ghost"
            className="gap-1.5 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/pro-dashboard")}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Button>

          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">My QR Code</h1>
          <p className="text-muted-foreground mb-6">
            Homeowners scan this code to view your profile and book you directly.
          </p>

          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm mb-6">
                  <canvas ref={canvasRef} className="block" />
                </div>

                <div className="mb-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Links to</div>
                  <code className="text-xs bg-muted px-3 py-1.5 rounded-lg break-all block">{profileUrl}</code>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={shareQR} className="gap-1.5">
                    <Share2 size={16} /> Share QR
                  </Button>
                  <Button variant="outline" onClick={downloadPNG} className="gap-1.5">
                    <Download size={16} /> Download PNG
                  </Button>
                  <Button variant="outline" onClick={printSign} className="gap-1.5">
                    <Printer size={16} /> Print Yard Sign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 text-sm text-muted-foreground">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <QrCode className="text-primary shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-medium text-foreground">Where to use it</p>
                    <p>Print it as a yard sign, add it to your vehicle, or share it on social media. Any scan leads homeowners straight to your booking profile.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyQR;
