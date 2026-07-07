import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeReport() {
  const { id } = useParams();
  const [home, setHome] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [binderItems, setBinderItems] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [h, j, b, t] = await Promise.all([
        supabase.from("homes").select("*").eq("id", id).maybeSingle(),
        supabase.from("jobs").select("*").eq("home_id", id).eq("status", "completed").order("created_at", { ascending: false }),
        supabase.from("home_binder_items").select("*").eq("home_id", id),
        supabase.from("maintenance_tasks").select("*").eq("home_id", id).order("title"),
      ]);
      setHome(h.data);
      setJobs(j.data || []);
      setBinderItems(b.data || []);
      setTasks(t.data || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="max-w-3xl mx-auto p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!home) return <p className="p-6 text-sm text-muted-foreground">Home not found.</p>;

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <div className="no-print border-b border-border p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft size={16} className="mr-1" /> Back</Link></Button>
        <Button size="sm" onClick={() => window.print()}><Printer size={14} className="mr-1.5" /> Print / Save as PDF</Button>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-0">
        <h1 className="font-display text-2xl font-bold mb-1">Home Maintenance & History Report</h1>
        <p className="text-sm text-muted-foreground mb-6">Generated {new Date().toLocaleDateString()} via Trimbly</p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-8 border border-border rounded-lg p-4">
          <div><span className="text-muted-foreground">Property:</span> {home.name}</div>
          <div><span className="text-muted-foreground">Location:</span> {home.city}, {home.state}</div>
          <div><span className="text-muted-foreground">Type:</span> {home.home_type}</div>
          <div><span className="text-muted-foreground">Year built:</span> {home.year_built || "—"}</div>
          <div><span className="text-muted-foreground">Square feet:</span> {home.square_feet ? home.square_feet.toLocaleString() : "—"}</div>
          <div><span className="text-muted-foreground">HVAC:</span> {home.hvac_type || "—"}</div>
          <div><span className="text-muted-foreground">Roof:</span> {home.roof_type || "—"}</div>
          <div><span className="text-muted-foreground">Documented pro jobs completed:</span> {jobs.length}</div>
        </div>

        <h2 className="font-display text-lg font-bold mb-3">Completed Work ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-8">No completed jobs recorded through Trimbly for this property yet.</p>
        ) : (
          <table className="w-full text-sm mb-8 border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3">Category</th>
                <th className="py-1.5 pr-3">Title</th>
                <th className="py-1.5 text-right">Budget range</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(j.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pr-3">{j.category}</td>
                  <td className="py-1.5 pr-3">{j.title}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    {j.budget_min || j.budget_max ? `$${j.budget_min || 0}–${j.budget_max || "+"}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="font-display text-lg font-bold mb-3">Appliances & Systems ({binderItems.length})</h2>
        {binderItems.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-8">No appliances or systems logged in the Home Binder.</p>
        ) : (
          <ul className="text-sm space-y-1 mb-8">
            {binderItems.map((b) => (
              <li key={b.id} className="flex justify-between border-b border-border/50 py-1">
                <span>{b.name} {b.brand ? `(${b.brand})` : ""}</span>
                <span className="text-muted-foreground">{b.warranty_expiry ? `Warranty to ${b.warranty_expiry}` : b.item_type}</span>
              </li>
            ))}
          </ul>
        )}

        <h2 className="font-display text-lg font-bold mb-3">Maintenance Schedule ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance tasks tracked.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex justify-between border-b border-border/50 py-1">
                <span>{t.title}</span>
                <span className="text-muted-foreground">{t.status}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground mt-10">
          This report reflects records self-reported by the homeowner via Trimbly and is not independently verified.
        </p>
      </div>
    </div>
  );
}
