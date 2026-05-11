import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Camera, ExternalLink, ImagePlus, Loader2, Save, Trash2, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadProfileImage, deleteProfileImage } from "@/lib/profileImages";

interface Props {
  userId: string;
  displayName: string;
}

const MAX_GALLERY = 10;

const ProfileEditor = ({ userId, displayName }: Props) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, bio, is_public, gallery_urls")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setBio(data.bio ?? "");
        setIsPublic(data.is_public ?? false);
        setGallery(data.gallery_urls ?? []);
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
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setAvatarBusy(true);
    try {
      const url = await uploadProfileImage(userId, file, "avatar");
      setAvatarUrl(url);
      await save({ avatar_url: url });
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  };

  const handleGalleryAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = MAX_GALLERY - gallery.length;
    if (room <= 0) {
      toast({ title: `Max ${MAX_GALLERY} photos`, variant: "destructive" });
      return;
    }
    setGalleryBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, room)) {
        if (file.size > 5 * 1024 * 1024) continue;
        const url = await uploadProfileImage(userId, file, "gallery");
        uploaded.push(url);
      }
      const next = [...gallery, ...uploaded];
      setGallery(next);
      await save({ gallery_urls: next });
      toast({ title: `${uploaded.length} photo${uploaded.length !== 1 ? "s" : ""} added` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setGalleryBusy(false);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  };

  const removePhoto = async (url: string) => {
    const next = gallery.filter((u) => u !== url);
    setGallery(next);
    await save({ gallery_urls: next });
    deleteProfileImage(url).catch(() => {});
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

        {/* Gallery */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Photo gallery ({gallery.length}/{MAX_GALLERY})</Label>
            <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryAdd} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => galleryInput.current?.click()}
              disabled={galleryBusy || gallery.length >= MAX_GALLERY}
            >
              {galleryBusy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <ImagePlus size={14} className="mr-1.5" />}
              Add photos
            </Button>
          </div>
          {gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
              No photos yet. Add up to {MAX_GALLERY} pictures.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {gallery.map((url) => (
                <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={url} alt="Gallery" className="object-cover w-full h-full" />
                  <button
                    onClick={() => removePhoto(url)}
                    className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              Anyone with the link can see your name, photo, gallery, bio, home cities, and posting stats. Your address and email stay private.
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
