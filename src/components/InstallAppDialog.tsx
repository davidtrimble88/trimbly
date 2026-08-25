import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, PlayCircle, Share, Download, Plus } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Shared dialog shown from any dashboard header "Download App" button.
 *  Gives iPhone and Android install instructions, and surfaces the native
 *  browser install prompt (beforeinstallprompt) when the browser offers one. */
export default function InstallAppDialog({ open, onOpenChange }: InstallAppDialogProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(ios);
    setIsAndroid(/Android/i.test(ua) && !ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Install Trimbly on your phone
          </DialogTitle>
          <DialogDescription>
            Trimbly is a web app — no app store needed. Add it to your home
            screen for quick access and push notifications.
          </DialogDescription>
        </DialogHeader>

        {installed && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
            Trimbly is already installed on this device. 🎉
          </div>
        )}

        {/* Native install prompt (Chrome/Edge on Android & desktop) */}
        {!installed && deferredPrompt && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your browser supports one-tap install:
            </p>
            <Button className="w-full gap-2" onClick={install}>
              <Download size={16} /> Install now
            </Button>
          </div>
        )}

        {/* Manual instructions */}
        {!installed && (isIos || !deferredPrompt) && (
          <div className="space-y-4">
            {isIos && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Apple size={18} className="text-foreground" />
                  <h3 className="font-semibold text-sm">iPhone & iPad (Safari)</h3>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>
                    Open this page in <span className="font-medium text-foreground">Safari</span> (other browsers can't add to Home Screen).
                  </li>
                  <li>
                    Tap the <Share size={14} className="inline align-text-bottom" /> <span className="font-medium text-foreground">Share</span> button at the bottom of the screen.
                  </li>
                  <li>
                    Tap <Plus size={14} className="inline align-text-bottom" /> <span className="font-medium text-foreground">Add to Home Screen</span>.
                  </li>
                  <li>Tap <span className="font-medium text-foreground">Add</span> — Trimbly now appears like an app.</li>
                </ol>
              </div>
            )}

            {isIos && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Apple size={18} className="text-foreground" />
                  <h3 className="font-semibold text-sm">iPhone & iPad (Chrome)</h3>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>
                    Open the Chrome menu (<span className="font-medium text-foreground">⋮</span> top right).
                  </li>
                  <li>
                    Tap <span className="font-medium text-foreground">Add to Home Screen</span> → <span className="font-medium text-foreground">Install app</span>.
                  </li>
                </ol>
              </div>
            )}

            {isAndroid && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PlayCircle size={18} className="text-foreground" />
                  <h3 className="font-semibold text-sm">Android</h3>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>
                    In Chrome, tap the menu (<span className="font-medium text-foreground">⋮</span> top right).
                  </li>
                  <li>
                    Tap <span className="font-medium text-foreground">Install app</span> (or <span className="font-medium text-foreground">Add to Home Screen</span> → <span className="font-medium text-foreground">Install</span>).
                  </li>
                  <li>Confirm — Trimbly installs like a native app.</li>
                </ol>
              </div>
            )}

            {!isIos && !isAndroid && !deferredPrompt && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-sm mb-2">Desktop / other browsers</h3>
                <p className="text-sm text-muted-foreground">
                  In Chrome or Edge, click the install icon
                  (<Download size={14} className="inline align-text-bottom" />) in the
                  address bar, or open the browser menu and choose
                  <span className="font-medium text-foreground"> Install Trimbly</span>.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          Tip: once installed, Trimbly works just like a native app — full
          screen, push notifications, and an icon on your home screen.
        </div>
      </DialogContent>
    </Dialog>
  );
}
