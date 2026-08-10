import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, X, LifeBuoy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "hh_testing_banner_dismissed";

// Persistent reminder (not a one-time popup) for accounts flagged via a
// testing discount code redemption. Dismissible per browser session — it
// comes back next time they open the app, so the "this is free until
// testing ends" context stays visible throughout, not just once.
export function TestingAccountBanner() {
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_testing_account").eq("id", user.id).maybeSingle().then(({ data }) => {
      setIsTesting(Boolean((data as any)?.is_testing_account));
    });
  }, [user]);

  if (!isTesting || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 flex items-center gap-3 flex-wrap mb-4">
      <FlaskConical size={16} className="text-primary shrink-0" />
      <p className="text-xs sm:text-sm text-foreground flex-1 min-w-[200px]">
        <strong>You're in the testing program</strong> — full access is free until testing ends, then you'll choose free or paid.
        Found a bug or have feedback?{" "}
        <Link to="/support" className="underline underline-offset-2 hover:text-primary inline-flex items-center gap-1">
          <LifeBuoy size={12} /> Send it our way
        </Link>
        .
      </p>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
