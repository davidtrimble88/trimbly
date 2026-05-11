import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-images";

export async function uploadProfileImage(userId: string, file: File, folder: "avatar" | "gallery"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProfileImage(publicUrl: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.substring(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
