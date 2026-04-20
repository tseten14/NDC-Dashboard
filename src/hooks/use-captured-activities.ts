import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CapturedActivity {
  id: string;
  title: string;
  description: string | null;
  organization: string | null;
  ministry: string | null;
  districts: string[];
  workflow_state: string;
  status: string;
  created_by: string;
}

/** Fetch captured activities for a given target (any strategy). Lightweight + cached per target. */
export function useCapturedActivities(targetId: string | null) {
  const [activities, setActivities] = useState<CapturedActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId) { setActivities([]); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("activity_target_links")
        .select("activity_id, activities!inner(*)")
        .eq("target_id", targetId)
        .eq("approval_status", "Approved");
      const acts = (data ?? []).map((r: any) => r.activities).filter(Boolean);
      // Dedupe
      const map = new Map<string, CapturedActivity>();
      acts.forEach((a: any) => map.set(a.id, a));
      setActivities(Array.from(map.values()));
      setLoading(false);
    })();
  }, [targetId]);

  return { activities, loading };
}

/** Fetch counts of approved linked activities grouped by target_id (for Strategy Library). */
export function useActivityCountsByTarget() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("activity_target_links")
        .select("target_id")
        .eq("approval_status", "Approved");
      const m: Record<string, number> = {};
      (data ?? []).forEach(r => { m[r.target_id] = (m[r.target_id] ?? 0) + 1; });
      setCounts(m);
      setLoading(false);
    })();
  }, []);

  return { counts, loading };
}
