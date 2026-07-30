/**
 * Records who did what.
 *
 * Writes an entry to the audit trail whenever someone changes something that
 * matters — approving an activity, importing figures. This is what makes an
 * action traceable back to a person and a time afterwards.
 */
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
