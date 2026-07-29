import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Wrench, FileText, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { supabase } from "@/integrations/supabase/client";

type Vehicle = { id: string; nickname: string; vehicle_type: string; year: number | null; make: string; model: string };
type Task = { id: string; status: string };
type Doc = { id: string };

const GarageAnalyticsSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active: hasGarage, loading: garageLoading } = useGarageSubscription();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !hasGarage) { setLoading(false); return; }
    (async () => {
      const [v, t, d] = await Promise.all([
        supabase.from("vehicles").select("id, nickname, vehicle_type, year, make, model").eq("owner_user_id", user.id),
        supabase.from("vehicle_maintenance_tasks").select("id, status").eq("owner_user_id", user.id).neq("status", "done"),
        supabase.from("vehicle_documents").select("id").eq("owner_user_id", user.id).not("expires_on", "is", null).lte("expires_on", new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)),
      ]);
      setVehicles((v.data as Vehicle[]) || []);
      setTasks((t.data as Task[]) || []);
      setExpiringDocs((d.data as Doc[]) || []);
      setLoading(false);
    })();
  }, [user, hasGarage]);

  // Avoid a flash of the upgrade promo before we actually know the subscription state.
  if (garageLoading) return null;

  if (!hasGarage) {
    return (
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Car size={20} className="text-primary" />
          My Garage
        </h2>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Car size={20} className="text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Track your vehicles too</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add My Garage to get maintenance reminders, document tracking, and repair estimates for your cars and motorcycles — right alongside your home.
                </p>
              </div>
              <div className="shrink-0">
                <Button size="lg" onClick={() => navigate("/garage/upsell")} className="w-full md:w-auto gap-2">
                  <Lock size={16} /> Upgrade to Add My Garage
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overdueCount = tasks.filter((t) => t.status === "overdue").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Car size={20} className="text-primary" />
          My Garage
          {vehicles.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""})
            </span>
          )}
        </h2>
        <Button size="sm" variant="outline" onClick={() => navigate("/garage")}>Open Garage</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-24 animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <Car size={36} className="mx-auto text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">Add your first vehicle</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Track service, reminders, and documents for cars and motorcycles.
            </p>
            <Button onClick={() => navigate("/garage/vehicles")}>Add a Vehicle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Car} value={vehicles.length} label="Vehicles" onClick={() => navigate("/garage")} />
          <StatCard icon={Wrench} value={tasks.length} label="Upcoming Tasks" onClick={() => navigate("/garage")} />
          <StatCard icon={AlertTriangle} value={overdueCount} label="Overdue" isEmpty={overdueCount === 0} emptyLabel="None overdue" onClick={() => navigate("/garage")} />
          <StatCard icon={FileText} value={expiringDocs.length} label="Docs Expiring" isEmpty={expiringDocs.length === 0} emptyLabel="None expiring" onClick={() => navigate("/garage")} />
        </div>
      )}
    </div>
  );
};

export default GarageAnalyticsSection;
