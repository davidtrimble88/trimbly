import { supabase } from "@/integrations/supabase/client";

// Single source of truth for the "job-photos" bucket (which, despite the
// name, stores both job photos and job videos) and its upload path scheme.
// Previously JobPhotoUploader.tsx and JobVideoUploader.tsx each copy-pasted
// this same bucket name + path construction independently.
const BUCKET = "job-photos";

export async function uploadJobMedia(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
