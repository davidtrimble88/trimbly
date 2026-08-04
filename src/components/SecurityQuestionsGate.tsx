import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Redirects any logged-in user who hasn't set up security questions yet to
// the setup page — fires for brand-new signups (their very first authenticated
// page load) and for existing accounts alike (their next login), matching
// "make them set it up next time they log in." Re-checks on every navigation
// rather than caching the result for the session, so completing setup
// immediately clears the redirect without a stale-state loop.
const EXEMPT_PATHS = [
  "/", "/auth", "/staff-login", "/reset-password", "/account-recovery",
  "/security-questions-setup", "/pro-register", "/mechanic-register",
  "/homeowner-upsell", "/cancel-subscription",
];

export function SecurityQuestionsGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (EXEMPT_PATHS.includes(location.pathname)) return;
    let cancelled = false;
    (supabase.from("security_questions" as any) as any)
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (cancelled || data) return;
        navigate(`/security-questions-setup?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, location.pathname, navigate]);

  return null;
}
