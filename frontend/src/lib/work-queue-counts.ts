/**
 * Counts what is waiting in a person's queue.
 *
 * Produces the numbers shown on the navigation badges — how many items need this
 * user's attention.
 */
import { listActivitiesByWorkflow, listOutputsWithActivityTitle } from "@/lib/activities-store";

export function getWorkQueueCounts() {
  return {
    approvals: listActivitiesByWorkflow("Submitted").length,
    verifications: listOutputsWithActivityTitle().length,
  };
}
