import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Wrench, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/dashboard/StatCard";
import StatCardSkeleton from "@/components/dashboard/StatCardSkeleton";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
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

  const overdueCount = tasks.filter((t) => t.status === "overdue").length;

  return (
    <div>
      {/* UpgradeGate's locked card already carries its own icon + "My
       * Garage" title + description, so this header (which would otherwise
       * duplicate that title) only renders once there's real content to
       * label. */}
      {hasGarage && (
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
      )}

      <UpgradeGate
        hasAccess={hasGarage}
        variant="card"
        featureName="My Garage"
        description="Add My Garage to get maintenance reminders, document tracking, and repair estimates for your cars and motorcycles — right alongside your home."
        benefits={["Maintenance reminders", "Document tracking", "Repair estimates", "Find trusted mechanics"]}
        pricingRoute="/garage/upsell"
        icon={Car}
      >
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
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
            <StatCard icon={AlertTriangle} value={overdueCount} label="Overdue" isEmpty={overdueCount === 0} emptyLabel="None overdue" onClick={() => navigate("/garage")} tone="danger" />
            <StatCard icon={FileText} value={expiringDocs.length} label="Docs Expiring" isEmpty={expiringDocs.length === 0} emptyLabel="None expiring" onClick={() => navigate("/garage")} tone="warning" />
          </div>
        )}
      </UpgradeGate>
    </div>
  );
};

export default GarageAnalyticsSection;
