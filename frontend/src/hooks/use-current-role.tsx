/**
 * Who the current user is and what they may do.
 *
 * The app presents different things to different jobs — a field officer records
 * activity, an MRV officer verifies it, a senior decision-maker reads summaries.
 * This holds the chosen role and answers the permission questions the screens
 * ask ("can this person approve?", "is this view read-only?").
 *
 * Roles here shape what is shown, not what is secured. Anything that genuinely
 * must be protected is enforced by the API, not by hiding a button.
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { DEFAULT_ROLES } from "@/lib/auth-config";
import { supabaseAuth } from "@/lib/supabase-auth";
import { readPreference, writePreference } from "@/lib/preferences";
import {
  canExport as canExportFmt,
  canUseIngest as canUseIngestRole,
  getDashboardMode,
  getDefaultRoute,
  getDocumentsDefaultCategory,
  getDocumentsDefaultTab,
  getHomeRoleStartHere,
  getRoleContextMessage,
  type DashboardMode,
  type ExportFormat,
} from "@/lib/role-capabilities";

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

export interface AppUser {
  id: string;
  email: string;
}

interface RoleCtx {
  user: AppUser | null;
  loading: boolean;
  activeRole: AppRole | null;
  availableRoles: AppRole[];
  setActiveRole: (r: AppRole) => void;
  grantRole: (r: AppRole) => void;
  signOut: () => Promise<void>;
  canCreateActivity: () => boolean;
  canEditActivityAsCreator: () => boolean;
  canApproveMapping: () => boolean;
  canVerify: () => boolean;
  isReadOnly: () => boolean;
  getDefaultRoute: () => string;
  getDashboardMode: () => DashboardMode;
  getRoleContextMessage: () => string;
  canExport: (format: ExportFormat) => boolean;
  canUseIngest: () => boolean;
  getDocumentsDefaultCategory: () => string;
  getDocumentsDefaultTab: () => "browse" | "pathway";
  getHomeRoleStartHere: () => ReturnType<typeof getHomeRoleStartHere>;
}

const Ctx = createContext<RoleCtx | null>(null);
const ACTIVE_ROLE_KEY = "uganda-ndc-active-role";
const ROLES_KEY = "uganda-ndc-available-roles";

function loadStoredRoles(userId: string): AppRole[] {
  try {
    const raw = readPreference("localStorage", `${ROLES_KEY}:${userId}`);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((role): role is AppRole => ALL_ROLES.some((meta) => meta.id === role));
        if (valid.length) return [...new Set(valid)];
      }
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_ROLES];
}

export function CurrentRoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!supabaseAuth) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
      setLoading(false);
    });
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
    }).catch(() => {
      if (mounted) setUser(null);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId) {
      setAvailableRoles([]);
      setActiveRoleState(null);
      return;
    }
    // Role choices are prototype UI preferences, scoped to the signed-in user.
    const roles = loadStoredRoles(userId);
    setAvailableRoles(roles);
    const stored = readPreference("localStorage", `${ACTIVE_ROLE_KEY}:${userId}`) as AppRole | null;
    setActiveRoleState(stored && roles.includes(stored) ? stored : "Admin");
  }, [userId]);

  const setActiveRole = useCallback((r: AppRole) => {
    if (!user) return;
    writePreference("localStorage", `${ACTIVE_ROLE_KEY}:${user.id}`, r);
    setActiveRoleState(r);
  }, [user]);

  const grantRole = useCallback((r: AppRole) => {
    setAvailableRoles((prev) => {
      const next = prev.includes(r) ? prev : [...prev, r];
      if (user) writePreference("localStorage", `${ROLES_KEY}:${user.id}`, JSON.stringify(next));
      return next;
    });
    setActiveRole(r);
  }, [setActiveRole, user]);

  const signOut = useCallback(async () => {
    if (!supabaseAuth) return;
    const { error } = await supabaseAuth.auth.signOut();
    if (error) throw error;
  }, []);

  const canCreateActivity = useCallback(
    () =>
      activeRole === "ProjectDeveloper" ||
      activeRole === "FieldOfficer" ||
      activeRole === "MinistryDeliveryOfficer" ||
      activeRole === "SeniorDecisionMaker" ||
      activeRole === "Admin",
    [activeRole],
  );
  const canEditActivityAsCreator = useCallback(() => canCreateActivity(), [canCreateActivity]);
  // Officers submit tickets; Senior Decision-Makers and Admins approve them.
  const canApproveMapping = useCallback(
    () => activeRole === "SeniorDecisionMaker" || activeRole === "Admin",
    [activeRole],
  );
  const canVerify = useCallback(() => activeRole === "MRVOfficer" || activeRole === "Admin", [activeRole]);
  const isReadOnly = useCallback(() => false, []);

  const roleDefaultRoute = useCallback(() => getDefaultRoute(activeRole), [activeRole]);
  const roleDashboardMode = useCallback(() => getDashboardMode(activeRole), [activeRole]);
  const roleContextMessage = useCallback(() => getRoleContextMessage(activeRole), [activeRole]);
  const roleCanExport = useCallback((format: ExportFormat) => canExportFmt(activeRole, format), [activeRole]);
  const roleCanUseIngest = useCallback(() => canUseIngestRole(activeRole), [activeRole]);
  const roleDocsCategory = useCallback(() => getDocumentsDefaultCategory(activeRole), [activeRole]);
  const roleDocsTab = useCallback(() => getDocumentsDefaultTab(activeRole), [activeRole]);
  const roleHomeStart = useCallback(() => getHomeRoleStartHere(activeRole), [activeRole]);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        activeRole,
        availableRoles,
        setActiveRole,
        grantRole,
        signOut,
        canCreateActivity,
        canEditActivityAsCreator,
        canApproveMapping,
        canVerify,
        isReadOnly,
        getDefaultRoute: roleDefaultRoute,
        getDashboardMode: roleDashboardMode,
        getRoleContextMessage: roleContextMessage,
        canExport: roleCanExport,
        canUseIngest: roleCanUseIngest,
        getDocumentsDefaultCategory: roleDocsCategory,
        getDocumentsDefaultTab: roleDocsTab,
        getHomeRoleStartHere: roleHomeStart,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCurrentRole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrentRole must be inside CurrentRoleProvider");
  return ctx;
}
