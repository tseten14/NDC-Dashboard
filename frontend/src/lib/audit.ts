import { appendAudit } from "@/lib/activities-store";

export async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  diffSummary?: string,
) {
  appendAudit(actorId, action, entityType, entityId, diffSummary);
}
