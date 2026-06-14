import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GarageMaintenance() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [t, v] = await Promise.all([
        supabase.from("vehicle_maintenance_tasks").select("*").eq("owner_user_id", user.id).order("next_due_date", { ascending: true, nullsFirst: false }),
        supabase.from("vehicles").select("id, nickname, make, model, year").eq("owner_user_id", user.id),
      ]);
      setTasks(t.data || []);
      const m: Record<string, any> = {};
      (v.data || []).forEach((row: any) => { m[row.id] = row; });
      setVehicleMap(m);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">All Maintenance</h1>
      {tasks.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Add a vehicle to seed maintenance tasks.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Across all vehicles</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {tasks.map((t) => {
                const v = vehicleMap[t.vehicle_id];
                return (
                  <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.task_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {v ? (<Link to={`/garage/vehicles/${t.vehicle_id}`} className="hover:text-foreground underline">{v.nickname || `${v.year ?? ""} ${v.make} ${v.model}`.trim()}</Link>) : "—"}
                        {t.next_due_date ? ` · due ${t.next_due_date}` : ""}
                      </p>
                    </div>
                    <Badge variant={t.status === "overdue" ? "destructive" : t.status === "due" ? "default" : "outline"}>{t.status}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
