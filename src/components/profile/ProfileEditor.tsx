import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "./AvatarUpload";

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
  const { toast } = useToast();

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

  const handleAvatar = async (url: string) => {
    setAvatarUrl(url);
    await save({ avatar_url: url });
  };

  const handleToggle = async (v: boolean) => {
    setIsPublic(v);
    await save({ is_public: v });
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
      <CardContent className="space-y-5">
        <AvatarUpload userId={userId} currentUrl={avatarUrl} fallback={displayName} onUploaded={handleAvatar} />

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

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium text-foreground">Make profile public</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Anyone with the link can see your name, photo, bio, home cities, and posting stats. Your address and email stay private.
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={handleToggle} />
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
