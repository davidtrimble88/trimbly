import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, MapPin, Phone, Globe, DollarSign, Shield, Star,
  Briefcase, MessageSquare, Clock, CheckCircle,
  Eye, Zap, Crown, Pencil, Award, PhoneOff, MapPinned,
} from "lucide-react";

type ProviderProfile = {
  id: string;
  business_name: string;
  category: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  hourly_rate_min: number;
  hourly_rate_max: number;
  years_experience: number | null;
  licensed: boolean;
  license_number: string | null;
  insured: boolean;
  insurance_details: string | null;
  available: boolean;
  subscription_tier: string;
};

type BidWithJob = {
  id: string;
  job_id: string;
  message: string;
  bid_amount: number | null;
  estimated_hours: number | null;
  status: string;
  call_approved: boolean;
  created_at: string;
  job?: {
    title: string;
    category: string;
    city: string;
    state: string;
    status: string;
    description: string | null;
  };
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
};

type MessageRow = {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  read: boolean;
  created_at: string;
};

type ProviderStats = {
  avg_rating: number | null;
  review_count: number | null;
};

const ProDashboard = () => {
  const { user, loading: authLoading, profileName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProviderProfile>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("bids");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locCity, setLocCity] = useState("");
  const [locState, setLocState] = useState("");
  const [locPostal, setLocPostal] = useState("");
  const [locCountry, setLocCountry] = useState("US");
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    // Get provider profile
    const { data: provData } = await supabase
      .from("providers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!provData) {
      setLoading(false);
      return;
    }

    setProvider(provData as ProviderProfile);

    // Load stats, bids, reviews, messages in parallel
    const [statsRes, bidsRes, reviewsRes, msgsRes] = await Promise.all([
      supabase.from("provider_stats").select("*").eq("provider_id", provData.id).maybeSingle(),
      supabase.from("job_bids")
        .select("*, job:jobs(title, category, city, state, status, description)")
        .eq("provider_id", provData.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("reviews")
        .select("*")
        .eq("provider_id", provData.id)
        .order("created_at", { ascending: false }),
      supabase.from("messages")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setStats(statsRes.data as ProviderStats | null);
    setBids((bidsRes.data as unknown as BidWithJob[]) || []);
    setReviews((reviewsRes.data as ReviewRow[]) || []);
    setMessages((msgsRes.data as MessageRow[]) || []);
    setLoading(false);
  };

  const toggleAvailability = async () => {
    if (!provider) return;
    const newVal = !provider.available;
    await supabase.from("providers").update({ available: newVal }).eq("id", provider.id);
    setProvider({ ...provider, available: newVal });
    toast({ title: newVal ? "You're now available" : "You're now unavailable" });
  };

  const openEdit = () => {
    if (!provider) return;
    setEditForm({ ...provider });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!provider || !editForm) return;
    setSaving(true);
    const { error } = await supabase.from("providers").update({
      business_name: editForm.business_name,
      category: editForm.category,
      city: editForm.city,
      state: editForm.state,
      phone: editForm.phone || null,
      website: editForm.website || null,
      description: editForm.description || null,
      hourly_rate_min: editForm.hourly_rate_min,
      hourly_rate_max: editForm.hourly_rate_max,
      years_experience: editForm.years_experience,
      licensed: editForm.licensed,
      license_number: editForm.licensed ? editForm.license_number : null,
      insured: editForm.insured,
      insurance_details: editForm.insured ? editForm.insurance_details : null,
    }).eq("id", provider.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProvider({ ...provider, ...editForm } as ProviderProfile);
      setEditOpen(false);
      toast({ title: "Profile updated" });
    }
  };

  const openLocation = () => {
    if (!provider) return;
    setLocCity(provider.city || "");
    setLocState(provider.state || "");
    setLocPostal(provider.postal_code || "");
    setLocCountry(provider.country || "US");
    setLocationOpen(true);
  };

  const saveLocation = async () => {
    if (!provider) return;
    const hasCityState = locCity.trim() && locState.trim();
    const hasPostal = locPostal.trim();
    if (!hasCityState && !hasPostal) {
      toast({ title: "Enter city + state or a ZIP/postal code", variant: "destructive" });
      return;
    }
    setSavingLoc(true);
    const updates = {
      city: locCity.trim(),
      state: locState.trim(),
      postal_code: locPostal.trim(),
      country: locCountry,
    };
    const { error } = await supabase.from("providers").update(updates).eq("id", provider.id);
    setSavingLoc(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProvider({ ...provider, ...updates });
      setLocationOpen(false);
      toast({ title: "Location updated" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-5xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">No Provider Profile</h1>
          <p className="text-muted-foreground mb-6">Create your business profile to start receiving jobs and bids.</p>
          <Button size="lg" onClick={() => navigate("/pro-register")}>Register as a Pro</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = profileName || provider.business_name;
  const avgRating = stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : "—";
  const reviewCount = stats?.review_count || 0;
  const totalBids = bids.length;
  const acceptedBids = bids.filter(b => b.status === "accepted").length;
  const pendingBids = bids.filter(b => b.status === "pending").length;
  const unreadMessages = messages.filter(m => !m.read).length;

  const bidStatusColor = (s: string) => {
    if (s === "accepted") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (s === "rejected") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                {displayName}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className="text-sm">
                  {provider.category}
                </Badge>
                <button
                  onClick={openLocation}
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  title="Change location"
                >
                  <MapPin size={13} /> {provider.city}, {provider.state}
                </button>
                {provider.subscription_tier === "pro" && (
                  <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                    <Zap size={10} /> Verified Pro
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Available</span>
                <Switch checked={provider.available} onCheckedChange={toggleAvailability} />
              </div>
              <Button variant="outline" onClick={openLocation} className="gap-1.5">
                <MapPinned size={14} /> Change Location
              </Button>
              <Button variant="outline" onClick={openEdit} className="gap-1.5">
                <Pencil size={14} /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card onClick={() => setActiveTab("reviews")} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 text-center">
                <Star className="mx-auto h-6 w-6 text-yellow-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">{avgRating}</p>
                <p className="text-xs text-muted-foreground">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card onClick={() => setActiveTab("bids")} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 text-center">
                <Briefcase className="mx-auto h-6 w-6 text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalBids}</p>
                <p className="text-xs text-muted-foreground">Total bids</p>
              </CardContent>
            </Card>
            <Card onClick={() => setActiveTab("bids")} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">{acceptedBids}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </CardContent>
            </Card>
            <Card onClick={() => navigate("/messages")} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 text-center">
                <MessageSquare className="mx-auto h-6 w-6 text-blue-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">{unreadMessages}</p>
                <p className="text-xs text-muted-foreground">Unread messages</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="bids" className="gap-1.5">
                <Briefcase size={14} /> Bids {pendingBids > 0 && <Badge variant="secondary" className="text-xs ml-1">{pendingBids}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <Star size={14} /> Reviews
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5">
                <MessageSquare size={14} /> Messages {unreadMessages > 0 && <Badge variant="secondary" className="text-xs ml-1">{unreadMessages}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5">
                <Building2 size={14} /> Profile
              </TabsTrigger>
            </TabsList>

            {/* Bids Tab */}
            <TabsContent value="bids">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">My Bids</h2>
                <Button size="sm" onClick={() => navigate("/job-board")} className="gap-1.5">
                  <Eye size={14} /> Browse Jobs
                </Button>
              </div>
              {bids.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No bids yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Browse the job board to find work and send bids to homeowners.</p>
                    <Button onClick={() => navigate("/job-board")}>Browse Job Board</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {bids.map((bid) => (
                    <Card key={bid.id} className="hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{bid.job?.title || "Job"}</h3>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1 mb-2">
                              <span className="flex items-center gap-1"><Briefcase size={12} /> {bid.job?.category}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {bid.job?.city}, {bid.job?.state}</span>
                              <span className="flex items-center gap-1"><Clock size={12} /> {new Date(bid.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5 mb-2">
                              <p className="text-sm text-muted-foreground">{bid.message}</p>
                            </div>
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
                          </div>
                          <div className="ml-4 text-center shrink-0">
                            <Badge className={`text-xs ${bidStatusColor(bid.status)}`}>
                              {bid.status === "accepted" ? "Accepted" : bid.status === "rejected" ? "Rejected" : "Pending"}
                            </Badge>
                            {bid.call_approved && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                                <Phone size={12} /> Call OK
                              </div>
                            )}
                            {bid.status === "accepted" && !bid.call_approved && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <PhoneOff size={12} /> Msg only
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <h2 className="text-lg font-bold text-foreground mb-4">Reviews ({reviewCount})</h2>
              {reviews.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Star className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No reviews yet</h3>
                    <p className="text-sm text-muted-foreground">Complete jobs to start receiving reviews from homeowners.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Messages</h2>
                <Button size="sm" variant="outline" onClick={() => navigate("/messages")} className="gap-1.5">
                  <MessageSquare size={14} /> Open Inbox
                </Button>
              </div>
              {messages.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No messages yet</h3>
                    <p className="text-sm text-muted-foreground">Homeowners will message you when they're interested in your services.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {messages.slice(0, 10).map((msg) => (
                    <Card
                      key={msg.id}
                      className={`cursor-pointer hover:border-primary/20 transition-colors ${!msg.read ? "border-primary/30 bg-primary/5" : ""}`}
                      onClick={() => navigate("/messages")}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm ${!msg.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                {msg.subject || "No subject"}
                              </h3>
                              {!msg.read && <Badge className="text-xs bg-primary text-primary-foreground">New</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{msg.body}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 ml-4">
                            {new Date(msg.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {messages.length > 10 && (
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/messages")}>
                      View all messages →
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <h2 className="text-lg font-bold text-foreground mb-4">Business Profile</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Business info */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Business</h3>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Business Name:</span> <span className="font-medium text-foreground ml-1">{provider.business_name}</span></div>
                      <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground ml-1">{provider.category}</span></div>
                      <div className="flex items-center gap-1"><MapPin size={13} className="text-muted-foreground" /> <span className="text-foreground">{provider.city}, {provider.state}</span></div>
                      {provider.phone && <div className="flex items-center gap-1"><Phone size={13} className="text-muted-foreground" /> <span className="text-foreground">{provider.phone}</span></div>}
                      {provider.website && <div className="flex items-center gap-1"><Globe size={13} className="text-muted-foreground" /> <a href={provider.website} target="_blank" className="text-primary hover:underline">{provider.website}</a></div>}
                    </div>
                    {provider.description && (
                      <p className="text-sm text-muted-foreground mt-3 bg-muted/50 rounded-lg p-3">{provider.description}</p>
                    )}
                  </div>

                  {/* Rates */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rates & Experience</h3>
                    <div className="grid sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-1"><DollarSign size={13} className="text-primary" /> ${provider.hourly_rate_min}–${provider.hourly_rate_max}/hr</div>
                      {provider.years_experience && <div className="flex items-center gap-1"><Award size={13} className="text-primary" /> {provider.years_experience} years experience</div>}
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${provider.available ? "bg-green-500" : "bg-muted-foreground"}`} />
                        {provider.available ? "Available" : "Unavailable"}
                      </div>
                    </div>
                  </div>

                  {/* Credentials */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credentials</h3>
                    <div className="flex flex-wrap gap-3">
                      {provider.licensed ? (
                        <Badge variant="outline" className="gap-1"><Shield size={12} /> Licensed {provider.license_number && `· ${provider.license_number}`}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Not Licensed</Badge>
                      )}
                      {provider.insured ? (
                        <Badge variant="outline" className="gap-1"><Shield size={12} /> Insured</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Not Insured</Badge>
                      )}
                    </div>
                  </div>

                  <Button onClick={openEdit} variant="outline" className="gap-1.5">
                    <Pencil size={14} /> Edit Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Pro upgrade banner for free providers */}
              {provider.subscription_tier === "free" && (
                <Card className="mt-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown size={20} className="text-primary" />
                          <h3 className="text-lg font-bold text-foreground">Upgrade to Pro</h3>
                          <Badge className="bg-primary text-primary-foreground text-xs">$29/mo</Badge>
                        </div>
                        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-foreground">
                          {["Direct messaging with homeowners", "Priority search placement", "Verified Pro badge", "Job management tools"].map(f => (
                            <li key={f} className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-primary shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button size="lg" onClick={() => navigate("/pro-pricing")} className="shrink-0 gap-1.5">
                        <Crown size={16} /> Upgrade
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="mt-10">
            <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/job-board")}>
                <CardContent className="p-5 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground">Browse Jobs</h3>
                  <p className="text-xs text-muted-foreground mt-1">Find and bid on homeowner job requests</p>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/messages")}>
                <CardContent className="p-5 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground">Messages</h3>
                  <p className="text-xs text-muted-foreground mt-1">Chat with homeowners about projects</p>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/search")}>
                <CardContent className="p-5 text-center">
                  <Eye className="mx-auto h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground">My Listing</h3>
                  <p className="text-xs text-muted-foreground mt-1">See how your profile appears to homeowners</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Change Location Dialog */}
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPinned size={18} /> Change Service Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set where homeowners find you. Use city + state, a ZIP/postal code, or both.
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Country</Label>
              <select
                value={locCountry}
                onChange={e => setLocCountry(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={locCity} onChange={e => setLocCity(e.target.value)} className="mt-1" placeholder={locCountry === "CA" ? "e.g. Toronto" : "e.g. Austin"} />
              </div>
              <div>
                <Label>{locCountry === "CA" ? "Province" : "State"}</Label>
                <Input value={locState} onChange={e => setLocState(e.target.value)} className="mt-1" placeholder={locCountry === "CA" ? "e.g. ON" : "e.g. TX"} />
              </div>
            </div>
            <div>
              <Label>{locCountry === "CA" ? "Postal Code" : "ZIP Code"} <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={locPostal}
                onChange={e => setLocPostal(e.target.value)}
                className="mt-1"
                placeholder={locCountry === "CA" ? "e.g. M5V 2T6" : "e.g. 78701"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationOpen(false)}>Cancel</Button>
            <Button onClick={saveLocation} disabled={savingLoc}>{savingLoc ? "Saving…" : "Save Location"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input value={editForm.business_name || ""} onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={editForm.city || ""} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={editForm.state || ""} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={editForm.website || ""} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editForm.description || ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Min Rate ($/hr)</Label>
                <Input type="number" value={editForm.hourly_rate_min || 0} onChange={e => setEditForm(f => ({ ...f, hourly_rate_min: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Max Rate ($/hr)</Label>
                <Input type="number" value={editForm.hourly_rate_max || 0} onChange={e => setEditForm(f => ({ ...f, hourly_rate_max: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Years Exp.</Label>
                <Input type="number" value={editForm.years_experience || 0} onChange={e => setEditForm(f => ({ ...f, years_experience: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.licensed || false} onChange={e => setEditForm(f => ({ ...f, licensed: e.target.checked }))} className="rounded" /> Licensed
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.insured || false} onChange={e => setEditForm(f => ({ ...f, insured: e.target.checked }))} className="rounded" /> Insured
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ProDashboard;
