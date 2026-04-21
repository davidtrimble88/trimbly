import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Globe, Phone, Ban } from "lucide-react";
import { format } from "date-fns";

interface PendingMsg {
  id: string;
  sender_id: string;
  provider_name: string;
  provider_category: string;
  provider_city: string;
  provider_state: string;
  provider_phone: string | null;
  provider_website: string | null;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

interface OptOut {
  email: string;
  business_name: string | null;
  opted_out_at: string;
}

const Outreach = () => {
  const [pending, setPending] = useState<PendingMsg[]>([]);
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [tab, setTab] = useState<"pending" | "optouts">("pending");

  useEffect(() => {
    supabase.from("pending_messages").select("*").order("created_at", { ascending: false }).then(({ data }) => setPending((data as PendingMsg[]) || []));
    supabase.from("email_optouts").select("*").order("opted_out_at", { ascending: false }).then(({ data }) => setOptOuts((data as OptOut[]) || []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab("pending")} className={`px-4 py-2 text-sm rounded-md ${tab === "pending" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Pending Outreach ({pending.length})
        </button>
        <button onClick={() => setTab("optouts")} className={`px-4 py-2 text-sm rounded-md ${tab === "optouts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Opt-Outs ({optOuts.length})
        </button>
      </div>

      {tab === "pending" ? (
        <div className="space-y-3">
          {pending.map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{m.provider_name}</h3>
                    <p className="text-xs text-muted-foreground">{m.provider_category} · {m.provider_city}, {m.provider_state}</p>
                  </div>
                  <Badge variant={m.status === "pending" ? "default" : "secondary"} className="text-xs">
                    <Send className="w-3 h-3 mr-1" />{m.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  {m.provider_website && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{m.provider_website}</span>}
                  {m.provider_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{m.provider_phone}</span>}
                  <span>{format(new Date(m.created_at), "MMM d, yyyy p")}</span>
                </div>
                <p className="text-sm font-medium mb-1">{m.subject}</p>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded p-3 whitespace-pre-wrap">{m.body}</p>
              </CardContent>
            </Card>
          ))}
          {pending.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pending outreach</p>}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Business</th>
                  <th className="text-left py-3 px-4 font-medium">Opted Out</th>
                </tr>
              </thead>
              <tbody>
                {optOuts.map((o) => (
                  <tr key={o.email} className="border-t border-border">
                    <td className="py-3 px-4 inline-flex items-center gap-2"><Ban className="w-3 h-3 text-destructive" />{o.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{o.business_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(o.opted_out_at), "PPp")}</td>
                  </tr>
                ))}
                {optOuts.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">No opt-outs</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Outreach;
