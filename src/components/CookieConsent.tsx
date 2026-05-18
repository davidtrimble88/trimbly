import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

const KEY = "hh_cookie_consent_v1";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (value: "accept" | "reject") => {
    try { localStorage.setItem(KEY, value); } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <Cookie size={20} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="text-foreground font-medium mb-1">We use cookies</p>
          <p className="text-xs text-muted-foreground mb-3">
            We use essential cookies to make the site work, plus optional analytics to improve Trimbly. See our{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => choose("accept")}>Accept all</Button>
            <Button size="sm" variant="outline" onClick={() => choose("reject")}>Essential only</Button>
          </div>
        </div>
        <button onClick={() => choose("reject")} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
