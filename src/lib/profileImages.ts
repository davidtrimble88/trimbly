import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-images";

// Single source of truth for the size cap on avatar/vehicle/gallery photo
// uploads (this bucket only — VerificationPanel's 15MB doc-upload cap is a
// deliberately different limit for a different upload type). Previously
// copy-pasted as a literal `5 * 1024 * 1024` in five separate components,
// which had already drifted (different toast copy, different toast APIs,
// and one call site that silently skipped oversized files with no
// user-facing message at all).
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_MB_LABEL = "5 MB";

export async function uploadProfileImage(userId: string, file: File, folder: "avatar" | "gallery" | "home" | "vehicle"): Promise<string> {
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
