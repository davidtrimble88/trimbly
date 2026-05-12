import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, X, Wrench, FileText, CalendarCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Result = {
  kind: "provider" | "binder" | "task" | "message";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

const ICONS = {
  provider: Wrench,
  binder: FileText,
  task: CalendarCheck,
  message: MessageSquare,
} as const;

export default function UniversalSearch() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const term = `%${q.trim()}%`;
    (async () => {
      const out: Result[] = [];
      const [providers, binder, tasks] = await Promise.all([
        supabase
          .from("providers")
          .select("id, slug, business_name, category, city, state")
          .or(`business_name.ilike.${term},category.ilike.${term},city.ilike.${term}`)
          .eq("hidden", false)
          .limit(5),
        user
          ? supabase
              .from("home_binder_items")
              .select("id, name, brand, item_type")
              .eq("user_id", user.id)
              .or(`name.ilike.${term},brand.ilike.${term}`)
              .limit(5)
          : Promise.resolve({ data: [] as any[] }),
        user
          ? supabase
              .from("maintenance_tasks")
              .select("id, title, category, status")
              .eq("user_id", user.id)
              .or(`title.ilike.${term},category.ilike.${term}`)
              .limit(5)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      (providers.data || []).forEach((p: any) =>
        out.push({
          kind: "provider",
          id: p.id,
          title: p.business_name,
          subtitle: `${p.category} · ${p.city}, ${p.state}`,
          href: p.slug ? `/pros/${p.slug}` : `/pros/id/${p.id}`,
        }),
      );
      (binder.data || []).forEach((b: any) =>
        out.push({ kind: "binder", id: b.id, title: b.name, subtitle: `${b.brand || ""} ${b.item_type}`.trim(), href: "/binder" }),
      );
      (tasks.data || []).forEach((t: any) =>
        out.push({ kind: "task", id: t.id, title: t.title, subtitle: `${t.category} · ${t.status}`, href: "/maintenance" }),
      );

      if (!cancelled) {
        setResults(out);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, user]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    navigate(href);
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search pros, binder, tasks…"
          className="w-full h-9 pl-8 pr-7 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg max-h-80 overflow-auto z-50">
          {loading && (
            <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">No matches. Press Enter to search pros.</div>
          )}
          {!loading && results.map((r) => {
            const Icon = ICONS[r.kind];
            return (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => go(r.href)}
                className="w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-accent text-sm"
              >
                <Icon size={14} className="mt-0.5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                </div>
              </button>
            );
          })}
          {!loading && q.trim() && (
            <button
              onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
              className="w-full text-left px-3 py-2 text-xs text-primary border-t border-border hover:bg-accent"
            >
              See all results for "{q.trim()}" →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
