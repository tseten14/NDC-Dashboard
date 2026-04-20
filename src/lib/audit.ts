import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  diffSummary?: string,
) {
  await supabase.from("audit_log").insert({
    actor_id: actorId, action, entity_type: entityType, entity_id: entityId,
    diff_summary: diffSummary ?? null,
  });
}
