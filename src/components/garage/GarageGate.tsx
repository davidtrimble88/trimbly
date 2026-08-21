import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { GarageAccessProvider } from "./GarageAccessContext";

/**
 * Wraps a Garage page. Logged-out users still go to auth (nothing to show
 * them). Logged-in users without the add-on now see the real Garage shell
 * — nav, layout — as a locked preview (GarageLayout renders an UpgradeGate
 * card in place of the Outlet) instead of being redirected away with zero
 * idea what the feature looks like.
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
  return <GarageAccessProvider value={active}>{children}</GarageAccessProvider>;
}
