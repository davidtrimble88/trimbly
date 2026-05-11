import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ExternalLink, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadProfileImage, deleteProfileImage } from "@/lib/profileImages";
import AvatarUpload from "./AvatarUpload";

interface Props {
  userId: string;
  providerId: string;
  businessName: string;
}

const MAX_GALLERY = 8;

const ProGalleryEditor = ({ userId, providerId, businessName }: Props) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: prov }] = await Promise.all([
        supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
        supabase.from("providers").select("bio, gallery_urls").eq("id", providerId).maybeSingle(),
      ]);
      if (prof) setLogoUrl(prof.avatar_url);
      if (prov) {
        setBio(prov.bio ?? "");
        setGallery(prov.gallery_urls ?? []);
      }
    })();
  }, [userId, providerId]);

  const handleLogo = async (url: string) => {
    setLogoUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = MAX_GALLERY - gallery.length;
    if (room <= 0) {
      toast({ title: `Max ${MAX_GALLERY} photos`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, room)) {
        if (file.size > 5 * 1024 * 1024) continue;
        const url = await uploadProfileImage(userId, file, "gallery");
        uploaded.push(url);
      }
      const next = [...gallery, ...uploaded];
      setGallery(next);
      await supabase.from("providers").update({ gallery_urls: next }).eq("id", providerId);
      toast({ title: `${uploaded.length} photo${uploaded.length !== 1 ? "s" : ""} added` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = async (url: string) => {
    const next = gallery.filter((u) => u !== url);
    setGallery(next);
    await supabase.from("providers").update({ gallery_urls: next }).eq("id", providerId);
    deleteProfileImage(url).catch(() => {});
  };

  const saveBio = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("providers")
      .update({ bio: bio.trim().slice(0, 1500) })
      .eq("id", providerId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Bio saved" });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Public Profile & Gallery</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link to={`/pro/${providerId}`} target="_blank">
            <ExternalLink size={14} className="mr-1.5" /> View
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <AvatarUpload userId={userId} currentUrl={logoUrl} fallback={businessName} onUploaded={handleLogo} size="lg" />

        <div>
          <Label htmlFor="pro-bio">About your business</Label>
          <Textarea
            id="pro-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your experience, specialties, and what makes your work stand out…"
            maxLength={1500}
            rows={5}
            className="mt-1.5"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">{bio.length}/1500</p>
            <Button onClick={saveBio} disabled={saving} size="sm">
              {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
              Save
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Portfolio gallery ({gallery.length}/{MAX_GALLERY})</Label>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || gallery.length >= MAX_GALLERY}
            >
              {uploading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Camera size={14} className="mr-1.5" />}
              Add photos
            </Button>
          </div>
          {gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
              No photos yet. Add up to {MAX_GALLERY} examples of your work.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gallery.map((url) => (
                <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={url} alt="Portfolio" className="object-cover w-full h-full" />
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
      </CardContent>
    </Card>
  );
};

export default ProGalleryEditor;
