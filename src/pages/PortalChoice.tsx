import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ShieldCheck, ArrowRight, LogOut } from "lucide-react";

const PortalChoice = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState<string>("homeowner");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    const check = async () => {
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
        supabase.from("profiles").select("user_type").eq("id", user.id).maybeSingle(),
      ]);
      const admin = !!roleRow;
      const type = profile?.user_type || "homeowner";
      setIsAdmin(admin);
      setUserType(type);

      // Non-admins skip the chooser entirely
      if (!admin) {
        navigate(type === "provider" ? "/pro-dashboard" : "/dashboard", { replace: true });
        return;
      }
      setChecking(false);
    };
    check();
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  const userDashRoute = userType === "provider" ? "/pro-dashboard" : "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4">
            <BrandMark className="w-12 h-12" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Where would you like to go?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary transition-all hover:shadow-lg group"
            onClick={() => navigate(userDashRoute)}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">User Dashboard</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your home, maintenance schedule, jobs, and messages.
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                Go to dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-all hover:shadow-lg group"
            onClick={() => navigate("/staff")}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Employee Portal</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Operations, user management, moderation, broadcasts, and KPIs.
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                Go to portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PortalChoice;
