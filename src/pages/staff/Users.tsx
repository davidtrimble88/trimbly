import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Ban, CheckCircle2, Crown, MessageSquare, StickyNote, Trash2, Archive } from "lucide-react";
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

interface ArchivedUser {
  id: string;
  user_id: string;
  full_name: string;
  user_type: string;
  email: string | null;
  reason: string;
  created_at: string;
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteAdminConfirm, setDeleteAdminConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archived, setArchived] = useState<ArchivedUser[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [tab, setTab] = useState<"users" | "staff">("users");
  const [addresses, setAddresses] = useState<Record<string, string[]>>({});



  useEffect(() => { load(); }, []);

  const PAGE_CAP = 2000;
  const load = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(PAGE_CAP);
    if (error) { toast.error(error.message); return; }
    if ((data || []).length >= PAGE_CAP) {
      toast.warning(`Showing the first ${PAGE_CAP.toLocaleString()} users — there may be more. This list needs real pagination.`);
    }
    setProfiles(data || []);
    const { data: emailRows, error: emailErr } = await supabase.rpc("admin_list_user_emails");
    if (emailErr) { toast.error(emailErr.message); return; }
    if (emailRows) {
      const map: Record<string, string> = {};
      (emailRows as { user_id: string; email: string | null }[]).forEach((r) => {
        if (r.email) map[r.user_id] = r.email;
      });
      setEmails(map);
    }
    const { data: roleRows, error: roleErr } = await supabase.from("user_roles").select("user_id,role");
    if (roleErr) { toast.error(roleErr.message); return; }
    if (roleRows) {
      const rmap: Record<string, string[]> = {};
      (roleRows as { user_id: string; role: string }[]).forEach((r) => {
        rmap[r.user_id] = [...(rmap[r.user_id] || []), r.role];
      });
      setRoles(rmap);
    }
    // Owner-only: home addresses so staff can search a user by their address.
    const { data: addrRows } = await supabase.rpc("admin_list_user_addresses" as any);
    if (addrRows) {
      const amap: Record<string, string[]> = {};
      (addrRows as { user_id: string; address: string | null }[]).forEach((r) => {
        if (r.address) amap[r.user_id] = [...(amap[r.user_id] || []), r.address];
      });
      setAddresses(amap);
    }
  };


  const STAFF_ROLES = ["admin", "moderator", "support", "analyst"];
  const isStaff = (p: Profile) =>
    (emails[p.id] || "").endsWith("@staff.trimbly.internal") ||
    (roles[p.id] || []).some((r) => STAFF_ROLES.includes(r));

  const hasAdminRole = (profileId: string) => (roles[profileId] || []).includes("admin");

  const loadNotes = async (profileId: string) => {
    const { data, error } = await supabase.from("staff_notes").select("*").eq("entity_type", "user").eq("entity_id", profileId).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setNotes(data || []);
  };

  useEffect(() => { if (selected) loadNotes(selected.id); }, [selected]);

  const filtered = profiles.filter((p) => {
    if (tab === "staff" ? !isStaff(p) : isStaff(p)) return false;
    if (filter === "homeowner" && p.user_type !== "homeowner") return false;
    if (filter === "provider" && p.user_type !== "provider") return false;
    if (filter === "suspended" && !p.suspended) return false;
    if (search) {
      const q = search.toLowerCase();
      const email = (emails[p.id] || "").toLowerCase();
      const addr = (addresses[p.id] || []).join(" | ").toLowerCase();
      if (
        !p.full_name.toLowerCase().includes(q) &&
        !p.id.includes(search) &&
        !email.includes(q) &&
        !addr.includes(q)
      ) return false;
    }

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

  const loadArchive = async () => {
    const { data, error } = await supabase
      .from("archived_users")
      .select("id,user_id,full_name,user_type,email,reason,created_at")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setArchived(data || []);
  };

  const openArchive = () => { setArchiveOpen(true); loadArchive(); };

  const deleteUser = async () => {
    if (!selected) return;
    if (deleteReason.trim().length < 10) {
      toast.error("Please enter a reason of at least 10 characters.");
      return;
    }
    const deletingAdmin = hasAdminRole(selected.id);
    if (deletingAdmin && deleteAdminConfirm.trim() !== "DELETE ADMIN") {
      toast.error("Type DELETE ADMIN to confirm deleting an admin account.");
      return;
    }
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: {
        userId: selected.id,
        reason: deleteReason.trim(),
        ...(deletingAdmin ? { confirmAdminDeletion: "DELETE ADMIN" } : {}),
      },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Delete failed");
      return;
    }
    toast.success("User deleted and archived");
    setDeleteReason("");
    setDeleteAdminConfirm("");
    setDeleteOpen(false);
    setSelected(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
        {(["users", "staff"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setFilter("all"); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "users" ? "Users" : "Staff"} ({profiles.filter((p) => (t === "staff" ? isStaff(p) : !isStaff(p))).length})
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, address, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(tab === "users" ? (["all", "homeowner", "provider", "suspended"] as const) : (["all", "suspended"] as const)).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={openArchive}>
            <Archive className="w-4 h-4" /> Archive
          </Button>
        </div>
      </div>


      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                {tab === "users" && <th className="text-left py-3 px-4 font-medium">Address</th>}
                <th className="text-left py-3 px-4 font-medium">{tab === "staff" ? "Role" : "Type"}</th>
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
                  <td className="py-3 px-4 text-muted-foreground text-xs">{emails[p.id] || "—"}</td>
                  {tab === "users" && (
                    <td className="py-3 px-4 text-muted-foreground text-xs max-w-[220px]">
                      {(addresses[p.id] || []).length ? (
                        <div className="space-y-0.5">
                          {(addresses[p.id] || []).map((a) => (
                            <div key={a} className="truncate" title={a}>{a}</div>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                  )}
                  <td className="py-3 px-4 text-muted-foreground capitalize">
                    {tab === "staff" ? ((roles[p.id] || []).join(", ") || "staff") : p.user_type}
                  </td>
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
                <tr><td colSpan={tab === "users" ? 8 : 7} className="py-8 text-center text-muted-foreground text-sm">No users match</td></tr>
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
                {emails[selected.id] && <p className="text-sm text-muted-foreground">{emails[selected.id]}</p>}
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
                    <Button variant="destructive" size="sm" onClick={() => { setDeleteReason(""); setDeleteAdminConfirm(""); setDeleteOpen(true); }}>
                      <Trash2 className="w-4 h-4" /> Delete
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

      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) { setDeleteOpen(o); if (!o) setDeleteAdminConfirm(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selected?.full_name || "user"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This permanently removes the account. A snapshot and your reason are saved to the archive first. A reason of at least 10 characters is required.
            </p>
            {selected && hasAdminRole(selected.id) && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">This account has admin access.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  To delete it, another admin must remain active. Type <strong>DELETE ADMIN</strong> below.
                </p>
                <Input
                  className="mt-2"
                  placeholder="DELETE ADMIN"
                  value={deleteAdminConfirm}
                  onChange={(e) => setDeleteAdminConfirm(e.target.value)}
                />
              </div>
            )}
            <Textarea
              placeholder="Why is this account being deleted? (required)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">{deleteReason.trim().length}/10 characters minimum</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={deleteUser}
              disabled={deleting || deleteReason.trim().length < 10 || Boolean(selected && hasAdminRole(selected.id) && deleteAdminConfirm.trim() !== "DELETE ADMIN")}
            >
              {deleting ? "Deleting..." : "Delete & Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deleted User Archive</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {archived.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{a.full_name || "(no name)"}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.email || a.user_id} · {a.user_type}</p>
                <p className="mt-2 whitespace-pre-wrap">{a.reason}</p>
              </div>
            ))}
            {archived.length === 0 && <p className="text-sm text-muted-foreground italic">No deleted users yet</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;

