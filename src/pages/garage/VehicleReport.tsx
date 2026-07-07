import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function VehicleReport() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [v, s, t] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
        supabase.from("vehicle_service_records").select("*").eq("vehicle_id", id).order("service_date", { ascending: false }),
        supabase.from("vehicle_maintenance_tasks").select("*").eq("vehicle_id", id).order("task_name"),
      ]);
      setVehicle(v.data);
      setServices(s.data || []);
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
  if (!vehicle) return <p className="p-6 text-sm text-muted-foreground">Vehicle not found.</p>;

  const totalSpend = services.reduce((sum, s) => sum + (s.cost || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <div className="no-print border-b border-border p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild><Link to={`/garage/vehicles/${id}`}><ArrowLeft size={16} className="mr-1" /> Back</Link></Button>
        <Button size="sm" onClick={() => window.print()}><Printer size={14} className="mr-1.5" /> Print / Save as PDF</Button>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-0">
        <h1 className="font-display text-2xl font-bold mb-1">Vehicle History Report</h1>
        <p className="text-sm text-muted-foreground mb-6">Generated {new Date().toLocaleDateString()} via Trimbly My Garage</p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-8 border border-border rounded-lg p-4">
          <div><span className="text-muted-foreground">Vehicle:</span> {[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ")}</div>
          <div><span className="text-muted-foreground">Nickname:</span> {vehicle.nickname || "—"}</div>
          <div><span className="text-muted-foreground">VIN:</span> {vehicle.vin || "Not on file"}</div>
          <div><span className="text-muted-foreground">License plate:</span> {vehicle.license_plate || "—"}</div>
          <div><span className="text-muted-foreground">Current mileage:</span> {vehicle.current_mileage.toLocaleString()} {vehicle.mileage_unit}</div>
          <div><span className="text-muted-foreground">Total documented service spend:</span> ${totalSpend.toFixed(2)}</div>
        </div>

        <h2 className="font-display text-lg font-bold mb-3">Service History ({services.length})</h2>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-8">No service records logged.</p>
        ) : (
          <table className="w-full text-sm mb-8 border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3">Mileage</th>
                <th className="py-1.5 pr-3">Type</th>
                <th className="py-1.5 pr-3">Description</th>
                <th className="py-1.5 pr-3">Shop</th>
                <th className="py-1.5 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{s.service_date}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{s.mileage ? s.mileage.toLocaleString() : "—"}</td>
                  <td className="py-1.5 pr-3 capitalize">{s.service_type}</td>
                  <td className="py-1.5 pr-3">{s.description}</td>
                  <td className="py-1.5 pr-3">{s.shop_name || "—"}</td>
                  <td className="py-1.5 text-right">{s.cost ? `$${Number(s.cost).toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="font-display text-lg font-bold mb-3">Maintenance Schedule ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance tasks tracked.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex justify-between border-b border-border/50 py-1">
                <span>{t.task_name}</span>
                <span className="text-muted-foreground">{t.status}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground mt-10">
          This report reflects records self-reported by the vehicle's owner via Trimbly and is not independently verified.
        </p>
      </div>
    </div>
  );
}
