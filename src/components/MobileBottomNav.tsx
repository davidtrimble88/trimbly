import { Link, useLocation } from "react-router-dom";
import { Home, Search, MessageSquare, FolderOpen, Briefcase, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const homeownerItems = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/search", label: "Find Pros", icon: Search },
  { to: "/post-job", label: "Post Job", icon: Briefcase },
  { to: "/binder", label: "Binder", icon: FolderOpen },
  { to: "/messages", label: "Inbox", icon: MessageSquare },
];

const providerItems = [
  { to: "/pro-dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/job-board", label: "Jobs", icon: Briefcase },
  { to: "/messages", label: "Inbox", icon: MessageSquare },
  { to: "/dashboard", label: "Profile", icon: Home },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [userType, setUserType] = useState<string>("homeowner");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("user_type").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUserType(data?.user_type || "homeowner"));
  }, [user]);

  if (!user) return null;
  if (pathname.startsWith("/staff")) return null;
  if (pathname === "/auth" || pathname === "/reset-password") return null;

  const items = userType === "provider" ? providerItems : homeownerItems;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 max-w-screen-sm mx-auto">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
