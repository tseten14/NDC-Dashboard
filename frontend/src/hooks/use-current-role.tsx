import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { DEMO_USER, DEMO_ROLES } from "@/lib/auth-config";
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

export interface DemoUser {
  id: string;
  email: string;
}

interface RoleCtx {
  user: DemoUser | null;
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
  return [...DEMO_ROLES];
}

export function CurrentRoleProvider({ children }: { children: ReactNode }) {
  const [user] = useState<DemoUser>(DEMO_USER);
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
      activeRole === "Admin",
    [activeRole],
  );
  const canEditActivityAsCreator = useCallback(() => canCreateActivity(), [canCreateActivity]);
  const canApproveMapping = useCallback(
    () => activeRole === "MinistryDeliveryOfficer" || activeRole === "Admin",
    [activeRole],
  );
  const canVerify = useCallback(() => activeRole === "MRVOfficer" || activeRole === "Admin", [activeRole]);
  const isReadOnly = useCallback(() => activeRole === "SeniorDecisionMaker", [activeRole]);

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
