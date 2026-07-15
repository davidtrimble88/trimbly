import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";

export default function SaveProviderButton({ providerId, size = "sm" }: { providerId: string; size?: "sm" | "default" | "icon" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !providerId) return;
    supabase
      .from("saved_providers")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider_id", providerId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, providerId]);

  const toggle = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setBusy(true);
    if (saved) {
      await supabase.from("saved_providers").delete().eq("user_id", user.id).eq("provider_id", providerId);
      setSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      const { error } = await supabase.from("saved_providers").insert({ user_id: user.id, provider_id: providerId });
      if (!error) { setSaved(true); toast({ title: "Saved", description: "Find this pro again on your dashboard." }); }
    }
    setBusy(false);
  };

  return (
    <Button variant={saved ? "default" : "outline"} size={size} onClick={toggle} disabled={busy} className="gap-1.5">
      {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
      {saved ? "Saved" : "Save Pro"}
    </Button>
  );
}
