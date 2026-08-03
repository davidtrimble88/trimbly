import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Trash2, ShieldCheck, AlertCircle, Check } from "lucide-react";
import { STAFF_ROLES, NAV_PERMISSIONS, type StaffRole } from "./roles";
import { navItems } from "./StaffLayout";
import { logActivity } from "./activityLog";

type StaffRow = {
  user_id: string;
  role: StaffRole;
  full_name: string;
  email: string | null;
};

export default function StaffTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Add form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("support");

  const load = async () => {
    setLoading(true);
    // Get all user_roles + matching profile name
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (roleErr) {
      toast({ title: "Error loading staff", description: roleErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const userIds = (roleRows || []).map((r: any) => r.user_id);
    if (userIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    const combined: StaffRow[] = (roleRows || []).map((r: any) => ({
      user_id: r.user_id,
      role: r.role as StaffRole,
      full_name: nameMap.get(r.user_id) || "(no name)",
      email: null,
    }));
    setRows(combined);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!user) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast({ title: "Email required", description: "Enter the staff member's email.", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const { data: found, error: lookupErr } = await (supabase.rpc("find_user_by_email" as any, { _email: trimmed }) as any);
      if (lookupErr) {
        toast({ title: "Lookup failed", description: lookupErr.message, variant: "destructive" });
        setAdding(false);
        return;
      }
      const match = Array.isArray(found) ? found[0] : found;
      if (!match?.user_id) {
        toast({
          title: "No account found",
          description: `No Trimbly account is registered with ${trimmed}. They need to sign up first.`,
          variant: "destructive",
        });
        setAdding(false);
        return;
      }

      const { error } = await supabase.from("user_roles").insert({
        user_id: match.user_id,
        role: role as any,
      });
      if (error) {
        toast({ title: "Could not add staff", description: error.message, variant: "destructive" });
        setAdding(false);
        return;
      }
      await logActivity(user.id, "staff_added", "user", match.user_id, { role, email: trimmed });
      toast({ title: "Staff member added", description: `${match.full_name || trimmed} — ${role}` });
      setEmail("");
      setRole("support");
      load();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (row: StaffRow) => {
    if (!user) return;
    if (row.user_id === user.id) {
      toast({ title: "Can't remove yourself", description: "Ask another admin to remove your access.", variant: "destructive" });
      return;
    }
    if (!confirm(`Remove ${row.full_name} (${row.role})?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", row.user_id)
      .eq("role", row.role);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await logActivity(user.id, "staff_removed", "user", row.user_id, { role: row.role });
    toast({ title: "Staff member removed" });
    load();
  };

  const handleRoleChange = async (row: StaffRow, newRole: StaffRole) => {
    if (row.role === newRole) return;
    // Delete old, insert new (since pkey is on id, unique on user_id+role)
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", row.user_id)
      .eq("role", row.role);
    if (delErr) {
      toast({ title: "Error", description: delErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({
      user_id: row.user_id,
      role: newRole as any,
    });
    if (insErr) {
      toast({ title: "Error", description: insErr.message, variant: "destructive" });
      return;
    }
    await logActivity(user!.id, "staff_role_changed", "user", row.user_id, { from: row.role, to: newRole });
    toast({ title: "Role updated", description: `${row.full_name} is now ${newRole}` });
    load();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Staff Team</h1>
        <p className="text-sm text-muted-foreground">
          Add staff members and set their access level. Only admins can manage the team.
        </p>
      </div>

      {/* Add staff */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-primary" /> Add staff member
          </CardTitle>
          <CardDescription>
            Enter the email they used to sign up for Trimbly, pick an access level, and they'll have staff access immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="e.g. jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Access level</Label>
              <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={adding} className="gap-1.5">
              <UserPlus className="w-4 h-4" /> {adding ? "Adding..." : "Add"}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>{STAFF_ROLES.find((r) => r.value === role)?.label}</strong> {" "}
              {STAFF_ROLES.find((r) => r.value === role)?.description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access level reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {STAFF_ROLES.map((r) => (
            <div key={r.value} className="flex items-start gap-3 text-sm">
              <Badge variant={r.value === "admin" ? "default" : "secondary"} className="capitalize shrink-0">
                {r.label}
              </Badge>
              <span className="text-muted-foreground">{r.description}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Permissions matrix — exactly what each role can see */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What each role can see</CardTitle>
          <CardDescription>The Owner/Admin role always has every section checked.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium">Section</th>
                {STAFF_ROLES.map((r) => (
                  <th key={r.value} className="text-center py-2.5 px-3 font-medium whitespace-nowrap">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {navItems.map((n) => (
                <tr key={n.key} className="border-t border-border">
                  <td className="py-2 px-4 inline-flex items-center gap-2">
                    <n.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {n.label}
                  </td>
                  {STAFF_ROLES.map((r) => (
                    <td key={r.value} className="text-center py-2 px-3">
                      {NAV_PERMISSIONS[n.key]?.includes(r.value) ? (
                        <Check className="w-4 h-4 text-primary inline" />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Current staff */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" /> Current staff ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff members yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={`${row.user_id}-${row.role}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{row.user_id}</p>
                  </div>
                  <Select
                    value={row.role}
                    onValueChange={(v) => handleRoleChange(row, v as StaffRole)}
                  >
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(row)}
                    disabled={row.user_id === user?.id}
                    title={row.user_id === user?.id ? "Can't remove yourself" : "Remove"}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
