import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, CalendarCheck, Wrench, Search, FileText, Crown, MessageSquare, Shield, Briefcase, Building2, ShieldCheck, Home as HomeIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { supabase } from "@/integrations/supabase/client";
import UniversalSearch from "@/components/UniversalSearch";
import NotificationPreferencesDialog from "@/components/NotificationPreferencesDialog";
import { Bell } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profileName, signOut } = useAuth();
  const { subscriptionTier, isPro } = useHomeLimit();
  const [userType, setUserType] = useState<string>("homeowner");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setUserType("homeowner"); setIsAdmin(false); return; }
    supabase.from("profiles").select("user_type").eq("id", user.id).maybeSingle().then(({ data }) => {
      setUserType(data?.user_type || "homeowner");
    });
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  const inStaffPortal = location.pathname.startsWith("/staff");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isProvider = userType === "provider";

  const guestLinks = (
    <>
      <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
      <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
      <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
      <a href="/#pros" className="text-sm text-muted-foreground hover:text-foreground transition-colors">For Pros</a>
    </>
  );

  const homeownerLinks = (
    <>
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <LayoutDashboard size={14} /> Dashboard
      </Link>
      <Link to="/maintenance" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <CalendarCheck size={14} /> Maintenance
      </Link>
      <Link to="/binder" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <FileText size={14} /> Home Binder
      </Link>
      <Link to="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <Search size={14} /> Find Pros
      </Link>
      <Link to="/estimator" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <Wrench size={14} /> Estimator
      </Link>
      <Link to="/messages" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <MessageSquare size={14} /> Messages
      </Link>
      <Link to="/coverage" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <Shield size={14} /> Coverage
      </Link>
      <Link to="/post-job" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <Briefcase size={14} /> Jobs
      </Link>
      {!isPro && (
        <a href="/#pricing" className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1.5 font-medium">
          <Crown size={14} /> Upgrade
        </a>
      )}
    </>
  );

  const providerLinks = (
    <>
      <Link to="/pro-dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <LayoutDashboard size={14} /> Dashboard
      </Link>
      <Link to="/job-board" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <Briefcase size={14} /> Job Board
      </Link>
      <Link to="/messages" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <MessageSquare size={14} /> Messages
      </Link>
      <Link to="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
        <Search size={14} /> My Listing
      </Link>
    </>
  );

  const userLinks = isProvider ? providerLinks : homeownerLinks;

  const guestMobileLinks = (onClose: () => void) => (
    <>
      <a href="/#features" className="block text-sm text-muted-foreground" onClick={onClose}>Features</a>
      <a href="/#how-it-works" className="block text-sm text-muted-foreground" onClick={onClose}>How It Works</a>
      <a href="/#pricing" className="block text-sm text-muted-foreground" onClick={onClose}>Pricing</a>
      <a href="/#pros" className="block text-sm text-muted-foreground" onClick={onClose}>For Pros</a>
    </>
  );

  const homeownerMobileLinks = (onClose: () => void) => (
    <>
      <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <LayoutDashboard size={14} /> Dashboard
      </Link>
      <Link to="/maintenance" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <CalendarCheck size={14} /> Maintenance
      </Link>
      <Link to="/binder" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <FileText size={14} /> Home Binder
      </Link>
      <Link to="/search" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <Search size={14} /> Find Pros
      </Link>
      <Link to="/estimator" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <Wrench size={14} /> Estimator
      </Link>
      <Link to="/messages" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <MessageSquare size={14} /> Messages
      </Link>
      <Link to="/coverage" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <Shield size={14} /> Coverage
      </Link>
      <Link to="/post-job" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <Briefcase size={14} /> Jobs
      </Link>
      {!isPro && (
        <a href="/#pricing" className="flex items-center gap-2 text-sm text-primary font-medium" onClick={onClose}>
          <Crown size={14} /> Upgrade
        </a>
      )}
    </>
  );

  const providerMobileLinks = (onClose: () => void) => (
    <>
      <Link to="/pro-dashboard" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <LayoutDashboard size={14} /> Dashboard
      </Link>
      <Link to="/job-board" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <Briefcase size={14} /> Job Board
      </Link>
      <Link to="/messages" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <MessageSquare size={14} /> Messages
      </Link>
      <Link to="/search" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onClose}>
        <Search size={14} /> My Listing
      </Link>
    </>
  );

  const userMobileLinks = isProvider ? providerMobileLinks : homeownerMobileLinks;

  const dashboardRoute = isProvider ? "/pro-dashboard" : "/dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to={user ? dashboardRoute : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">H</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground">HomeHero</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {user ? userLinks : guestLinks}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user && <UniversalSearch />}
          {user ? (
            <>
              {isAdmin && inStaffPortal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(isProvider ? "/pro-dashboard" : "/dashboard")}
                  className="gap-1.5"
                >
                  <HomeIcon size={14} /> User View
                </Button>
              )}
              {profileName && (
                <span className="text-xs text-muted-foreground mr-1">
                  {profileName}
                  {isProvider && <span className="ml-1.5 text-primary font-medium">PRO</span>}
                  {!isProvider && isPro && <span className="ml-1.5 text-primary font-medium">PRO</span>}
                </span>
              )}
              <NotificationPreferencesDialog
                trigger={<Button variant="ghost" size="icon" aria-label="Notifications"><Bell size={16} /></Button>}
              />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} className="mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Log In</Button>
              <Button size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3 animate-fade-in">
          {user ? userMobileLinks(() => setOpen(false)) : guestMobileLinks(() => setOpen(false))}
          {user && isAdmin && inStaffPortal && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => { setOpen(false); navigate(isProvider ? "/pro-dashboard" : "/dashboard"); }}
            >
              <HomeIcon size={14} /> User View
            </Button>
          )}
          <div className="flex items-center gap-3 pt-2 border-t border-border mt-2 text-xs text-muted-foreground">
            <Link to="/terms" onClick={() => setOpen(false)} className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span aria-hidden>·</span>
            <Link to="/privacy" onClick={() => setOpen(false)} className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border mt-2">
            {user ? (
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setOpen(false); handleSignOut(); }}>
                <LogOut size={16} className="mr-1" /> Sign Out
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>Log In</Button>
                <Button size="sm" className="flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
