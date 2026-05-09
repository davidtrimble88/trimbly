import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, MapPin, Clock, DollarSign, MessageSquare, Send,
  Phone, PhoneOff, CheckCircle, User, Filter,
} from "lucide-react";

const categories = [
  "All", "Plumbing", "Electrical", "HVAC", "Roofing", "Painting", "Carpentry",
  "Landscaping", "Cleaning", "Pest Control", "Appliance Repair",
  "Flooring", "Drywall", "Fencing", "General Handyman", "Other",
];

type Job = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string;
  state: string;
  country: string;
  status: string;
  created_at: string;
  homeowner_id: string;
};

type MyBid = {
  id: string;
  job_id: string;
  status: string;
  call_approved: boolean;
  message: string;
  bid_amount: number | null;
};

const JobBoard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [myBids, setMyBids] = useState<Record<string, MyBid>>({});
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("All");
  const [locationQuery, setLocationQuery] = useState("");
  const [radiusMiles, setRadiusMiles] = useState<string>("any");
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [geocodingSearch, setGeocodingSearch] = useState(false);
  const [jobCoords, setJobCoords] = useState<Record<string, { lat: number; lon: number } | null>>({});

  // Bid form
  const [bidJob, setBidJob] = useState<Job | null>(null);
  const [bidForm, setBidForm] = useState({ message: "", bid_amount: "", estimated_hours: "", phone_number: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  // Load provider profile and jobs
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // Get provider profile
      const { data: providerData } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (providerData) {
        setProviderId(providerData.id);
        // Load my bids
        const { data: bidsData } = await supabase
          .from("job_bids")
          .select("id, job_id, status, call_approved, message, bid_amount")
          .eq("provider_id", providerData.id);
        const bidsMap: Record<string, MyBid> = {};
        (bidsData || []).forEach((b: any) => { bidsMap[b.job_id] = b; });
        setMyBids(bidsMap);
      }

      // Load open jobs (exclude own jobs)
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .in("status", ["pending", "open"])
        .neq("homeowner_id", user.id)
        .order("created_at", { ascending: false });
      setJobs((jobsData as Job[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const filteredJobs = jobs.filter((j) => {
    if (filterCategory !== "All" && j.category !== filterCategory) return false;
    if (filterCity && !j.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    return true;
  });

  const handleBidSubmit = async () => {
    if (!user || !providerId || !bidJob || !bidForm.message.trim()) {
      toast({ title: "Message required", description: "You must write a message to the homeowner.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("job_bids").insert({
      job_id: bidJob.id,
      provider_id: providerId,
      message: bidForm.message.trim(),
      bid_amount: bidForm.bid_amount ? parseFloat(bidForm.bid_amount) : null,
      estimated_hours: bidForm.estimated_hours ? parseFloat(bidForm.estimated_hours) : null,
      phone_number: bidForm.phone_number || null,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already bid", description: "You've already submitted a bid on this job.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Bid sent!", description: "The homeowner will review your message." });
      // Refresh my bids
      const { data: bidsData } = await supabase
        .from("job_bids")
        .select("id, job_id, status, call_approved, message, bid_amount")
        .eq("provider_id", providerId);
      const bidsMap: Record<string, MyBid> = {};
      (bidsData || []).forEach((b: any) => { bidsMap[b.job_id] = b; });
      setMyBids(bidsMap);
      setBidJob(null);
      setBidForm({ message: "", bid_amount: "", estimated_hours: "", phone_number: "" });
    }
    setSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!providerId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Briefcase className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">Job Board</h1>
          <p className="text-muted-foreground mb-6">You need a provider profile to browse and bid on jobs.</p>
          <Button onClick={() => navigate("/pro-register")}>Register as a Pro</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-10 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" /> Job Board
          </h1>
          <p className="text-muted-foreground">Browse open jobs from homeowners and send your bid</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Filter by city..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-48"
          />
          <Badge variant="outline" className="self-center">{filteredJobs.length} jobs</Badge>
        </div>

        {/* Job Cards */}
        {filteredJobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No open jobs</h3>
              <p className="text-sm text-muted-foreground">Check back later for new job postings from homeowners.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const myBid = myBids[job.id];
              return (
                <Card key={job.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{job.title}</h3>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Briefcase size={12} /> {job.category}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {job.city}, {job.state}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                        {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
                      </div>
                      <div className="ml-4 shrink-0">
                        {myBid ? (
                          <div className="text-center">
                            <Badge className={`text-xs ${
                              myBid.status === "accepted" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              myBid.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-secondary text-secondary-foreground"
                            }`}>
                              {myBid.status === "accepted" ? "Accepted" : myBid.status === "rejected" ? "Rejected" : "Bid Sent"}
                            </Badge>
                            {myBid.call_approved && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                                <Phone size={12} /> Call approved
                              </div>
                            )}
                            {myBid.status === "accepted" && !myBid.call_approved && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <PhoneOff size={12} /> Message only
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setBidJob(job)} className="gap-1">
                            <Send size={14} /> Send Bid
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bid Dialog */}
      <Dialog open={!!bidJob} onOpenChange={(o) => !o && setBidJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Bid to Homeowner</DialogTitle>
          </DialogHeader>
          {bidJob && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{bidJob.title}</p>
                <p className="text-xs text-muted-foreground">{bidJob.category} · {bidJob.city}, {bidJob.state}</p>
              </div>
              <div>
                <Label>Message to Homeowner *</Label>
                <Textarea
                  placeholder="Introduce yourself, describe your experience with this type of job, and explain your approach..."
                  value={bidForm.message}
                  onChange={(e) => setBidForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1 min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">The homeowner must approve you before you can call them.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bid Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 250"
                    value={bidForm.bid_amount}
                    onChange={(e) => setBidForm((f) => ({ ...f, bid_amount: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 3"
                    value={bidForm.estimated_hours}
                    onChange={(e) => setBidForm((f) => ({ ...f, estimated_hours: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Your Phone (optional)</Label>
                <Input
                  placeholder="Shared only if homeowner approves calling"
                  value={bidForm.phone_number}
                  onChange={(e) => setBidForm((f) => ({ ...f, phone_number: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <PhoneOff size={10} /> Your phone number is hidden until the homeowner explicitly allows calling.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidJob(null)}>Cancel</Button>
            <Button onClick={handleBidSubmit} disabled={submitting} className="gap-1">
              <Send size={14} /> {submitting ? "Sending..." : "Send Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default JobBoard;
