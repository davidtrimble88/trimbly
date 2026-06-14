import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Bike, MapPin, DollarSign, Wrench } from "lucide-react";
import { toast } from "sonner";

type Job = {
  id: string; title: string; description: string | null; category: string;
  service_type: string; city: string; state: string;
  mobile_service: boolean; budget_min: number | null; budget_max: number | null;
  created_at: string;
};

export default function VehicleJobBoard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [myBids, setMyBids] = useState<Record<string, { id: string; status: string }>>({});
  const [bidJob, setBidJob] = useState<Job | null>(null);
  const [bidForm, setBidForm] = useState({ message: "", bid_amount: "", estimated_hours: "" });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "auto" | "motorcycle">("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: prov } = await supabase.from("providers").select("id").eq("user_id", user.id).maybeSingle();
    setProviderId(prov?.id ?? null);

    const { data: jobsData } = await supabase
      .from("vehicle_jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setJobs((jobsData as Job[]) || []);

    if (prov?.id) {
      const { data: bidsData } = await supabase
        .from("vehicle_job_bids")
        .select("id, vehicle_job_id, status")
        .eq("provider_id", prov.id);
      const map: Record<string, { id: string; status: string }> = {};
      (bidsData || []).forEach((b: any) => { map[b.vehicle_job_id] = { id: b.id, status: b.status }; });
      setMyBids(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const placeBid = async () => {
    if (!bidJob || !providerId || !bidForm.message.trim()) {
      toast.error("Add a message before sending."); return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("vehicle_job_bids").insert({
      vehicle_job_id: bidJob.id,
      provider_id: providerId,
      message: bidForm.message.trim(),
      bid_amount: bidForm.bid_amount ? Number(bidForm.bid_amount) : null,
      estimated_hours: bidForm.estimated_hours ? Number(bidForm.estimated_hours) : null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bid sent");
    setBidJob(null);
    setBidForm({ message: "", bid_amount: "", estimated_hours: "" });
    load();
  };

  const visible = jobs.filter((j) => filter === "all" || j.service_type === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 pt-24 pb-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Wrench className="w-7 h-7" /> Vehicle Jobs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Open work from My Garage subscribers. Bid to connect with the owner.
            </p>
          </div>
        </div>

        {!authLoading && !providerId && (
          <Card className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-4 text-sm">
              Set up a provider profile to bid on vehicle jobs.{" "}
              <Button size="sm" variant="link" className="px-1" onClick={() => navigate("/become-a-pro")}>
                Become a Pro →
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 mb-4">
          {(["all", "auto", "motorcycle"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "auto" ? "Cars & Trucks" : "Motorcycles"}
            </Button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : visible.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No open vehicle jobs right now.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {visible.map((job) => {
              const mine = myBids[job.id];
              return (
                <Card key={job.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {job.service_type === "motorcycle" ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                          <CardTitle className="text-base">{job.title}</CardTitle>
                          <Badge variant="secondary">{job.category}</Badge>
                          {job.mobile_service && <Badge variant="outline">Mobile OK</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}, {job.state}</span>
                          {(job.budget_min || job.budget_max) && (
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />
                              {job.budget_min || 0}{job.budget_max ? `–${job.budget_max}` : "+"}
                            </span>
                          )}
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {providerId && (
                        mine ? (
                          <Badge variant={mine.status === "accepted" ? "default" : "secondary"}>Bid {mine.status}</Badge>
                        ) : (
                          <Button size="sm" onClick={() => setBidJob(job)}>Place Bid</Button>
                        )
                      )}
                    </div>
                  </CardHeader>
                  {job.description && (
                    <CardContent className="pt-0 text-sm text-muted-foreground">{job.description}</CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!bidJob} onOpenChange={(o) => !o && setBidJob(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bid on: {bidJob?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Message *</Label>
              <Textarea rows={4} value={bidForm.message} onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })} placeholder="What you'd do, when you can start, anything you need from the owner." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bid ($)</Label><Input type="number" value={bidForm.bid_amount} onChange={(e) => setBidForm({ ...bidForm, bid_amount: e.target.value })} /></div>
              <div><Label>Est. hours</Label><Input type="number" value={bidForm.estimated_hours} onChange={(e) => setBidForm({ ...bidForm, estimated_hours: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBidJob(null)}>Cancel</Button>
            <Button onClick={placeBid} disabled={submitting}>{submitting ? "Sending…" : "Send Bid"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
