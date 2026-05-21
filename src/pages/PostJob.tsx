import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Briefcase, MapPin, Clock, DollarSign, MessageSquare, Phone,
  PhoneOff, CheckCircle, XCircle, Trash2, Eye, ChevronDown, ChevronUp,
  User, Star, Shield, Sparkles, Lightbulb, Wand2,
} from "lucide-react";
import JobPhotoUploader from "@/components/JobPhotoUploader";
import JobVideoUploader from "@/components/JobVideoUploader";

const categories = [
  "Appliance Repair", "Carpentry", "Cleaning", "Drywall", "Electrical",
  "Fencing", "Flooring", "General Handyman", "HVAC", "Landscaping",
  "Painting", "Pest Control", "Plumbing", "Roofing", "Other",
].sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));

// Keyword → category mapping for instant suggestions as the user types a title
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Plumbing": ["faucet", "sink", "toilet", "leak", "pipe", "drain", "water heater", "shower", "tub", "garbage disposal", "sewer", "clog", "plumb"],
  "Electrical": ["outlet", "switch", "wiring", "breaker", "panel", "light", "lighting", "fixture", "ceiling fan", "electric", "ev charger", "gfci"],
  "HVAC": ["hvac", "ac ", "a/c", "air condition", "furnace", "heater", "heating", "thermostat", "duct", "mini split", "heat pump"],
  "Appliance Repair": ["dishwasher", "washer", "dryer", "fridge", "refrigerator", "oven", "stove", "microwave", "appliance"],
  "Roofing": ["roof", "shingle", "gutter", "downspout", "soffit", "fascia"],
  "Painting": ["paint", "stain", "primer", "wallpaper"],
  "Drywall": ["drywall", "sheetrock", "patch hole", "wall hole", "crack in wall"],
  "Flooring": ["floor", "tile", "hardwood", "laminate", "carpet", "vinyl plank", "grout"],
  "Carpentry": ["cabinet", "trim", "molding", "shelf", "shelving", "door install", "deck", "stairs", "framing", "carpentr"],
  "Landscaping": ["lawn", "mow", "tree", "shrub", "mulch", "sod", "landscape", "yard", "sprinkler", "irrigation", "garden", "leaves"],
  "Fencing": ["fence", "gate"],
  "Cleaning": ["clean", "pressure wash", "power wash", "junk removal", "haul"],
  "Pest Control": ["pest", "rodent", "mice", "rat", "ant", "termite", "roach", "bug", "wasp", "bee", "exterminat"],
  "General Handyman": ["mount tv", "tv mount", "assemble", "assembly", "install", "hang", "small repair", "handyman", "odd job"],
};

const suggestCategories = (text: string): string[] => {
  const t = text.toLowerCase().trim();
  if (t.length < 3) return [];
  const scores: Record<string, number> = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (t.includes(kw)) scores[cat] = (scores[cat] || 0) + kw.length;
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
};

type Job = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string;
  state: string;
  country: string;
  status: string;
  photo_urls?: string[] | null;
  created_at: string;
};

type Bid = {
  id: string;
  job_id: string;
  provider_id: string;
  message: string;
  bid_amount: number | null;
  estimated_hours: number | null;
  status: string;
  call_approved: boolean;
  phone_number: string | null;
  created_at: string;
  provider?: {
    user_id: string;
    business_name: string;
    category: string;
    city: string;
    state: string;
    years_experience: number | null;
    licensed: boolean;
    insured: boolean;
    phone: string | null;
  };
};

const PostJob = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bidCounts, setBidCounts] = useState<Record<string, number>>({});
  const [bidUnreadCounts, setBidUnreadCounts] = useState<Record<string, number>>({}); // provider_user_id -> unread count

  // Message-a-pro dialog (without accepting the bid)
  const [messageBid, setMessageBid] = useState<Bid | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Phone-number edit dialog (for granting / updating call permission)
  const [phoneBid, setPhoneBid] = useState<Bid | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", category: "", city: "", state: "", country: "US",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // AI description helper
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHelp, setAiHelp] = useState<{ missing_info: string[]; tips: string[]; improved_description: string } | null>(null);

  const requestAiHelp = async () => {
    if (!form.title && !form.description) {
      toast({ title: "Add a title or some details first", description: "Even a few words helps the AI tailor its suggestions.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiHelp(null);
    try {
      const { data, error } = await supabase.functions.invoke("job-description-helper", {
        body: {
          title: form.title,
          category: form.category,
          description: form.description,
          city: form.city,
          state: form.state,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiHelp(data);
    } catch (e: any) {
      toast({ title: "AI helper error", description: e.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!showForm) {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");
    }

    return () => {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");
    };
  }, [showForm]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  // Load user's jobs
  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    setLoadingJobs(true);
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("homeowner_id", user.id)
      .order("created_at", { ascending: false });
    const jobsList = (data as Job[]) || [];
    setJobs(jobsList);
    setLoadingJobs(false);

    // Load bid counts for each job
    if (jobsList.length > 0) {
      const { data: bidsData } = await supabase
        .from("job_bids")
        .select("job_id")
        .in("job_id", jobsList.map((j) => j.id));
      const counts: Record<string, number> = {};
      (bidsData || []).forEach((b: any) => {
        counts[b.job_id] = (counts[b.job_id] || 0) + 1;
      });
      setBidCounts(counts);
    }
  };

  // Load bids when a job is expanded
  const loadBids = async (jobId: string) => {
    const { data } = await supabase
      .from("job_bids")
      .select("*, provider:providers(user_id, business_name, category, city, state, years_experience, licensed, insured, phone)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    const bidsList = (data as unknown as Bid[]) || [];
    setBids((prev) => ({ ...prev, [jobId]: bidsList }));

    // Load unread message counts for each pro in these bids
    const providerUserIds = bidsList
      .map((b) => b.provider?.user_id)
      .filter(Boolean) as string[];
    if (providerUserIds.length > 0 && user) {
      const { data: unreadMsgs } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", user.id)
        .in("sender_id", providerUserIds)
        .eq("read", false);
      const counts: Record<string, number> = {};
      (unreadMsgs || []).forEach((m: any) => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
      setBidUnreadCounts((prev) => ({ ...prev, ...counts }));
    }
  };

  const toggleExpand = (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      loadBids(jobId);
    }
  };

  const handleSubmit = async () => {
    if (!user || !form.title || !form.category || !form.city || !form.state) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert({
      homeowner_id: user.id,
      title: form.title,
      description: form.description || null,
      category: form.category,
      city: form.city,
      state: form.state,
      country: form.country,
      status: "pending",
      photo_urls: photos,
      video_url: videoUrl,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job posted!", description: "Pros can now see and bid on your job." });
      setForm({ title: "", description: "", category: "", city: "", state: "", country: "US" });
      setPhotos([]);
      setVideoUrl(null);
      setShowForm(false);
      loadJobs();
    }
    setSubmitting(false);
  };

  const updateBidStatus = async (bidId: string, jobId: string, status: string) => {
    await supabase.from("job_bids").update({ status }).eq("id", bidId);
    loadBids(jobId);
    toast({ title: status === "accepted" ? "Bid accepted!" : "Bid rejected" });
  };

  const toggleCallApproval = async (bidId: string, jobId: string, current: boolean) => {
    await supabase.from("job_bids").update({ call_approved: !current }).eq("id", bidId);
    loadBids(jobId);
    toast({ title: !current ? "Call approved" : "Call permission revoked" });
  };

  const openPhoneEditor = (bid: Bid) => {
    setPhoneBid(bid);
    setPhoneInput(bid.phone_number ?? "");
  };

  const savePhoneAndApprove = async () => {
    if (!phoneBid) return;
    const trimmed = phoneInput.trim();
    if (trimmed.length < 7 || trimmed.length > 25) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setSavingPhone(true);
    const { error } = await supabase
      .from("job_bids")
      .update({ phone_number: trimmed, call_approved: true })
      .eq("id", phoneBid.id);
    setSavingPhone(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Phone number shared", description: "The pro can now call you." });
    loadBids(phoneBid.job_id);
    setPhoneBid(null);
    setPhoneInput("");
  };

  const sendMessageToPro = async () => {
    if (!user || !messageBid?.provider?.user_id || !messageBody.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: messageBid.provider.user_id,
      provider_id: messageBid.provider_id,
      subject: `Re: ${messageBid.message?.slice(0, 60) || "Your bid"}`,
      body: messageBody.trim(),
    });
    setSendingMessage(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Message sent", description: "The pro can now reply to you in Messages." });
    setMessageBid(null);
    setMessageBody("");
  };

  const deleteJob = async (jobId: string) => {
    await supabase.from("jobs").delete().eq("id", jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    toast({ title: "Job deleted" });
  };

  const statusColor = (s: string) => {
    if (s === "pending" || s === "open") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (s === "in_progress") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (s === "completed") return "bg-muted text-muted-foreground";
    return "bg-secondary text-secondary-foreground";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20"><Skeleton className="h-64 w-full" /></div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 pb-10 pt-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-primary" /> My Job Requests
            </h1>
            <p className="text-muted-foreground">Post jobs and manage bids from pros</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} /> Post a Job
          </Button>
        </div>

        {/* Job List */}
        {loadingJobs ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No jobs posted yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Post a job request and local pros will message you with bids.
              </p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus size={16} /> Post Your First Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <Badge className={`text-xs ${statusColor(job.status)}`}>{job.status.replace("_", " ")}</Badge>
                        {(bidCounts[job.id] ?? 0) > 0 && (
                          <Badge className="text-xs bg-primary/15 text-primary hover:bg-primary/20 gap-1">
                            <MessageSquare size={10} /> {bidCounts[job.id]} {bidCounts[job.id] === 1 ? "bid" : "bids"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1"><Briefcase size={12} /> {job.category}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {job.city}, {job.state}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      {job.description && <p className="text-sm text-muted-foreground mt-1">{job.description}</p>}
                      {job.photo_urls && job.photo_urls.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {job.photo_urls.slice(0, 4).map((u) => (
                            <a key={u} href={u} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded border border-border overflow-hidden">
                              <img src={u} alt="Job" className="w-full h-full object-cover" loading="lazy" />
                            </a>
                          ))}
                          {job.photo_urls.length > 4 && (
                            <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">+{job.photo_urls.length - 4}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleExpand(job.id)}>
                        {expandedJob === job.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Bids Section */}
                  {expandedJob === job.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MessageSquare size={14} /> Bids & Messages
                      </h4>
                      {!bids[job.id] ? (
                        <Skeleton className="h-16 w-full" />
                      ) : bids[job.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bids yet. Pros will message you when they're interested.</p>
                      ) : (
                        <div className="space-y-3">
                          {bids[job.id].map((bid) => (
                            <div key={bid.id} className="rounded-lg border border-border p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <User size={14} className="text-primary" />
                                    <span className="font-medium text-sm">{bid.provider?.business_name || "Unknown Pro"}</span>
                                    {bid.provider?.licensed && (
                                      <Badge variant="outline" className="text-xs gap-1"><Shield size={10} /> Licensed</Badge>
                                    )}
                                    {bid.provider?.insured && (
                                      <Badge variant="outline" className="text-xs">Insured</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {bid.provider?.city}, {bid.provider?.state}
                                    {bid.provider?.years_experience ? ` · ${bid.provider.years_experience}yr exp` : ""}
                                  </p>
                                </div>
                                <Badge className={`text-xs ${
                                  bid.status === "accepted" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                  bid.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                  "bg-secondary text-secondary-foreground"
                                }`}>{bid.status}</Badge>
                              </div>

                              {/* Pro's message */}
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm">{bid.message}</p>
                              </div>

                              {/* Bid details */}
                              <div className="flex flex-wrap gap-4 text-sm">
                                {bid.bid_amount && (
                                  <span className="flex items-center gap-1 text-foreground">
                                    <DollarSign size={14} className="text-primary" /> ${Number(bid.bid_amount).toLocaleString()}
                                  </span>
                                )}
                                {bid.estimated_hours && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock size={14} /> ~{bid.estimated_hours}hr
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                {bid.status === "pending" && (
                                  <>
                                    <Button size="sm" onClick={() => updateBidStatus(bid.id, job.id, "accepted")} className="gap-1">
                                      <CheckCircle size={14} /> Accept
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => updateBidStatus(bid.id, job.id, "rejected")} className="gap-1">
                                      <XCircle size={14} /> Reject
                                    </Button>
                                  </>
                                )}
                                {bid.provider?.user_id && bid.status !== "rejected" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => { setMessageBid(bid); setMessageBody(""); }}
                                      className="gap-1"
                                    >
                                      <MessageSquare size={14} /> Message
                                    </Button>
                                    {(bidUnreadCounts[bid.provider.user_id] ?? 0) > 0 && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => navigate(`/messages?partner=${bid.provider!.user_id}`)}
                                        className="gap-1"
                                      >
                                        <MessageSquare size={14} />
                                        {bidUnreadCounts[bid.provider.user_id]} new
                                      </Button>
                                    )}
                                  </>
                                )}
                                {bid.status === "accepted" && (
                                  <>
                                    {bid.call_approved ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openPhoneEditor(bid)}
                                          className="gap-1"
                                        >
                                          <Phone size={14} /> Edit Number
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => toggleCallApproval(bid.id, job.id, bid.call_approved)}
                                          className="gap-1"
                                        >
                                          <PhoneOff size={14} /> Revoke Call Access
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openPhoneEditor(bid)}
                                        className="gap-1"
                                      >
                                        <Phone size={14} /> Allow to Call Me
                                      </Button>
                                    )}
                                  </>
                                )}
                                {bid.call_approved && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                                    <Phone size={12} /> Your # shared: {bid.phone_number || "not set"}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Post Job Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Job Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Job Title *</Label>
              <Input placeholder="e.g. Kitchen faucet replacement" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {(() => {
                const suggestions = suggestCategories(`${form.title} ${form.description}`).filter(c => c !== form.category);
                if (suggestions.length === 0) return null;
                return (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles size={11} className="text-accent" /> Suggested:
                    </span>
                    {suggestions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: c }))}
                        className="text-xs px-2 py-0.5 rounded-full border border-accent/40 bg-accent/10 text-foreground hover:bg-accent/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Description</Label>
                <Button type="button" size="sm" variant="outline" onClick={requestAiHelp} disabled={aiLoading} className="h-7 gap-1 text-xs">
                  <Sparkles size={12} className="text-accent" />
                  {aiLoading ? "Thinking..." : "AI Help"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                The more details you share — what's broken, dimensions, materials, urgency, access, budget — the more accurate bids you'll get.
              </p>
              <Textarea
                placeholder="Describe the job in detail — what's broken, dimensions, materials, access, urgency..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-[100px]"
              />
              {aiHelp && (
                <div className="mt-2 rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3">
                  {aiHelp.missing_info?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold flex items-center gap-1 mb-1">
                        <Lightbulb size={12} className="text-accent" /> Add these details for better bids
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                        {aiHelp.missing_info.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiHelp.tips?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Tips</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                        {aiHelp.tips.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiHelp.improved_description && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Suggested rewrite</p>
                      <div className="text-xs whitespace-pre-wrap bg-background border border-border rounded p-2 mb-2">
                        {aiHelp.improved_description}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 text-xs"
                        onClick={() => {
                          setForm((f) => ({ ...f, description: aiHelp.improved_description }));
                          toast({ title: "Description updated" });
                        }}
                      >
                        <Wand2 size={12} /> Use this rewrite
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input placeholder={form.country === "CA" ? "Toronto" : "Austin"} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>State/Province *</Label>
                <Input placeholder={form.country === "CA" ? "ON" : "TX"} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Photos (optional)</Label>
              <div className="mt-1">
                <JobPhotoUploader value={photos} onChange={setPhotos} max={5} />
              </div>
            </div>
            <div>
              <Label>Video (optional)</Label>
              <div className="mt-1">
                <JobVideoUploader value={videoUrl} onChange={setVideoUrl} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setPhotos([]); setVideoUrl(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Posting..." : "Post Job"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Pro dialog (no acceptance required) */}
      <Dialog open={!!messageBid} onOpenChange={(o) => { if (!o) { setMessageBid(null); setMessageBody(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} /> Message {messageBid?.provider?.business_name || "Pro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Send a message without accepting the bid. The pro will be able to reply, but cannot call you unless you also accept and approve calling.
            </p>
            <Textarea
              placeholder="Hi, I'd like to ask a few questions about your bid..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="min-h-[120px]"
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMessageBid(null); setMessageBody(""); }}>Cancel</Button>
            <Button onClick={sendMessageToPro} disabled={sendingMessage || !messageBody.trim()} className="gap-1">
              <MessageSquare size={14} /> {sendingMessage ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone number editor for call permission */}
      <Dialog open={!!phoneBid} onOpenChange={(o) => { if (!o) { setPhoneBid(null); setPhoneInput(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {phoneBid?.call_approved ? "Edit phone number" : "Allow this pro to call you"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This number is shared only with this pro for this job. You can revoke or update it at any time.
            </p>
            <Label htmlFor="bid-phone">Phone number</Label>
            <Input
              id="bid-phone"
              type="tel"
              inputMode="tel"
              maxLength={25}
              placeholder="(555) 123-4567"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPhoneBid(null); setPhoneInput(""); }}>
              Cancel
            </Button>
            <Button onClick={savePhoneAndApprove} disabled={savingPhone}>
              {savingPhone ? "Saving..." : phoneBid?.call_approved ? "Save number" : "Share & allow call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PostJob;
