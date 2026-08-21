import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Bike, Wrench, FileText, AlertTriangle, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import StatCard from "@/components/dashboard/StatCard";
import StatCardSkeleton from "@/components/dashboard/StatCardSkeleton";
import AttentionBanner from "@/components/dashboard/AttentionBanner";
import AttentionList from "@/components/dashboard/AttentionList";

type Vehicle = { id: string; nickname: string; vehicle_type: string; year: number | null; make: string; model: string; current_mileage: number; mileage_unit: string };
type Task = { id: string; vehicle_id: string; task_name: string; next_due_date: string | null; next_due_mileage: number | null; status: string };
type Doc = { id: string; vehicle_id: string; doc_type: string; file_name: string; expires_on: string | null };

export default function GarageDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expiring, setExpiring] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const result = searchParams.get("subscription");
    if (!result) return;
    if (result === "success") {
      toast.success("My Garage is set up — welcome aboard!");
    } else if (result === "cancelled") {
      toast.info("Checkout cancelled. No charge was made.");
    }
    searchParams.delete("subscription");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [v, t, d] = await Promise.all([
        supabase.from("vehicles").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("vehicle_maintenance_tasks").select("*").eq("owner_user_id", user.id).neq("status", "done").order("next_due_date", { ascending: true, nullsFirst: false }).limit(8),
        supabase.from("vehicle_documents").select("*").eq("owner_user_id", user.id).not("expires_on", "is", null).lte("expires_on", new Date(Date.now() + 60 * 86400000).toISOString().slice(0,10)).order("expires_on", { ascending: true }),
      ]);
      if (v.error || t.error || d.error) {
        toast.error(v.error?.message || t.error?.message || d.error?.message || "Failed to load your garage");
        setError(true);
        setLoading(false);
        return;
      }
      setVehicles((v.data as Vehicle[]) || []);
      setTasks((t.data as Task[]) || []);
      setExpiring((d.data as Doc[]) || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    </div>
  );

  if (error) {
    return (
      <Card className="text-center">
        <CardContent className="p-10">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="font-display text-xl font-bold mb-1">Couldn't load your garage</h2>
          <p className="text-sm text-muted-foreground">Something went wrong loading your data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card className="text-center">
        <CardContent className="p-10">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <Car className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-display text-xl font-bold mb-1">Add your first vehicle</h2>
          <p className="text-sm text-muted-foreground mb-4">Track service, reminders, and documents for cars and motorcycles.</p>
          <Button asChild><Link to="/garage/vehicles"><Plus className="mr-1" size={16} /> Add a vehicle</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {expiring.length > 0 && (
        <AttentionBanner
          severity="warning"
          title="Documents expiring soon"
          items={expiring.map((d) => `${d.file_name} — expires ${d.expires_on}`)}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vehicles" value={vehicles.length} icon={Car} />
        <StatCard label="Upcoming tasks" value={tasks.length} icon={Wrench} />
        <StatCard label="Docs expiring (60d)" value={expiring.length} icon={FileText} tone="warning" />
        <StatCard label="Overdue" value={tasks.filter((t) => t.status === "overdue").length} icon={AlertTriangle} tone="danger" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Your vehicles</CardTitle>
          <Button asChild size="sm" variant="outline"><Link to="/garage/vehicles"><Plus size={14} className="mr-1" /> Add</Link></Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/garage/vehicles/${v.id}`} className="block group">
              <div className="rounded-lg border border-border p-4 hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  {v.vehicle_type === "motorcycle" ? <Bike size={16} className="text-muted-foreground" /> : <Car size={16} className="text-muted-foreground" />}
                  <span className="font-semibold text-sm group-hover:text-primary truncate">{v.nickname || `${v.year ?? ""} ${v.make} ${v.model}`}</span>
                </div>
                <p className="text-xs text-muted-foreground">{[v.year, v.make, v.model].filter(Boolean).join(" ")}</p>
                <p className="text-xs text-muted-foreground mt-1">{v.current_mileage.toLocaleString()} {v.mileage_unit}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming maintenance</CardTitle></CardHeader>
          <CardContent>
            <AttentionList
              items={tasks.map((t) => ({ id: t.id, label: t.task_name, date: undefined, urgent: t.status === "overdue" }))}
              emptyText="No upcoming tasks yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Documents expiring soon</CardTitle></CardHeader>
          <CardContent>
            <AttentionList
              items={expiring.map((d) => ({ id: d.id, label: d.file_name, date: d.expires_on ?? undefined, urgent: false }))}
              emptyText="Nothing expiring in the next 60 days."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
