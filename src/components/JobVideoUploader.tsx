import { useRef, useState } from "react";
import { Video, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const MAX_SECONDS = 30;
const MAX_BYTES = 50 * 1024 * 1024; // 50MB

export default function JobVideoUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const probeDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read video"));
      };
      video.src = url;
    });

  const handleFile = async (file: File | undefined) => {
    if (!file || !user) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Video must be under 50MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const duration = await probeDuration(file);
      if (duration > MAX_SECONDS + 0.5) {
        toast({
          title: "Video too long",
          description: `Videos must be ${MAX_SECONDS} seconds or less. Yours is ${Math.round(duration)}s.`,
          variant: "destructive",
        });
        return;
      }
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("job-photos").upload(path, file, { contentType: file.type });
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        return;
      }
      const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      toast({ title: "Upload error", description: e.message || "Could not upload video", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {value ? (
        <div className="relative w-full max-w-xs rounded-md overflow-hidden border border-border">
          <video src={value} controls className="w-full h-auto" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-32 h-20 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors gap-1"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
          <span className="text-xs">{uploading ? "Uploading..." : "Add video"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground mt-2">1 video, up to {MAX_SECONDS} seconds. Helps pros assess the job.</p>
    </div>
  );
}
