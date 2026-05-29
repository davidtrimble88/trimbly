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
  MessageSquareWarning, ShieldAlert, LogOut, Home, Search, Bug, UsersRound, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canAccess, isStaff, type StaffRole } from "./roles";

const navItems = [
  { key: "dashboard", to: "/staff", label: "Dashboard", icon: LayoutDashboard, end: true },
  { key: "analytics", to: "/staff/analytics", label: "Analytics", icon: BarChart3 },
  { key: "contacts", to: "/staff/contacts", label: "Contact Inbox", icon: Inbox },
  { key: "users", to: "/staff/users", label: "Users", icon: Users },
  { key: "providers", to: "/staff/providers", label: "Providers", icon: ShieldCheck },
  { key: "jobs", to: "/staff/jobs", label: "Jobs", icon: Briefcase },
  { key: "searches", to: "/staff/searches", label: "Search Analytics", icon: Search },
  { key: "errors", to: "/staff/errors", label: "Error Logs", icon: Bug },
  { key: "outreach", to: "/staff/outreach", label: "Pro Outreach", icon: Send },
  { key: "moderation", to: "/staff/moderation", label: "Moderation", icon: MessageSquareWarning },
  { key: "broadcasts", to: "/staff/broadcasts", label: "Broadcasts", icon: Megaphone },
  { key: "team", to: "/staff/team", label: "Staff Team", icon: UsersRound },
];

function StaffSidebar({ roles }: { roles: StaffRole[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const visible = navItems.filter((n) => canAccess(n.key, roles));
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 py-4 border-b border-sidebar-border">
          <RRNavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-display font-bold text-sm">T</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-sidebar-foreground truncate">Trimbly</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Staff Portal</p>
              </div>
            )}
          </RRNavLink>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
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
  const [roles, setRoles] = useState<StaffRole[] | null>(null);
  const [staffName, setStaffName] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/staff-login"); return; }
    (async () => {
      const [{ data: roleRows }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      const userRoles = ((roleRows || []).map((r: any) => r.role)) as StaffRole[];
      setRoles(userRoles);
      setStaffName(profile?.full_name || user.email || "");
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || roles === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading staff portal...</p>
      </div>
    );
  }

  if (!isStaff(roles)) {
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

  // Block direct access to a route the user's role can't see
  if (currentNav && !canAccess(currentNav.key, roles)) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <StaffSidebar roles={roles} />
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="max-w-md w-full">
              <CardContent className="pt-6 text-center">
                <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
                <h2 className="font-display text-lg font-bold mb-2">Not authorized</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your access level ({roles.join(", ")}) does not include this section.
                </p>
                <Button onClick={() => navigate("/staff")}>Back to Dashboard</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const primaryRole = roles.includes("admin") ? "admin" : roles[0];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar roles={roles} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <h1 className="font-display font-semibold text-foreground truncate">
                {currentNav?.label || "Staff Portal"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {staffName && (
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{staffName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground capitalize">{primaryRole}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
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
