import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, Share, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function InstallAppPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem("hh-install-dismissed") === "1");

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || dismissed) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem("hh-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Install HomeHero</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add to your phone for instant access and push notifications when jobs come in.
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={dismiss} className="h-6 w-6 shrink-0">
                <X size={14} />
              </Button>
            </div>

            {deferredPrompt ? (
              <Button size="sm" className="mt-3 gap-1.5" onClick={install}>
                <Download size={14} /> Install App
              </Button>
            ) : isIos ? (
              <p className="text-xs text-foreground bg-card rounded-md p-2 mt-3 inline-flex items-center gap-1">
                Tap <Share size={12} className="inline" /> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                In Chrome/Edge: open the browser menu and choose "Install app" or "Add to Home Screen".
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
