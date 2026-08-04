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
import { UserPlus, Trash2, ShieldCheck, AlertCircle, Check, Dices, Copy, Eye, EyeOff } from "lucide-react";
import { STAFF_ROLES, NAV_PERMISSIONS, type StaffRole } from "./roles";
import { navItems } from "./StaffLayout";
import { logActivity } from "./activityLog";
import { validateStaffPassword, PASSWORD_MIN, PASSWORD_MAX } from "@/lib/staffPasswordPolicy";

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
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<StaffRole>("support");
  const [justCreated, setJustCreated] = useState<{ username: string; password: string; role: StaffRole } | null>(null);

  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%^&*?";
    const all = upper + lower + digits + special;
    const length = 12;
    let pw = "";
    // Regenerate until it clears the shared policy (guarantees one of each
    // required class and dodges the repeat/sequence checks) rather than
    // duplicating those rules here.
    do {
      const required = [
        upper[Math.floor(Math.random() * upper.length)],
        lower[Math.floor(Math.random() * lower.length)],
        digits[Math.floor(Math.random() * digits.length)],
        special[Math.floor(Math.random() * special.length)],
      ];
      const rest = Array.from({ length: length - required.length }, () => all[Math.floor(Math.random() * all.length)]);
      const chars = [...required, ...rest];
      for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      pw = chars.join("");
    } while (validateStaffPassword(pw, username));
    setPassword(pw);
    setShowPassword(true);
  };

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
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      toast({ title: "Username required", description: "Pick a login username for this employee.", variant: "destructive" });
      return;
    }
    const pwError = validateStaffPassword(password, trimmedUsername);
    if (pwError) {
      toast({ title: "Password doesn't meet requirements", description: pwError, variant: "destructive" });
      return;
    }
    setAdding(true);
    setJustCreated(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-staff-account", {
        body: { username: trimmedUsername, password, role, fullName: fullName.trim() },
      });
      if (error || data?.error) {
        toast({ title: "Could not add staff", description: data?.error || error?.message, variant: "destructive" });
        setAdding(false);
        return;
      }
      await logActivity(user.id, "staff_added", "user", trimmedUsername, { role, username: trimmedUsername });
      toast({ title: "Staff member added", description: `${fullName.trim() || trimmedUsername} can now log in — ${role}` });
      setJustCreated({ username: trimmedUsername, password, role });
      setUsername("");
      setFullName("");
      setPassword("");
      setShowPassword(false);
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
            Give them a login username and password (not an email) and pick their access level — same as the owner's own login.
            They can sign in right on the normal login page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Username</Label>
              <Input
                placeholder="e.g. jsmith"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Full name (optional)</Label>
              <Input
                placeholder="e.g. Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={`${PASSWORD_MIN}-${PASSWORD_MAX} characters`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                  className="text-sm pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Generate a random password"
                >
                  <Dices className="w-4 h-4" />
                </button>
              </div>
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
          <p className="text-xs text-muted-foreground -mt-2">
            {PASSWORD_MIN}-{PASSWORD_MAX} characters, with at least one capital letter, one number, and one special character.
            No repeated or sequential characters (e.g. "aaa", "1234"). Hit the dice icon to generate one that qualifies.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>{STAFF_ROLES.find((r) => r.value === role)?.label}</strong> {" "}
              {STAFF_ROLES.find((r) => r.value === role)?.description}
            </div>
          </div>

          {justCreated && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-2">
              <p className="font-medium text-foreground">Share these with {justCreated.username} — shown once, not saved anywhere:</p>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="bg-background border border-border rounded px-2 py-1">Username: {justCreated.username}</span>
                <span className="bg-background border border-border rounded px-2 py-1">Password: {justCreated.password}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`Username: ${justCreated.username}\nPassword: ${justCreated.password}`);
                    toast({ title: "Copied" });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
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
