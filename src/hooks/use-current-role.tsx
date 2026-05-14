import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "ProjectDeveloper"
  | "FieldOfficer"
  | "MinistryDeliveryOfficer"
  | "MRVOfficer"
  | "SeniorDecisionMaker"
  | "Admin";

export const ALL_ROLES: { id: AppRole; label: string; description: string }[] = [
  { id: "ProjectDeveloper", label: "Project Developer", description: "Implementer / project lead" },
  { id: "FieldOfficer", label: "Field Officer", description: "District / local reporting" },
  { id: "MinistryDeliveryOfficer", label: "Ministry Delivery Officer", description: "Programme / policy steward" },
  { id: "MRVOfficer", label: "MRV Officer", description: "Sector MRV authority / CCD" },
  { id: "SeniorDecisionMaker", label: "Senior Decision-Maker", description: "Briefing & escalation (read-only)" },
  { id: "Admin", label: "Admin", description: "System configuration" },
];

interface RoleCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeRole: AppRole | null;
  availableRoles: AppRole[];
  setActiveRole: (r: AppRole) => void;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
  // permission helpers
  canCreateActivity: () => boolean;
  canEditActivityAsCreator: () => boolean;
  canApproveMapping: () => boolean;
  canVerify: () => boolean;
  isReadOnly: () => boolean;
}

const Ctx = createContext<RoleCtx | null>(null);

const ACTIVE_ROLE_KEY = "uganda-ndc-active-role";

export function CurrentRoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  const loadRoles = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (error) {
      console.error("Failed to load roles:", error);
      setAvailableRoles([]);
      return;
    }
    const roles = (data ?? []).map(r => r.role as AppRole);
    setAvailableRoles(roles);
    const stored = localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
    if (stored && roles.includes(stored)) setActiveRoleState(stored);
    else if (roles.length > 0) setActiveRoleState(roles[0]);
  }, []);

  useEffect(() => {
    // 1. Set up listener BEFORE getSession (per Supabase guidance)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer role load to avoid deadlocks
        setTimeout(() => loadRoles(sess.user.id), 0);
      } else {
        setAvailableRoles([]);
        setActiveRoleState(null);
      }
    });
    // 2. Then check existing
    supabase.auth
      .getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) loadRoles(sess.user.id).finally(() => setLoading(false));
        else setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, [loadRoles]);

  const setActiveRole = useCallback((r: AppRole) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, r);
    setActiveRoleState(r);
  }, []);

  const refreshRoles = useCallback(async () => {
    if (user) await loadRoles(user.id);
  }, [user, loadRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  }, []);

  const canCreateActivity = useCallback(() =>
    activeRole === "ProjectDeveloper" || activeRole === "FieldOfficer" ||
    activeRole === "MinistryDeliveryOfficer" || activeRole === "Admin", [activeRole]);
  const canEditActivityAsCreator = useCallback(() => canCreateActivity(), [canCreateActivity]);
  const canApproveMapping = useCallback(() =>
    activeRole === "MinistryDeliveryOfficer" || activeRole === "Admin", [activeRole]);
  const canVerify = useCallback(() =>
    activeRole === "MRVOfficer" || activeRole === "Admin", [activeRole]);
  const isReadOnly = useCallback(() => activeRole === "SeniorDecisionMaker", [activeRole]);

  return (
    <Ctx.Provider value={{
      user, session, loading, activeRole, availableRoles,
      setActiveRole, refreshRoles, signOut,
      canCreateActivity, canEditActivityAsCreator, canApproveMapping, canVerify, isReadOnly,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCurrentRole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrentRole must be inside CurrentRoleProvider");
  return ctx;
}
