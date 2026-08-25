import { useRef, useState } from "react";
import { Camera, Check, Image, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadProfileImage, MAX_PROFILE_IMAGE_BYTES } from "@/lib/profileImages";
import AnimatedHomePlaceholder from "@/components/dashboard/homeowner/AnimatedHomePlaceholder";

export type HomePhotoChoiceValue = "found" | "custom" | "placeholder";

interface HomePhotoChoiceProps {
  userId: string;
  /** The photo Zillow's listing scrape found, if any — kept separate from
   * the active selection so switching to "upload your own" or "placeholder"
   * and then changing your mind doesn't lose it. */
  foundPhotoUrl: string | null;
  photoUrl: string | null;
  choice: HomePhotoChoiceValue | null;
  onChange: (photoUrl: string | null, choice: HomePhotoChoiceValue) => void;
}

/** Lets a homeowner decide what represents their home during the "Add a Home"
 * wizard: keep the photo we pulled from the Zillow listing, upload their own,
 * or fall back to the generic animated house icon instead of a real photo. */
export default function HomePhotoChoice({ userId, foundPhotoUrl, photoUrl, choice, onChange }: HomePhotoChoiceProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProfileImage(userId, file, "home");
      onChange(url, "custom");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Home photo</p>
      <div className="rounded-lg border border-border overflow-hidden aspect-video bg-muted">
        {photoUrl ? (
          <img src={photoUrl} alt="Home preview" className="w-full h-full object-cover" />
        ) : (
          <AnimatedHomePlaceholder size="lg" className="w-full h-full" />
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!foundPhotoUrl}
          onClick={() => foundPhotoUrl && onChange(foundPhotoUrl, "found")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            choice === "found" ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20" : "border-border bg-card text-muted-foreground hover:border-primary/30"
          }`}
        >
          {choice === "found" ? <Check size={16} className="text-primary" /> : <Image size={16} />}
          Zillow photo
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
            choice === "custom" ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20" : "border-border bg-card text-muted-foreground hover:border-primary/30"
          }`}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : choice === "custom" ? <Check size={16} className="text-primary" /> : <Camera size={16} />}
          Upload my own
        </button>
        <button
          type="button"
          onClick={() => onChange(null, "placeholder")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
            choice === "placeholder" ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20" : "border-border bg-card text-muted-foreground hover:border-primary/30"
          }`}
        >
          {choice === "placeholder" ? <Check size={16} className="text-primary" /> : <Sparkles size={16} />}
          Use icon
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
    </div>
  );
}
