import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Saved = { id: string; provider_id: string; provider: { id: string; business_name: string; category: string; city: string; state: string; slug: string | null } | null };

export default function SavedProvidersCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Saved[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_providers")
      .select("id, provider_id, provider:providers(id, business_name, category, city, state, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setItems(((data as any) || []).filter((i: Saved) => i.provider)));
  }, [user]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <Bookmark size={16} className="text-primary" /> Saved Pros
        </h3>
        <ul className="space-y-2">
          {items.map((s) => s.provider && (
            <li key={s.id}>
              <Link
                to={s.provider.slug ? `/pros/${s.provider.slug}` : `/pros/id/${s.provider.id}`}
                className="block rounded-md p-2 hover:bg-accent transition-colors"
              >
                <div className="text-sm font-medium text-foreground truncate">{s.provider.business_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {s.provider.category} <span aria-hidden>·</span> <MapPin size={10} /> {s.provider.city}, {s.provider.state}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
