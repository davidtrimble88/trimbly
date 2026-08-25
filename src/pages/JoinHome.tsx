import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Home, Users, Building2, AlertCircle, Check } from "lucide-react";

type Preview = {
  success: boolean;
  error?: string;
  owner_name?: string;
  grant_type?: "hero_member" | "multi_full" | "multi_single";
  home_name?: string;
  home_city?: string;
  home_state?: string;
};

const GRANT_ICON = { hero_member: Users, multi_full: Home, multi_single: Building2 } as const;
const GRANT_DESCRIPTION: Record<string, string> = {
  hero_member: "view their home",
  multi_full: "view all of their properties",
  multi_single: "view one of their properties",
};

export default function JoinHome() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // The preview RPC is only callable by signed-in users, so logged-out
    // visitors see the generic sign-in card below instead.
    if (authLoading || !user) return;
    supabase.rpc("get_invite_preview" as any, { p_token: token } as any).then(({ data, error }) => {
      setPreview((data as Preview) || { success: false, error: error?.message || "Something went wrong" });
    });
  }, [token, user, authLoading]);

  const accept = async () => {
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_home_invite" as any, { p_token: token } as any);
      const result = data as any;
      if (error || !result?.success) {
        toast({ title: "Couldn't accept invite", description: result?.error || error?.message, variant: "destructive" });
        return;
      }
      toast({ title: "You're in!", description: "You now have access to the shared home." });
      navigate("/homeowner-upsell?onboarding=1");
    } finally {
      setAccepting(false);
    }
  };

  const redirectParam = `/join/${token}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar minimal />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          {!preview ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          ) : !preview.success ? (
            <>
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <h1 className="text-xl font-bold text-foreground mb-1">This invite isn't valid</h1>
              <p className="text-sm text-muted-foreground mb-6">{preview.error}</p>
              <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
            </>
          ) : (
            <>
              {(() => {
                const Icon = GRANT_ICON[preview.grant_type!];
                return (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                );
              })()}
              <h1 className="text-2xl font-bold text-foreground mb-1 font-display">
                {preview.owner_name} invited you to Trimbly
              </h1>
              <p className="text-sm text-muted-foreground mb-1">
                You'll be able to {GRANT_DESCRIPTION[preview.grant_type!]}
                {preview.home_name ? ` — ${preview.home_name}` : ""}
                {preview.home_city ? ` in ${preview.home_city}, ${preview.home_state}` : ""}.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                This is free for you — {preview.owner_name} is paying for your access.
              </p>

              {authLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
              ) : user ? (
                <Button onClick={accept} disabled={accepting} className="w-full gap-1.5" size="lg">
                  {accepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Accept invite
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg">
                    <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(redirectParam)}`}>Sign up to accept</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/auth?redirect=${encodeURIComponent(redirectParam)}`}>I already have an account</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
