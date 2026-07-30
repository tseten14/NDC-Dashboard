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
import { LOCAL_USER, DEFAULT_ROLES } from "@/lib/auth-config";
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
  signOut: () => void;
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

function loadStoredRoles(): AppRole[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppRole[];
      if (parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_ROLES];
}

export function CurrentRoleProvider({ children }: { children: ReactNode }) {
  const [user] = useState<AppUser>(LOCAL_USER);
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  useEffect(() => {
    const roles = loadStoredRoles();
    setAvailableRoles(roles);
    const stored = localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
    setActiveRoleState(stored && roles.includes(stored) ? stored : "Admin");
    setLoading(false);
  }, []);

  const setActiveRole = useCallback((r: AppRole) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, r);
    setActiveRoleState(r);
  }, []);

  const grantRole = useCallback((r: AppRole) => {
    setAvailableRoles((prev) => {
      const next = prev.includes(r) ? prev : [...prev, r];
      localStorage.setItem(ROLES_KEY, JSON.stringify(next));
      return next;
    });
    setActiveRole(r);
  }, [setActiveRole]);

  const signOut = useCallback(() => {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setActiveRoleState("Admin");
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
