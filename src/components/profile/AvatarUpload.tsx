import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadProfileImage } from "@/lib/profileImages";

interface Props {
  userId: string;
  currentUrl?: string | null;
  fallback?: string;
  onUploaded: (url: string) => void;
  size?: "md" | "lg";
}

const AvatarUpload = ({ userId, currentUrl, fallback, onUploaded, size = "md" }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const dim = size === "lg" ? "h-28 w-28" : "h-20 w-20";

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const url = await uploadProfileImage(userId, file, "avatar");
      onUploaded(url);
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className={dim}>
        <AvatarImage src={currentUrl ?? undefined} alt="Profile" />
        <AvatarFallback>{fallback?.[0]?.toUpperCase() ?? <User size={24} />}</AvatarFallback>
      </Avatar>
      <div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Camera size={14} className="mr-1.5" />}
          {currentUrl ? "Change photo" : "Upload photo"}
        </Button>
        <p className="text-xs text-muted-foreground mt-1.5">JPG or PNG, max 5 MB</p>
      </div>
    </div>
  );
};

export default AvatarUpload;
