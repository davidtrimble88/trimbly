import { useEffect, useState } from "react";
import { useNavigate, Outlet, NavLink as RRNavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Inbox, Users, Briefcase, ShieldCheck, Megaphone, Send,
  MessageSquareWarning, ShieldAlert, LogOut, Home, Search, Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const navItems = [
  { to: "/staff", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/staff/contacts", label: "Contact Inbox", icon: Inbox },
  { to: "/staff/users", label: "Users", icon: Users },
  { to: "/staff/providers", label: "Providers", icon: ShieldCheck },
  { to: "/staff/jobs", label: "Jobs", icon: Briefcase },
  { to: "/staff/searches", label: "Search Analytics", icon: Search },
  { to: "/staff/errors", label: "Error Logs", icon: Bug },
  { to: "/staff/outreach", label: "Pro Outreach", icon: Send },
  { to: "/staff/moderation", label: "Moderation", icon: MessageSquareWarning },
  { to: "/staff/broadcasts", label: "Broadcasts", icon: Megaphone },
];

function StaffSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 py-4 border-b border-sidebar-border">
          <RRNavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-display font-bold text-sm">H</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-sidebar-foreground truncate">HomeHero</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Staff Portal</p>
              </div>
            )}
          </RRNavLink>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <RRNavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </RRNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <RRNavLink to="/dashboard" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Back to App</span>}
                  </RRNavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const StaffLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user, authLoading, navigate]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading staff portal...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The Staff Portal is only available to authorized employees.
            </p>
            <Button onClick={() => navigate("/")}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentNav = navItems.find((n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <h1 className="font-display font-semibold text-foreground truncate">
                {currentNav?.label || "Staff Portal"}
              </h1>
            </div>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StaffLayout;
