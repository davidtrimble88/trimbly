import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Camera, ExternalLink, Loader2, Save, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadProfileImage, MAX_PROFILE_IMAGE_BYTES } from "@/lib/profileImages";

interface Props {
  userId: string;
  displayName: string;
}

const ProfileEditor = ({ userId, displayName }: Props) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, bio, is_public")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setBio(data.bio ?? "");
        setIsPublic(data.is_public ?? false);
      }
      setLoading(false);
    })();
  }, [userId]);

  const save = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const handleSave = async () => {
    setSaving(true);
    await save({ bio: bio.trim().slice(0, 600), is_public: isPublic });
    setSaving(false);
    toast({ title: "Profile saved" });
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setAvatarBusy(true);
    try {
      const url = await uploadProfileImage(userId, file, "avatar");
      setAvatarUrl(url);
      await save({ avatar_url: url });
      await refreshProfile();
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Loader2 className="animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Public Profile</CardTitle>
        {isPublic && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/u/${userId}`} target="_blank">
              <ExternalLink size={14} className="mr-1.5" /> View
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile picture */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl ?? undefined} alt="Profile" />
            <AvatarFallback>{displayName?.[0]?.toUpperCase() ?? <UserCircle size={24} />}</AvatarFallback>
          </Avatar>
          <div>
            <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            <Button variant="outline" size="sm" onClick={() => avatarInput.current?.click()} disabled={avatarBusy}>
              {avatarBusy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Camera size={14} className="mr-1.5" />}
              {avatarUrl ? "Change profile picture" : "Upload profile picture"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">JPG or PNG, max 5 MB</p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others a bit about you and your home…"
            maxLength={600}
            rows={3}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">{bio.length}/600</p>
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium text-foreground">Make profile public</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gives pros a track record to check before they bid on your jobs — how many you've posted, how many got completed,
              and reviews you've left. Anyone with the link can see your name, photo, bio, home cities, and those stats.
              Your street address and email always stay private.
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={(v) => { setIsPublic(v); save({ is_public: v }); }} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
          Save bio
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileEditor;
