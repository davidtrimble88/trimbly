import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GarageDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [d, v] = await Promise.all([
        supabase.from("vehicle_documents").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("vehicles").select("id, nickname, make, model, year").eq("owner_user_id", user.id),
      ]);
      setDocs(d.data || []);
      const m: Record<string, any> = {};
      (v.data || []).forEach((row: any) => { m[row.id] = row; });
      setVehicleMap(m);
      setLoading(false);
    })();
  }, [user]);

  const open = async (doc: any) => {
    const { data, error } = await supabase.storage.from("vehicle-docs").createSignedUrl(doc.file_url, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">All Documents</h1>
      {docs.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <FileText size={40} className="mx-auto text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">No documents yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Registration, insurance, titles, and manuals uploaded from any vehicle's page will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Across all vehicles</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {docs.map((d) => {
                const v = vehicleMap[d.vehicle_id];
                return (
                  <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="capitalize">{d.doc_type}</Badge>
                        <span className="text-sm truncate">{d.file_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {v && <Link to={`/garage/vehicles/${d.vehicle_id}`} className="hover:text-foreground underline">{v.nickname || `${v.year ?? ""} ${v.make} ${v.model}`.trim()}</Link>}
                        {d.expires_on ? ` · expires ${d.expires_on}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => open(d)}>Open</Button>
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
