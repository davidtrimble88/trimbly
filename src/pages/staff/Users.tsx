import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Ban, CheckCircle2, Crown, MessageSquare, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

interface Profile {
  id: string;
  full_name: string;
  user_type: string;
  subscription_tier: string;
  suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
}

interface StaffNote {
  id: string;
  note: string;
  created_at: string;
  author_id: string;
}

const TIERS = ["free", "homeowner_pro", "multi_homeowner_pro", "pro"];

const Users = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "homeowner" | "provider" | "suspended">("all");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles(data || []);
  };

  const loadNotes = async (profileId: string) => {
    const { data } = await supabase.from("staff_notes").select("*").eq("entity_type", "user").eq("entity_id", profileId).order("created_at", { ascending: false });
    setNotes(data || []);
  };

  useEffect(() => { if (selected) loadNotes(selected.id); }, [selected]);

  const filtered = profiles.filter((p) => {
    if (filter === "homeowner" && p.user_type !== "homeowner") return false;
    if (filter === "provider" && p.user_type !== "provider") return false;
    if (filter === "suspended" && !p.suspended) return false;
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) && !p.id.includes(search)) return false;
    return true;
  });

  const updateTier = async (tier: string) => {
    if (!selected || !user) return;
    const { error } = await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, "tier_changed", "user", selected.id, { from: selected.subscription_tier, to: tier });
    toast.success("Tier updated");
    setSelected({ ...selected, subscription_tier: tier });
    load();
  };

  const toggleSuspend = async () => {
    if (!selected || !user) return;
    const newSuspended = !selected.suspended;
    const reason = newSuspended ? (suspendReason.trim() || "No reason provided") : null;
    const { error } = await supabase.from("profiles").update({ suspended: newSuspended, suspended_reason: reason }).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, newSuspended ? "user_suspended" : "user_unsuspended", "user", selected.id, { reason });
    toast.success(newSuspended ? "User suspended" : "User reinstated");
    setSelected({ ...selected, suspended: newSuspended, suspended_reason: reason });
    setSuspendReason("");
    load();
  };

  const addNote = async () => {
    if (!selected || !user || !newNote.trim()) return;
    const { error } = await supabase.from("staff_notes").insert({
      author_id: user.id, entity_type: "user", entity_id: selected.id, note: newNote.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNewNote("");
    loadNotes(selected.id);
  };

  const messageUser = async () => {
    if (!selected || !user) return;
    const subject = prompt("Subject:");
    if (!subject) return;
    const body = prompt("Message:");
    if (!body) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: selected.id, subject, body,
    });
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, "message_sent", "user", selected.id, { subject });
    toast.success("Message sent to user inbox");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "homeowner", "provider", "suspended"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium">Tier</th>
                <th className="text-left py-3 px-4 font-medium">Joined</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                  <td className="py-3 px-4 font-medium">{p.full_name || "(no name)"}</td>
                  <td className="py-3 px-4 text-muted-foreground capitalize">{p.user_type}</td>
                  <td className="py-3 px-4">
                    {p.subscription_tier !== "free" ? (
                      <Badge variant="default" className="text-xs"><Crown className="w-3 h-3 mr-1" />{p.subscription_tier}</Badge>
                    ) : <Badge variant="secondary" className="text-xs">free</Badge>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                  <td className="py-3 px-4">
                    {p.suspended ? <Badge variant="destructive" className="text-xs">Suspended</Badge> : <Badge variant="outline" className="text-xs">Active</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(p)}>Manage</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No users match</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.full_name || "(no name)"}</DialogTitle>
                <p className="text-xs text-muted-foreground font-mono">{selected.id}</p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{selected.user_type}</span></div>
                  <div><span className="text-muted-foreground">Joined:</span> {format(new Date(selected.created_at), "PP")}</div>
                </div>

                {selected.suspended && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
                    <p className="font-medium text-destructive">Suspended</p>
                    <p className="text-muted-foreground text-xs mt-1">{selected.suspended_reason}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Subscription</p>
                  <Select value={selected.subscription_tier} onValueChange={updateTier}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Account Action</p>
                  {!selected.suspended && (
                    <Input placeholder="Reason for suspension (optional)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
                  )}
                  <div className="flex gap-2">
                    <Button variant={selected.suspended ? "default" : "destructive"} size="sm" onClick={toggleSuspend}>
                      {selected.suspended ? <><CheckCircle2 className="w-4 h-4" /> Reinstate</> : <><Ban className="w-4 h-4" /> Suspend</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={messageUser}>
                      <MessageSquare className="w-4 h-4" /> Message
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <StickyNote className="w-3 h-3" /> Internal Notes
                  </p>
                  <Textarea placeholder="Add a private staff note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} />
                  <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>Add Note</Button>
                  <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
                    {notes.map((n) => (
                      <div key={n.id} className="bg-muted/40 rounded p-2 text-sm">
                        <p className="whitespace-pre-wrap">{n.note}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "PPp")}</p>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-xs text-muted-foreground italic">No notes yet</p>}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
