import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Mounted once at the app root. The rest of the app already handles failed
 * Supabase calls per-feature (error toasts, retry buttons) — this just gives
 * a persistent, honest signal for the common case behind most of them: no
 * connection at all, not a server-side failure. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-warning text-warning-foreground text-sm font-medium py-1.5 px-4 flex items-center justify-center gap-2 shadow-sm">
      <WifiOff size={14} />
      You're offline — changes won't save until you're back online.
    </div>
  );
}
