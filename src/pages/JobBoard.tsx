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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Briefcase, MapPin, Clock, DollarSign, MessageSquare, Send,
  Phone, PhoneOff, CheckCircle, User, Filter, Wrench, Sparkles, Loader2, Lightbulb,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getJobEstimate, type JobEstimate } from "@/lib/api/jobEstimator";

const categories = [
  "All", "General Contractor", "Plumbing", "Electrical", "HVAC", "Roofing", "Painting", "Carpentry",
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
  budget_min?: number | null;
  budget_max?: number | null;
  photo_urls?: string[] | null;
  video_url?: string | null;
};

type ThreadMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  subject: string;
  created_at: string;
  read: boolean;
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
  const [providerBusinessName, setProviderBusinessName] = useState<string>("");
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
  const [bidForm, setBidForm] = useState({
    message: "",
    materials_cost: "",
    labor_mode: "hourly" as "hourly" | "flat",
    labor_rate: "",
    labor_flat: "",
    estimated_hours: "",
    phone_number: "",
  });
  const computeBidTotal = (f: typeof bidForm) => {
    const mats = parseFloat(f.materials_cost) || 0;
    const labor = f.labor_mode === "hourly"
      ? (parseFloat(f.labor_rate) || 0) * (parseFloat(f.estimated_hours) || 0)
      : (parseFloat(f.labor_flat) || 0);
    return mats + labor;
  };
  const [submitting, setSubmitting] = useState(false);
  const [suggestingMessage, setSuggestingMessage] = useState(false);

  // Request-more-info dialog
  const [askJob, setAskJob] = useState<Job | null>(null);
  const [askMessage, setAskMessage] = useState("");
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [askAiLoading, setAskAiLoading] = useState(false);
  const [askAiQuestions, setAskAiQuestions] = useState<string[]>([]);
  const [askAiRound, setAskAiRound] = useState(0);

  // Job helper (AI breakdown for pros)
  const [helperJob, setHelperJob] = useState<Job | null>(null);
  const [helperLoading, setHelperLoading] = useState(false);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [helperCache, setHelperCache] = useState<Record<string, JobEstimate>>({});

  // Job detail dialog
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailThread, setDetailThread] = useState<ThreadMessage[]>([]);
  const [detailThreadLoading, setDetailThreadLoading] = useState(false);
  const [detailHomeownerName, setDetailHomeownerName] = useState<string>("");

  const openJobDetail = async (job: Job) => {
    setDetailJob(job);
    setDetailThread([]);
    setDetailHomeownerName("");
    if (!user) return;
    setDetailThreadLoading(true);
    try {
      const [{ data: msgs }, { data: prof }] = await Promise.all([
        supabase
          .from("messages")
          .select("id, sender_id, recipient_id, body, subject, created_at, read")
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${job.homeowner_id}),and(sender_id.eq.${job.homeowner_id},recipient_id.eq.${user.id})`)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("full_name").eq("id", job.homeowner_id).maybeSingle(),
      ]);
      setDetailThread((msgs as ThreadMessage[]) || []);
      setDetailHomeownerName((prof as any)?.full_name || "Homeowner");
      // Mark unread incoming as read
      const unreadIds = (msgs || []).filter((m: any) => !m.read && m.recipient_id === user.id).map((m: any) => m.id);
      if (unreadIds.length) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        setHomeownerMessages((prev) => {
          const next = { ...prev };
          if (next[job.homeowner_id]) next[job.homeowner_id] = { ...next[job.homeowner_id], unread: 0 };
          return next;
        });
      }
    } finally {
      setDetailThreadLoading(false);
    }
  };

  const openHelper = async (job: Job) => {
    setHelperJob(job);
    setHelperError(null);
    if (helperCache[job.id]) return;
    setHelperLoading(true);
    try {
      const estimate = await getJobEstimate({
        description: `${job.title}\n\n${job.description || ""}`.trim(),
        category: job.category,
        city: job.city,
        state: job.state,
      });
      setHelperCache((c) => ({ ...c, [job.id]: estimate }));
    } catch (e: any) {
      setHelperError(e?.message || "Could not analyze this job");
    } finally {
      setHelperLoading(false);
    }
  };


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
        .select("id, subscription_tier, business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (providerData) {
        setProviderId(providerData.id);
        setProviderTier(providerData.subscription_tier || "free");
        setProviderBusinessName(providerData.business_name || "");
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
      const { data: openJobsData } = await supabase
        .from("jobs")
        .select("*")
        .in("status", ["pending", "open"])
        .neq("homeowner_id", user.id)
        .order("created_at", { ascending: false });

      // Also load any jobs where this pro has a bid (any status), so accepted/completed show up
      const bidJobIds = Object.keys((await (async () => {
        const { data } = await supabase
          .from("job_bids")
          .select("job_id")
          .eq("provider_id", providerData?.id || "00000000-0000-0000-0000-000000000000");
        const set: Record<string, true> = {};
        (data || []).forEach((b: any) => { set[b.job_id] = true; });
        return set;
      })()));
      let bidJobs: Job[] = [];
      if (bidJobIds.length) {
        const { data: bj } = await supabase
          .from("jobs")
          .select("*")
          .in("id", bidJobIds);
        bidJobs = (bj as Job[]) || [];
      }

      // Merge unique
      const byId: Record<string, Job> = {};
      ((openJobsData as Job[]) || []).forEach((j) => { byId[j.id] = j; });
      bidJobs.forEach((j) => { byId[j.id] = j; });
      const merged = Object.values(byId).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setJobs(merged);

      // Load messages this pro has sent or received (to surface conversations on jobs)
      const { data: msgsData } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, read")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
      const msgMap: Record<string, { count: number; unread: number }> = {};
      (msgsData || []).forEach((m: any) => {
        const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (!msgMap[otherId]) msgMap[otherId] = { count: 0, unread: 0 };
        msgMap[otherId].count += 1;
        if (!m.read && m.recipient_id === user.id) msgMap[otherId].unread += 1;
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

  // Tab buckets
  const [activeTab, setActiveTab] = useState<"posted" | "conversations" | "accepted" | "complete">("posted");

  const buckets = useMemo(() => {
    const posted: Job[] = [];
    const conversations: Job[] = [];
    const accepted: Job[] = [];
    const complete: Job[] = [];
    for (const j of filteredJobs) {
      const myBid = myBids[j.id];
      const hasConvo = !!homeownerMessages[j.homeowner_id];
      const isCompleted = j.status === "completed";
      const isAccepted = myBid?.status === "accepted" && !isCompleted;

      if (isCompleted && myBid) {
        complete.push(j);
        continue;
      }
      if (isAccepted) {
        accepted.push(j);
        continue;
      }
      if (hasConvo) {
        conversations.push(j);
        // also keep on Posted if it's still open & I haven't bid
        if (!myBid && (j.status === "pending" || j.status === "open")) posted.push(j);
        continue;
      }
      if (!myBid && (j.status === "pending" || j.status === "open")) {
        posted.push(j);
      }
    }
    return { posted, conversations, accepted, complete };
  }, [filteredJobs, myBids, homeownerMessages]);

  const tabJobs = buckets[activeTab];

  const FREE_BID_LIMIT = 5;
  const isPaid = providerTier !== "free";
  const bidsLeft = isPaid ? Infinity : Math.max(0, FREE_BID_LIMIT - activeBidsThisMonth);
  const suggestBidMessage = async () => {
    if (!bidJob) return;
    setSuggestingMessage(true);
    try {
      const total = computeBidTotal(bidForm);
      const priceLine = total > 0
        ? `Bid total: $${total.toLocaleString()} (materials $${(parseFloat(bidForm.materials_cost) || 0).toLocaleString()} + labor $${(total - (parseFloat(bidForm.materials_cost) || 0)).toLocaleString()}${bidForm.labor_mode === "hourly" && bidForm.labor_rate && bidForm.estimated_hours ? `, ${bidForm.estimated_hours}hr @ $${bidForm.labor_rate}/hr` : ""})`
        : "Bid total not yet calculated";
      const jobBlurb = `Job: "${bidJob.title}" (${bidJob.category}) in ${bidJob.city}, ${bidJob.state}.\n${bidJob.description || "(no description provided)"}\n\n${priceLine}`;
      const { data, error } = await supabase.functions.invoke("message-copilot", {
        body: {
          mode: "draft_reply",
          businessName: providerBusinessName || "the pro",
          tone: "friendly, professional, confident",
          thread: [{ sender: "homeowner", body: jobBlurb }],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const content = (data?.content || "").trim();
      if (!content) throw new Error("No suggestion returned");
      setBidForm((f) => ({ ...f, message: content }));
      toast({ title: "Message drafted", description: "Tweak it before sending." });
    } catch (e: any) {
      toast({ title: "AI helper error", description: e.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setSuggestingMessage(false);
    }
  };

  const [markingComplete, setMarkingComplete] = useState(false);
  const markJobComplete = async (job: Job) => {
    if (!user || !providerId) return;
    if (!confirm(`Mark "${job.title}" as complete? The homeowner will be notified and asked to leave a review.`)) return;
    setMarkingComplete(true);
    try {
      const { error: jErr } = await supabase
        .from("jobs")
        .update({ status: "completed" })
        .eq("id", job.id);
      if (jErr) throw jErr;

      // Notify homeowner via in-app message (trigger also creates the review_request row)
      const businessLabel = providerBusinessName || "Your pro";
      await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: job.homeowner_id,
        subject: `Job complete: ${job.title}`,
        body: `${businessLabel} marked the job "${job.title}" as complete. If everything looks good, please take a moment to leave a quick review — it really helps small businesses like ours. You'll see a prompt the next time you open your dashboard.`,
      });

      // Optimistic local update
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "completed" } : j)));
      setDetailJob((d) => (d && d.id === job.id ? { ...d, status: "completed" } : d));
      toast({ title: "Marked complete", description: "The homeowner has been notified and asked to review." });
    } catch (e: any) {
      toast({ title: "Couldn't mark complete", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setMarkingComplete(false);
    }
  };

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
      bid_amount: computeBidTotal(bidForm) || null,
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
      setBidForm({ message: "", materials_cost: "", labor_mode: "hourly", labor_rate: "", labor_flat: "", estimated_hours: "", phone_number: "" });
    }
    setSubmitting(false);
  };

  const isJobInfoThin = (job: Job) => {
    const d = (job.description || "").trim();
    const words = d ? d.split(/\s+/).length : 0;
    return d.length < 80 || words < 15;
  };

  const openAskInfo = (job: Job) => {
    setAskJob(job);
    setAskAiQuestions([]);
    setAskAiRound(0);
    setAskMessage(
      `Hi! I'm interested in your "${job.title}" job. Before I send a bid, could you share a bit more detail? For example:\n\n• What's the timeline / when would you like it done?\n• Any photos or measurements you can share?\n• Anything you've already tried or ruled out?\n\nThanks!`
    );
  };

  const fetchAskAiQuestions = async () => {
    if (!askJob) return;
    setAskAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-description-helper", {
        body: {
          title: askJob.title,
          category: askJob.category,
          description: askJob.description || "",
          city: askJob.city,
          state: askJob.state,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs: string[] = Array.isArray(data?.missing_info) ? data.missing_info : [];
      setAskAiQuestions(qs);
      setAskAiRound((r) => r + 1);
      if (qs.length === 0) {
        toast({ title: "Looks complete", description: "The AI didn't find obvious gaps — you may have enough to bid." });
      }
    } catch (e: any) {
      toast({ title: "AI helper error", description: e.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setAskAiLoading(false);
    }
  };

  const insertAiQuestionsIntoMessage = () => {
    if (askAiQuestions.length === 0) return;
    const bullets = askAiQuestions.map((q) => `• ${q}`).join("\n");
    const intro = `Hi! Before I bid on "${askJob?.title}", could you share a few more details:\n\n`;
    setAskMessage(intro + bullets + "\n\nThanks!");
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
    setAskAiQuestions([]);
    setAskAiRound(0);
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
          <Badge variant="outline" className="self-center">{filteredJobs.length} matching</Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto">
            <TabsTrigger value="posted" className="flex items-center gap-1.5 py-2">
              <Briefcase size={14} /> Posted
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{buckets.posted.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-1.5 py-2">
              <MessageSquare size={14} /> Conversations
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{buckets.conversations.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="flex items-center gap-1.5 py-2">
              <CheckCircle size={14} /> Accepted
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{buckets.accepted.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="complete" className="flex items-center gap-1.5 py-2">
              <CheckCircle size={14} /> Complete
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{buckets.complete.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {tabJobs.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={Briefcase}
                    title={
                      activeTab === "posted" ? "No open jobs match your filters" :
                      activeTab === "conversations" ? "No conversations yet" :
                      activeTab === "accepted" ? "No accepted bids yet" :
                      "No completed jobs yet"
                    }
                    description={
                      activeTab === "posted" ? "Try expanding your search radius or selecting a different category. New jobs are posted often." :
                      activeTab === "conversations" ? "Start a conversation by tapping Ask for Info on a posted job." :
                      activeTab === "accepted" ? "Once a homeowner accepts your bid, it will appear here." :
                      "Jobs marked completed by the homeowner will appear here."
                    }
                    actionLabel={activeTab === "posted" ? "Clear filters" : undefined}
                    onAction={activeTab === "posted" ? () => { setFilterCategory("All"); setLocationQuery(""); setSearchCenter(null); setRadiusMiles("any"); } : undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tabJobs.map((job) => {
                  const myBid = myBids[job.id];
                  const msgInfo = homeownerMessages[job.homeowner_id];
                  return (
                    <Card
                      key={job.id}
                      className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => openJobDetail(job)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openJobDetail(job); } }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{job.title}</h3>
                              {job.status === "completed" && (
                                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle size={10} className="mr-1" /> Completed
                                </Badge>
                              )}
                              {msgInfo && msgInfo.count > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate("/messages"); }}
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
                              {(job.budget_min || job.budget_max) && (
                                <span className="flex items-center gap-1 text-foreground font-medium">
                                  <DollarSign size={12} className="text-primary" />
                                  Budget {job.budget_min && job.budget_max
                                    ? `$${Number(job.budget_min).toLocaleString()}–$${Number(job.budget_max).toLocaleString()}`
                                    : job.budget_min
                                      ? `from $${Number(job.budget_min).toLocaleString()}`
                                      : `up to $${Number(job.budget_max).toLocaleString()}`}
                                </span>
                              )}
                            </div>
                            {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
                            {isJobInfoThin(job) && activeTab === "posted" && (
                              <div className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/5 px-2 py-1 text-xs">
                                <Lightbulb size={12} className="text-orange-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">
                                  Sparse details — ask the homeowner for more info before bidding.
                                </span>
                              </div>
                            )}
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
                                {myBid.bid_amount != null && (
                                  <div className="mt-1 text-xs text-foreground font-medium">
                                    ${Number(myBid.bid_amount).toLocaleString()}
                                  </div>
                                )}
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
                              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" onClick={() => setBidJob(job)} className="gap-1">
                                  <Send size={14} /> Send Bid
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openHelper(job)} className="gap-1">
                                  <Sparkles size={14} /> Job Helper
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => openAskInfo(job)} className="gap-1">
                                  <MessageSquare size={14} /> Ask for Info
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Detail Dialog */}
      <Dialog open={!!detailJob} onOpenChange={(o) => { if (!o) { setDetailJob(null); setDetailThread([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {detailJob?.title}
            </DialogTitle>
          </DialogHeader>
          {detailJob && (() => {
            const myBid = myBids[detailJob.id];
            const msgInfo = homeownerMessages[detailJob.homeowner_id];
            return (
              <div className="space-y-5">
                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase size={12} /> {detailJob.category}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {detailJob.city}, {detailJob.state} {detailJob.country}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> Posted {new Date(detailJob.created_at).toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs capitalize">{detailJob.status}</Badge>
                </div>

                {/* Budget */}
                {(detailJob.budget_min || detailJob.budget_max) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
                    <DollarSign size={16} className="text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Homeowner's budget</div>
                      <div className="font-semibold text-foreground">
                        {detailJob.budget_min && detailJob.budget_max
                          ? `$${Number(detailJob.budget_min).toLocaleString()} – $${Number(detailJob.budget_max).toLocaleString()}`
                          : detailJob.budget_min
                            ? `From $${Number(detailJob.budget_min).toLocaleString()}`
                            : `Up to $${Number(detailJob.budget_max).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {detailJob.description || "(No description provided)"}
                  </p>
                  {isJobInfoThin(detailJob) && (
                    <div className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/5 px-2 py-1 text-xs">
                      <Lightbulb size={12} className="text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Sparse details — use "Ask for Info" below.</span>
                    </div>
                  )}
                </div>

                {/* Photos */}
                {detailJob.photo_urls && detailJob.photo_urls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Photos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {detailJob.photo_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md border border-border bg-muted">
                          <img src={url} alt={`Job photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {detailJob.video_url && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Video</h4>
                    <video src={detailJob.video_url} controls className="w-full rounded-md border border-border bg-black" />
                  </div>
                )}

                {/* Homeowner */}
                <div className="rounded-lg border bg-card p-3 flex items-center gap-2">
                  <User size={16} className="text-muted-foreground" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Posted by </span>
                    <span className="font-medium text-foreground">{detailHomeownerName || "Homeowner"}</span>
                  </div>
                </div>

                {/* My bid */}
                {myBid && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Your bid</h4>
                      <Badge className={`text-xs ${
                        myBid.status === "accepted" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        myBid.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-secondary text-secondary-foreground"
                      }`}>
                        {myBid.status === "accepted" ? "Accepted" : myBid.status === "rejected" ? "Rejected" : "Pending"}
                      </Badge>
                    </div>
                    {myBid.bid_amount != null && (
                      <div className="text-sm text-foreground flex items-center gap-1">
                        <DollarSign size={14} className="text-primary" />
                        ${Number(myBid.bid_amount).toLocaleString()}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{myBid.message}</p>
                    <div className="text-xs flex items-center gap-1 text-muted-foreground">
                      {myBid.call_approved
                        ? <><Phone size={12} className="text-green-600" /> Homeowner approved a phone call</>
                        : <><PhoneOff size={12} /> In-app messaging only</>}
                    </div>
                  </div>
                )}

                {/* Messages thread */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <MessageSquare size={14} /> Conversation with homeowner
                      {msgInfo && msgInfo.unread > 0 && (
                        <Badge className="ml-1 text-[10px] bg-primary text-primary-foreground">{msgInfo.unread} new</Badge>
                      )}
                    </h4>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/messages")}>
                      Open in Messages
                    </Button>
                  </div>
                  {detailThreadLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                      <Loader2 size={14} className="animate-spin" /> Loading messages...
                    </div>
                  ) : detailThread.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No messages yet between you and this homeowner.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border border-border p-2 bg-muted/30">
                      {detailThread.map((m) => {
                        const mine = m.sender_id === user?.id;
                        return (
                          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                              mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                            }`}>
                              <p className="whitespace-pre-wrap">{m.body}</p>
                              <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {new Date(m.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {!myBid && (
                    <>
                      <Button variant="ghost" onClick={() => { setDetailJob(null); openAskInfo(detailJob); }} className="gap-1">
                        <MessageSquare size={14} /> Ask for Info
                      </Button>
                      <Button variant="outline" onClick={() => { setDetailJob(null); openHelper(detailJob); }} className="gap-1">
                        <Sparkles size={14} /> Job Helper
                      </Button>
                      <Button onClick={() => { setDetailJob(null); setBidJob(detailJob); }} className="gap-1">
                        <Send size={14} /> Send Bid
                      </Button>
                    </>
                  )}
                  {myBid && myBid.status === "accepted" && detailJob.status !== "completed" && (
                    <Button
                      onClick={() => markJobComplete(detailJob)}
                      disabled={markingComplete}
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle size={14} /> {markingComplete ? "Marking..." : "Mark job complete"}
                    </Button>
                  )}
                  {myBid && detailJob.status === "completed" && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mr-auto">
                      <CheckCircle size={12} className="text-green-600" /> Marked complete — homeowner asked to review.
                    </div>
                  )}
                  {myBid && (
                    <Button variant="outline" onClick={() => setDetailJob(null)}>Close</Button>
                  )}
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

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
                <div className="flex items-center justify-between mb-1">
                  <Label>Message to Homeowner *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={suggestBidMessage}
                    disabled={suggestingMessage}
                    className="h-7 text-xs gap-1"
                  >
                    {suggestingMessage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-accent" />}
                    {bidForm.message.trim() ? "Regenerate" : "Suggest message"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Introduce yourself, describe your experience with this type of job, and explain your approach..."
                  value={bidForm.message}
                  onChange={(e) => setBidForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1 min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">Tip: fill in materials & labor first so the AI can reference your price.</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <DollarSign size={12} className="text-primary" /> Build your bid
                </p>
                <div>
                  <Label className="text-xs">Materials cost ($)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 120"
                    value={bidForm.materials_cost}
                    onChange={(e) => setBidForm((f) => ({ ...f, materials_cost: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Labor</Label>
                  <div className="mt-1 flex gap-2 mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={bidForm.labor_mode === "hourly" ? "default" : "outline"}
                      onClick={() => setBidForm((f) => ({ ...f, labor_mode: "hourly" }))}
                      className="h-8 text-xs flex-1"
                    >
                      Hourly
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={bidForm.labor_mode === "flat" ? "default" : "outline"}
                      onClick={() => setBidForm((f) => ({ ...f, labor_mode: "flat" }))}
                      className="h-8 text-xs flex-1"
                    >
                      Flat rate
                    </Button>
                  </div>
                  {bidForm.labor_mode === "hourly" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Rate ($/hr)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 75"
                          value={bidForm.labor_rate}
                          onChange={(e) => setBidForm((f) => ({ ...f, labor_rate: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Hours</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 3"
                          value={bidForm.estimated_hours}
                          onChange={(e) => setBidForm((f) => ({ ...f, estimated_hours: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      placeholder="Flat labor amount ($)"
                      value={bidForm.labor_flat}
                      onChange={(e) => setBidForm((f) => ({ ...f, labor_flat: e.target.value }))}
                      className="mt-1"
                    />
                  )}
                </div>

                {(() => {
                  const mats = parseFloat(bidForm.materials_cost) || 0;
                  const labor = bidForm.labor_mode === "hourly"
                    ? (parseFloat(bidForm.labor_rate) || 0) * (parseFloat(bidForm.estimated_hours) || 0)
                    : (parseFloat(bidForm.labor_flat) || 0);
                  const total = mats + labor;
                  return (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 text-sm flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Materials ${mats.toLocaleString()} + Labor ${labor.toLocaleString()}
                      </div>
                      <div className="font-semibold text-foreground">
                        Total ${total.toLocaleString()}
                      </div>
                    </div>
                  );
                })()}
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

      {/* Ask-for-info Dialog */}
      <Dialog open={!!askJob} onOpenChange={(o) => { if (!o) { setAskJob(null); setAskMessage(""); setAskAiQuestions([]); setAskAiRound(0); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ask Homeowner for More Info</DialogTitle>
          </DialogHeader>
          {askJob && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{askJob.title}</p>
                <p className="text-xs text-muted-foreground">{askJob.category} · {askJob.city}, {askJob.state}</p>
              </div>

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold flex items-center gap-1">
                    <Sparkles size={12} className="text-accent" />
                    AI follow-up suggestions
                    {askAiRound > 0 && <span className="text-muted-foreground font-normal">· round {askAiRound}</span>}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={fetchAskAiQuestions}
                    disabled={askAiLoading}
                    className="h-7 text-xs gap-1"
                  >
                    {askAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {askAiRound === 0 ? "Suggest questions" : "Regenerate"}
                  </Button>
                </div>
                {askAiQuestions.length > 0 ? (
                  <>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                      {askAiQuestions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                    <div className="flex items-center gap-2 pt-1">
                      <Button type="button" size="sm" variant="secondary" onClick={insertAiQuestionsIntoMessage} className="h-7 text-xs">
                        Use in message
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Not enough? Click <span className="font-medium">Regenerate</span> for more.
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {askAiRound === 0
                      ? "Get AI-suggested questions tailored to this job. Repeat until you have what you need."
                      : "AI didn't find further gaps — you likely have enough to bid."}
                  </p>
                )}
              </div>

              <div>
                <Label>Your Message *</Label>
                <Textarea
                  value={askMessage}
                  onChange={(e) => setAskMessage(e.target.value)}
                  className="mt-1 min-h-[160px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sent through in-app messaging. The homeowner can reply in Messages — no phone number is shared.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAskJob(null); setAskMessage(""); setAskAiQuestions([]); setAskAiRound(0); }}>Cancel</Button>
            <Button onClick={sendAskInfo} disabled={askSubmitting} className="gap-1">
              <MessageSquare size={14} /> {askSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Helper Dialog */}
      <Dialog open={!!helperJob} onOpenChange={(o) => { if (!o) { setHelperJob(null); setHelperError(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Job Helper
            </DialogTitle>
          </DialogHeader>
          {helperJob && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{helperJob.title}</p>
                <p className="text-xs text-muted-foreground">
                  {helperJob.category} · {helperJob.city}, {helperJob.state}
                </p>
              </div>

              {helperLoading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Analyzing the job...
                </div>
              )}

              {helperError && !helperLoading && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {helperError}
                </div>
              )}

              {!helperLoading && !helperError && helperCache[helperJob.id] && (() => {
                const est = helperCache[helperJob.id];
                return (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      AI breakdown based on the homeowner's description. Use as a starting point — verify on site.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign size={12} /> Likely cost
                        </div>
                        <div className="font-semibold text-foreground">
                          ${est.cost_low.toLocaleString()} – ${est.cost_high.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> Time on site
                        </div>
                        <div className="font-semibold text-foreground">
                          {est.time_hours_low}–{est.time_hours_high} hrs
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-1">Summary</h4>
                      <p className="text-sm text-muted-foreground">{est.summary}</p>
                    </div>

                    {est.materials?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                          <Wrench size={14} /> Likely materials
                        </h4>
                        <div className="space-y-1.5">
                          {est.materials.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-sm border-b border-border/50 pb-1">
                              <span>
                                {m.name}
                                {m.quantity && <span className="text-muted-foreground"> · {m.quantity}</span>}
                              </span>
                              <span className="text-foreground font-medium">${m.estimated_cost.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {est.tips?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Tips</h4>
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                          {est.tips.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-2">
                      Difficulty: {est.difficulty}/5 · {est.diy_recommended ? "DIY possible" : "Pro recommended"} — {est.diy_reasoning}
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const matsSum = (est.materials || []).reduce((s, m) => s + (m.estimated_cost || 0), 0);
                          const midHours = Math.round((est.time_hours_low + est.time_hours_high) / 2);
                          setBidForm((f) => ({
                            ...f,
                            materials_cost: f.materials_cost || (matsSum > 0 ? String(Math.round(matsSum)) : ""),
                            estimated_hours: f.estimated_hours || String(midHours),
                          }));
                          setHelperJob(null);
                          setBidJob(helperJob);
                        }}
                      >
                        Use in bid
                      </Button>
                      <Button onClick={() => setHelperJob(null)}>Close</Button>
                    </DialogFooter>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default JobBoard;
