import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadProfileImage, MAX_PROFILE_IMAGE_BYTES } from "@/lib/profileImages";

interface VehiclePhotoUploadProps {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  fallbackIcon: React.ReactNode;
  /** "sm" = small circular thumbnail (e.g. header icon slot). "lg" = wide landscape cover (e.g. add-vehicle form). */
  size?: "sm" | "lg";
  className?: string;
}

/** Rectangular/landscape sibling of AvatarUpload, for vehicle photos (folder "vehicle" in the profile-images bucket). */
export default function VehiclePhotoUpload({
  userId,
  currentUrl,
  onUploaded,
  fallbackIcon,
  size = "lg",
  className = "",
}: VehiclePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error("Image too large — max 5 MB");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadProfileImage(userId, file, "vehicle");
      await onUploaded(url);
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const dim = size === "sm" ? "h-10 w-10 rounded-full" : "aspect-video w-full rounded-md";

  return (
    <div className={`relative ${dim} overflow-hidden bg-primary/10 shrink-0 ${className}`}>
      {currentUrl ? (
        <img src={currentUrl} alt="Vehicle" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">{fallbackIcon}</div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} disabled={busy} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={currentUrl ? "Change photo" : "Add photo"}
        title={currentUrl ? "Change photo" : "Add photo"}
        className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-colors text-xs font-medium outline-none ${
          busy
            ? "bg-black/40 text-white"
            : "bg-black/0 hover:bg-black/40 focus-visible:bg-black/40 text-transparent hover:text-white focus-visible:text-white"
        }`}
      >
        {busy ? (
          <Loader2 size={size === "sm" ? 12 : 16} className="animate-spin" />
        ) : (
          <Camera size={size === "sm" ? 12 : 16} />
        )}
        {size === "lg" && !busy && <span>{currentUrl ? "Change photo" : "Add photo"}</span>}
      </button>
    </div>
  );
}
