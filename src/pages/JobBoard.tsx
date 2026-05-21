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
import { EmptyState } from "@/components/EmptyState";

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
  const [providerTier, setProviderTier] = useState<string>("free");
  const [activeBidsThisMonth, setActiveBidsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("All");
  const [locationQuery, setLocationQuery] = useState("");
  const [radiusMiles, setRadiusMiles] = useState<string>("any");
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [geocodingSearch, setGeocodingSearch] = useState(false);
  const [jobCoords, setJobCoords] = useState<Record<string, { lat: number; lon: number } | null>>({});
  // Map of homeowner_id -> { count, unread } of messages from that homeowner
  const [homeownerMessages, setHomeownerMessages] = useState<Record<string, { count: number; unread: number }>>({});

  // Bid form
  const [bidJob, setBidJob] = useState<Job | null>(null);
  const [bidForm, setBidForm] = useState({ message: "", bid_amount: "", estimated_hours: "", phone_number: "" });
  const [submitting, setSubmitting] = useState(false);

  // Request-more-info dialog
  const [askJob, setAskJob] = useState<Job | null>(null);
  const [askMessage, setAskMessage] = useState("");
  const [askSubmitting, setAskSubmitting] = useState(false);

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
        .select("id, subscription_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (providerData) {
        setProviderId(providerData.id);
        setProviderTier(providerData.subscription_tier || "free");
        // Load my bids
        const { data: bidsData } = await supabase
          .from("job_bids")
          .select("id, job_id, status, call_approved, message, bid_amount, created_at")
          .eq("provider_id", providerData.id);
        const bidsMap: Record<string, MyBid> = {};
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        let activeCount = 0;
        (bidsData || []).forEach((b: any) => {
          bidsMap[b.job_id] = b;
          if (["pending", "accepted"].includes(b.status) && new Date(b.created_at) >= monthStart) {
            activeCount += 1;
          }
        });
        setMyBids(bidsMap);
        setActiveBidsThisMonth(activeCount);
      }

      // Load open jobs (exclude own jobs)
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .in("status", ["pending", "open"])
        .neq("homeowner_id", user.id)
        .order("created_at", { ascending: false });
      setJobs((jobsData as Job[]) || []);

      // Load messages this pro has received (to surface conversations on jobs)
      const { data: msgsData } = await supabase
        .from("messages")
        .select("sender_id, read")
        .eq("recipient_id", user.id);
      const msgMap: Record<string, { count: number; unread: number }> = {};
      (msgsData || []).forEach((m: any) => {
        if (!msgMap[m.sender_id]) msgMap[m.sender_id] = { count: 0, unread: 0 };
        msgMap[m.sender_id].count += 1;
        if (!m.read) msgMap[m.sender_id].unread += 1;
      });
      setHomeownerMessages(msgMap);

      setLoading(false);
    })();
  }, [user]);

  // Geocode helper using OpenStreetMap Nominatim (free, no key)
  const geocode = async (q: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { "Accept": "application/json" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error("geocode failed", e);
    }
    return null;
  };

  const distanceMiles = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 3958.8;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const handleLocationSearch = async () => {
    if (!locationQuery.trim()) {
      setSearchCenter(null);
      return;
    }
    setGeocodingSearch(true);
    const center = await geocode(locationQuery.trim());
    setSearchCenter(center);
    setGeocodingSearch(false);
    if (!center) {
      toast({ title: "Location not found", description: "Try a different city, state, or zip code.", variant: "destructive" });
      return;
    }
    // Geocode unique job locations not yet cached
    const uniqueLocs = Array.from(new Set(jobs.map((j) => `${j.city}, ${j.state}, ${j.country}`)));
    const toFetch = uniqueLocs.filter((k) => !(k in jobCoords));
    if (toFetch.length === 0) return;
    const results: Record<string, { lat: number; lon: number } | null> = {};
    for (const loc of toFetch) {
      results[loc] = await geocode(loc);
      // small delay to be polite to Nominatim (1 req/sec policy)
      await new Promise((r) => setTimeout(r, 1100));
    }
    setJobCoords((prev) => ({ ...prev, ...results }));
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (filterCategory !== "All" && j.category !== filterCategory) return false;
      if (searchCenter && radiusMiles !== "any") {
        const key = `${j.city}, ${j.state}, ${j.country}`;
        const c = jobCoords[key];
        if (!c) return false;
        if (distanceMiles(searchCenter, c) > parseFloat(radiusMiles)) return false;
      }
      return true;
    });
  }, [jobs, filterCategory, searchCenter, radiusMiles, jobCoords]);

  const FREE_BID_LIMIT = 5;
  const isPaid = providerTier !== "free";
  const bidsLeft = isPaid ? Infinity : Math.max(0, FREE_BID_LIMIT - activeBidsThisMonth);

  const handleBidSubmit = async () => {
    if (!user || !providerId || !bidJob || !bidForm.message.trim()) {
      toast({ title: "Message required", description: "You must write a message to the homeowner.", variant: "destructive" });
      return;
    }
    if (!isPaid && activeBidsThisMonth >= FREE_BID_LIMIT) {
      toast({
        title: "Monthly bid limit reached",
        description: `Free pros get ${FREE_BID_LIMIT} active bids per month. Upgrade for unlimited bids.`,
        variant: "destructive",
      });
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
        .select("id, job_id, status, call_approved, message, bid_amount, created_at")
        .eq("provider_id", providerId);
      const bidsMap: Record<string, MyBid> = {};
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      let activeCount = 0;
      (bidsData || []).forEach((b: any) => {
        bidsMap[b.job_id] = b;
        if (["pending", "accepted"].includes(b.status) && new Date(b.created_at) >= monthStart) {
          activeCount += 1;
        }
      });
      setMyBids(bidsMap);
      setActiveBidsThisMonth(activeCount);
      setBidJob(null);
      setBidForm({ message: "", bid_amount: "", estimated_hours: "", phone_number: "" });
    }
    setSubmitting(false);
  };

  const openAskInfo = (job: Job) => {
    setAskJob(job);
    setAskMessage(
      `Hi! I'm interested in your "${job.title}" job. Before I send a bid, could you share a bit more detail? For example:\n\n• What's the timeline / when would you like it done?\n• Any photos or measurements you can share?\n• Anything you've already tried or ruled out?\n\nThanks!`
    );
  };

  const sendAskInfo = async () => {
    if (!user || !providerId || !askJob || !askMessage.trim()) {
      toast({ title: "Message required", description: "Write a short message to the homeowner.", variant: "destructive" });
      return;
    }
    setAskSubmitting(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: askJob.homeowner_id,
      provider_id: providerId,
      subject: `Question about: ${askJob.title}`,
      body: askMessage.trim(),
    });
    setAskSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Message sent", description: "The homeowner can reply in Messages." });
    setAskJob(null);
    setAskMessage("");
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
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-muted-foreground" />
            <Input
              placeholder="City, state, or zip..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
              className="w-52"
            />
          </div>
          <Select value={radiusMiles} onValueChange={setRadiusMiles}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Radius" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any distance</SelectItem>
              <SelectItem value="10">Within 10 mi</SelectItem>
              <SelectItem value="20">Within 20 mi</SelectItem>
              <SelectItem value="50">Within 50 mi</SelectItem>
              <SelectItem value="100">Within 100 mi</SelectItem>
              <SelectItem value="250">Within 250 mi</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleLocationSearch}
            disabled={geocodingSearch || !locationQuery.trim()}
          >
            {geocodingSearch ? "Searching..." : "Search"}
          </Button>
          {searchCenter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setLocationQuery(""); setSearchCenter(null); setRadiusMiles("any"); }}
            >
              Clear
            </Button>
          )}
          <Badge variant="outline" className="self-center">{filteredJobs.length} jobs</Badge>
        </div>

        {/* Job Cards */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Briefcase}
                title="No open jobs match your filters"
                description="Try expanding your search radius or selecting a different category. New jobs from homeowners are posted often."
                actionLabel="Clear filters"
                onAction={() => { setFilterCategory("All"); setLocationQuery(""); setSearchCenter(null); setRadiusMiles("any"); }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const myBid = myBids[job.id];
              const msgInfo = homeownerMessages[job.homeowner_id];
              return (
                <Card key={job.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{job.title}</h3>
                          {msgInfo && msgInfo.count > 0 && (
                            <button
                              onClick={() => navigate("/messages")}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                                msgInfo.unread > 0
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                              title="Open conversation"
                            >
                              <MessageSquare size={12} />
                              {msgInfo.unread > 0 ? `${msgInfo.unread} new message${msgInfo.unread === 1 ? "" : "s"}` : "Message"}
                            </button>
                          )}
                        </div>
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
              {!isPaid && (
                <div className={`rounded-lg p-3 text-xs ${bidsLeft <= 1 ? "bg-orange-500/10 border border-orange-500/30" : "bg-primary/5 border border-primary/20"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {bidsLeft === 0
                        ? "Monthly bid limit reached"
                        : `${bidsLeft} of ${FREE_BID_LIMIT} free bids left this month`}
                    </span>
                    <Button size="sm" variant="link" className="h-auto p-0 text-primary" onClick={() => navigate("/pro-pricing")}>
                      Upgrade →
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1">Pro pros get unlimited bids and faster homeowner approvals.</p>
                </div>
              )}
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
            <Button onClick={handleBidSubmit} disabled={submitting || (!isPaid && bidsLeft === 0)} className="gap-1">
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
