import { listActivitiesByWorkflow, listOutputsWithActivityTitle } from "@/lib/activities-store";

export function getWorkQueueCounts() {
  return {
    approvals: listActivitiesByWorkflow("Submitted").length,
    verifications: listOutputsWithActivityTitle().length,
  };
}
