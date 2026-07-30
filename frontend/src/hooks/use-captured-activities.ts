/**
 * Reads the activities recorded in this browser.
 *
 * Activities are drafted locally before being submitted. This makes them
 * available to screens that need them, and counts how many are attached to each
 * target — which is how the "targets with no activity" gap is spotted.
 */
import { useEffect, useState } from "react";
import {
  getApprovedActivitiesForTarget,
  countApprovedLinksByTarget,
  type StoredActivity,
} from "@/lib/activities-store";

export type CapturedActivity = StoredActivity;

export function useCapturedActivities(targetId: string | null) {
  const [activities, setActivities] = useState<CapturedActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId) {
      setActivities([]);
      return;
    }
    setLoading(true);
    setActivities(getApprovedActivitiesForTarget(targetId));
    setLoading(false);
  }, [targetId]);

  return { activities, loading };
}

export function useActivityCountsByTarget() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCounts(countApprovedLinksByTarget());
    setLoading(false);
  }, []);

  return { counts, loading };
}
