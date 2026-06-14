import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, Wrench, FileText, AlertTriangle, Plus } from "lucide-react";

type Vehicle = { id: string; nickname: string; vehicle_type: string; year: number | null; make: string; model: string; current_mileage: number; mileage_unit: string };
type Task = { id: string; vehicle_id: string; task_name: string; next_due_date: string | null; next_due_mileage: number | null; status: string };
type Doc = { id: string; vehicle_id: string; doc_type: string; file_name: string; expires_on: string | null };

export default function GarageDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expiring, setExpiring] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [v, t, d] = await Promise.all([
        supabase.from("vehicles").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("vehicle_maintenance_tasks").select("*").eq("owner_user_id", user.id).neq("status", "done").order("next_due_date", { ascending: true, nullsFirst: false }).limit(8),
        supabase.from("vehicle_documents").select("*").eq("owner_user_id", user.id).not("expires_on", "is", null).lte("expires_on", new Date(Date.now() + 60 * 86400000).toISOString().slice(0,10)).order("expires_on", { ascending: true }),
      ]);
      setVehicles((v.data as Vehicle[]) || []);
      setTasks((t.data as Task[]) || []);
      setExpiring((d.data as Doc[]) || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (vehicles.length === 0) {
    return (
      <Card className="text-center">
        <CardContent className="p-10">
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-xl font-bold mb-1">Add your first vehicle</h2>
          <p className="text-sm text-muted-foreground mb-4">Track service, reminders, and documents for cars and motorcycles.</p>
          <Button asChild><Link to="/garage/vehicles"><Plus className="mr-1" size={16} /> Add a vehicle</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vehicles" value={vehicles.length} icon={<Car size={18} />} />
        <StatCard label="Upcoming tasks" value={tasks.length} icon={<Wrench size={18} />} />
        <StatCard label="Docs expiring (60d)" value={expiring.length} icon={<FileText size={18} />} />
        <StatCard label="Overdue" value={tasks.filter((t) => t.status === "overdue").length} icon={<AlertTriangle size={18} />} tone={tasks.some((t)=>t.status==="overdue") ? "warn" : undefined} />
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
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming tasks yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{t.task_name}</span>
                    <Badge variant={t.status === "overdue" ? "destructive" : t.status === "due" ? "default" : "outline"}>
                      {t.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Documents expiring soon</CardTitle></CardHeader>
          <CardContent>
            {expiring.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing expiring in the next 60 days.</p>
            ) : (
              <ul className="divide-y divide-border">
                {expiring.map((d) => (
                  <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{d.file_name}</span>
                    <span className="text-xs text-muted-foreground">{d.expires_on}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number | string; icon: React.ReactNode; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className={tone === "warn" ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
        </div>
        <p className={`font-display text-2xl font-bold ${tone === "warn" ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
