import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details: Record<string, any> = {},
) {
  await supabase.from("staff_activity_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}
