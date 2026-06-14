import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";

/**
 * Wraps a Garage page. Logged-out users go to auth; logged-in users without
 * the add-on go to the upsell page.
 */
export default function GarageGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { active, loading } = useGarageSubscription();
  const location = useLocation();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  if (!active) return <Navigate to="/garage/upsell" replace />;
  return <>{children}</>;
}
