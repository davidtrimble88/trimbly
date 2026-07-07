import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, EyeOff, Eye, Star, ChevronDown, ChevronUp, FileText, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "./activityLog";

interface Provider {
  id: string;
  business_name: string;
  category: string;
  city: string;
  state: string;
  subscription_tier: string;
  verified: boolean;
  featured: boolean;
  hidden: boolean;
  licensed: boolean;
  insured: boolean;
  user_id: string;
  phone: string | null;
  website: string | null;
}

interface Verification {
  id: string;
  provider_id: string;
  background_check_status: string;
  background_check_completed_at: string | null;
  background_check_expires_at: string | null;
  license_verification_status: string;
  license_rejection_reason: string | null;
  insurance_verification_status: string;
  insurance_rejection_reason: string | null;
}

interface ProviderDoc {
  id: string;
  provider_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: string;
  rejection_reason: string | null;
}

function bgBadge(status: string) {
  const map: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground",
    pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/40",
    clear: "bg-green-500/15 text-green-700 border-green-500/40",
    consider: "bg-orange-500/15 text-orange-700 border-orange-500/40",
    failed: "bg-destructive/15 text-destructive border-destructive/40",
    expired: "bg-destructive/15 text-destructive border-destructive/40",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[status] || map.not_started}`}>{status.replace("_", " ")}</Badge>;
}

const Providers = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unverified" | "verified" | "featured" | "hidden">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [docs, setDocs] = useState<Record<string, ProviderDoc[]>>({});
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("providers").select("*").order("created_at", { ascending: false });
    setProviders((data as Provider[]) || []);
  };

  const toggleExpand = async (providerId: string) => {
    if (expandedId === providerId) { setExpandedId(null); return; }
    setExpandedId(providerId);
    if (!verifications[providerId]) {
      const { data: v } = await supabase.from("provider_verifications").select("*").eq("provider_id", providerId).maybeSingle();
      if (v) setVerifications((prev) => ({ ...prev, [providerId]: v as Verification }));
    }
    if (!docs[providerId]) {
      const { data: d } = await supabase.from("provider_documents").select("*").eq("provider_id", providerId).order("created_at", { ascending: false });
      setDocs((prev) => ({ ...prev, [providerId]: (d as ProviderDoc[]) || [] }));
    }
  };

  const previewDoc = async (doc: ProviderDoc) => {
    const { data, error } = await supabase.storage.from("provider-verification-docs").createSignedUrl(doc.file_url, 120);
    if (error || !data) { toast.error("Couldn't open that document"); return; }
    setDocUrls((prev) => ({ ...prev, [doc.id]: data.signedUrl }));
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const reviewDoc = async (doc: ProviderDoc, status: "approved" | "rejected") => {
    if (!user) return;
    let rejection_reason: string | null = null;
    if (status === "rejected") {
      rejection_reason = window.prompt("Reason for rejecting this document?") || "Not specified";
    }
    const { error } = await supabase.from("provider_documents").update({
      status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), rejection_reason,
    }).eq("id", doc.id);
    if (error) { toast.error(error.message); return; }

    // Roll the decision up to the corresponding verification field.
    const field = doc.document_type === "license" ? "license_verification_status" : doc.document_type === "insurance" ? "insurance_verification_status" : null;
    if (field) {
      const verifiedField = doc.document_type === "license" ? "license_verified_at" : "insurance_verified_at";
      const verifiedByField = doc.document_type === "license" ? "license_verified_by" : "insurance_verified_by";
      const reasonField = doc.document_type === "license" ? "license_rejection_reason" : "insurance_rejection_reason";
      await supabase.from("provider_verifications").update({
        [field]: status === "approved" ? "verified" : "rejected",
        [verifiedField]: status === "approved" ? new Date().toISOString() : null,
        [verifiedByField]: status === "approved" ? user.id : null,
        [reasonField]: status === "rejected" ? rejection_reason : null,
      }).eq("provider_id", doc.provider_id);
    }

    await logActivity(user.id, `provider_document_${status}`, "provider", doc.provider_id, { document_type: doc.document_type, file_name: doc.file_name });
    toast.success(status === "approved" ? "Document approved" : "Document rejected");

    const [{ data: v }, { data: d }] = await Promise.all([
      supabase.from("provider_verifications").select("*").eq("provider_id", doc.provider_id).maybeSingle(),
      supabase.from("provider_documents").select("*").eq("provider_id", doc.provider_id).order("created_at", { ascending: false }),
    ]);
    if (v) setVerifications((prev) => ({ ...prev, [doc.provider_id]: v as Verification }));
    setDocs((prev) => ({ ...prev, [doc.provider_id]: (d as ProviderDoc[]) || [] }));
  };

  const filtered = providers.filter((p) => {
    if (filter === "unverified" && p.verified) return false;
    if (filter === "verified" && !p.verified) return false;
    if (filter === "featured" && !p.featured) return false;
    if (filter === "hidden" && !p.hidden) return false;
    if (search && !p.business_name.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const update = async (p: Provider, field: "verified" | "featured" | "hidden", value: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("providers").update({ [field]: value }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, `provider_${field}_${value ? "on" : "off"}`, "provider", p.id, { business_name: p.business_name });
    toast.success("Updated");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by business or category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "unverified", "verified", "featured", "hidden"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <Card key={p.id} className={p.hidden ? "opacity-60" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{p.business_name}</h3>
                  <p className="text-xs text-muted-foreground">{p.category} · {p.city}, {p.state}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {p.subscription_tier === "pro" && <Badge className="text-[10px]">PRO</Badge>}
                  {p.verified && <Badge variant="outline" className="text-[10px] border-primary text-primary"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>}
                  {p.featured && <Badge variant="outline" className="text-[10px]"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground mb-3">
                {p.licensed && <span className="bg-muted px-1.5 py-0.5 rounded">Licensed</span>}
                {p.insured && <span className="bg-muted px-1.5 py-0.5 rounded">Insured</span>}
                {p.phone && <span className="bg-muted px-1.5 py-0.5 rounded">{p.phone}</span>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button size="sm" variant={p.verified ? "default" : "outline"} onClick={() => update(p, "verified", !p.verified)}>
                  <ShieldCheck className="w-3 h-3" /> {p.verified ? "Unverify" : "Verify"}
                </Button>
                <Button size="sm" variant={p.featured ? "default" : "outline"} onClick={() => update(p, "featured", !p.featured)}>
                  <Star className="w-3 h-3" /> {p.featured ? "Unfeature" : "Feature"}
                </Button>
                <Button size="sm" variant={p.hidden ? "destructive" : "outline"} onClick={() => update(p, "hidden", !p.hidden)}>
                  {p.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {p.hidden ? "Unhide" : "Hide"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleExpand(p.id)} className="ml-auto">
                  <FileText className="w-3 h-3" /> Review
                  {expandedId === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              {expandedId === p.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Background check</span>
                    {bgBadge(verifications[p.id]?.background_check_status || "not_started")}
                  </div>
                  {verifications[p.id]?.background_check_completed_at && (
                    <p className="text-[10px] text-muted-foreground -mt-2">
                      Completed {new Date(verifications[p.id].background_check_completed_at!).toLocaleDateString()}
                    </p>
                  )}

                  {(docs[p.id] || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No documents submitted yet.</p>
                  )}
                  {(docs[p.id] || []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-md px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground capitalize">{doc.document_type} &middot; <span className="font-normal text-muted-foreground truncate">{doc.file_name}</span></p>
                        {doc.status === "rejected" && doc.rejection_reason && (
                          <p className="text-destructive">{doc.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{doc.status}</Badge>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => previewDoc(doc)} title="View document">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        {doc.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => reviewDoc(doc, "approved")} title="Approve">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => reviewDoc(doc, "rejected")} title="Reject">
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No providers match</p>
        )}
      </div>
    </div>
  );
};

export default Providers;
