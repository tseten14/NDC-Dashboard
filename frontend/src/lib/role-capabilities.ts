import type { AppRole } from "@/hooks/use-current-role";

/**
 * Officer roles: restricted to the Database tab only (create/submit/validate tickets).
 * Full-access roles (Senior Decision-Maker, Admin) see every tab and approve tickets.
 */
export const MY_WORK_ONLY_ROLES: AppRole[] = [
  "ProjectDeveloper",
  "FieldOfficer",
  "MinistryDeliveryOfficer",
  "MRVOfficer",
];

export function isMyWorkOnlyRole(role: AppRole | null): boolean {
  return role != null && MY_WORK_ONLY_ROLES.includes(role);
}

export type DashboardMode = "briefing" | "mrv" | "field" | "standard" | "admin";
export type ExportFormat = "excel" | "pdf" | "csv";

export const DASHBOARD_MODE_LABELS: Record<DashboardMode, string> = {
  briefing: "Briefing",
  mrv: "MRV",
  field: "Field",
  standard: "Standard",
  admin: "Admin",
};

export interface DashboardPresets {
  geographyLevel: "national" | "district";
  sector: string | null;
  emphasizeMrvPanels: boolean;
  lockGeography: boolean;
}

export function getDashboardPresets(role: AppRole | null): DashboardPresets {
  switch (role) {
    case "FieldOfficer":
      return {
        geographyLevel: "district",
        sector: null,
        emphasizeMrvPanels: false,
        lockGeography: true,
      };
    case "MRVOfficer":
      return {
        geographyLevel: "national",
        sector: "afolu",
        emphasizeMrvPanels: true,
        lockGeography: false,
      };
    case "SeniorDecisionMaker":
      return {
        geographyLevel: "national",
        sector: "economy-wide",
        emphasizeMrvPanels: false,
        lockGeography: true,
      };
    default:
      return {
        geographyLevel: "national",
        sector: null,
        emphasizeMrvPanels: false,
        lockGeography: false,
      };
  }
}

export function getDefaultRoute(role: AppRole | null): string {
  // Officer roles land on Database — their only tab.
  if (isMyWorkOnlyRole(role)) return "/my-work";
  switch (role) {
    case "SeniorDecisionMaker":
      return "/";
    case "Admin":
      return "/admin";
    default:
      return "/";
  }
}

export function getDashboardMode(role: AppRole | null): DashboardMode {
  switch (role) {
    case "SeniorDecisionMaker":
      return "briefing";
    case "MRVOfficer":
      return "mrv";
    case "FieldOfficer":
      return "field";
    case "Admin":
      return "admin";
    default:
      return "standard";
  }
}

export function getRoleContextMessage(role: AppRole | null): string {
  switch (role) {
    case "SeniorDecisionMaker":
      return "Full access — every tab plus approval of activities (tickets) submitted by officers in Database.";
    case "MRVOfficer":
      return "Database — validate and QA submitted outputs.";
    case "MinistryDeliveryOfficer":
      return "Database — create and submit activities for approval.";
    case "FieldOfficer":
      return "Database — log and submit field activities.";
    case "ProjectDeveloper":
      return "Database — create activities and track delivery.";
    case "Admin":
      return "Admin — full workflow, approvals, and configuration access.";
    default:
      return "Select a role to tailor the workspace.";
  }
}

export function canExport(role: AppRole | null, format: ExportFormat): boolean {
  // Every role may export in any format.
  void role;
  void format;
  return true;
}

export function canUseIngest(role: AppRole | null): boolean {
  if (!role) return true;
  return (
    role === "MRVOfficer" ||
    role === "Admin" ||
    role === "MinistryDeliveryOfficer" ||
    role === "SeniorDecisionMaker"
  );
}

export function shouldShowAdvancedNav(role: AppRole | null): boolean {
  return role !== "SeniorDecisionMaker";
}

export function isPrimaryNavVisible(role: AppRole | null, url: string): boolean {
  // Officer roles only see the Database tab. Senior Decision-Maker and Admin see everything.
  if (isMyWorkOnlyRole(role)) return url === "/my-work";
  return true;
}

export function isAdvancedNavVisible(role: AppRole | null, url: string): boolean {
  if (!shouldShowAdvancedNav(role)) return false;
  if (url === "/admin") return role === "Admin";
  return true;
}

export function getDocumentsDefaultCategory(role: AppRole | null): string {
  switch (role) {
    case "MRVOfficer":
      return "UN Submissions";
    case "MinistryDeliveryOfficer":
      return "Executive";
    default:
      return "";
  }
}

export function getDocumentsDefaultTab(role: AppRole | null): "browse" | "pathway" {
  return role === "MinistryDeliveryOfficer" ? "pathway" : "browse";
}

export function getHomeRoleStartHere(role: AppRole | null): {
  title: string;
  bullets: string[];
  to: string;
  cta: string;
} {
  switch (role) {
    case "SeniorDecisionMaker":
      return {
        title: "As Senior Decision-Maker",
        bullets: ["Full access to every tab", "Approve activities submitted by officers", "Export briefings in any format"],
        to: "/dashboard",
        cta: "Open Dashboard",
      };
    case "MRVOfficer":
      return {
        title: "As MRV Officer",
        bullets: ["Validate and QA submitted outputs", "Work the validation queue", "All in Database"],
        to: "/my-work",
        cta: "Go to Database",
      };
    case "MinistryDeliveryOfficer":
      return {
        title: "As Ministry Delivery Officer",
        bullets: ["Create activities linked to targets", "Submit for approval", "Track status in Database"],
        to: "/my-work",
        cta: "Go to Database",
      };
    case "FieldOfficer":
      return {
        title: "As Field Officer",
        bullets: ["Log activities from the field", "Submit for approval", "Track status in Database"],
        to: "/my-work",
        cta: "Go to Database",
      };
    case "ProjectDeveloper":
      return {
        title: "As Project Developer",
        bullets: ["Create draft activities linked to targets", "Submit for ministry approval", "Track status in Database"],
        to: "/my-work",
        cta: "Go to Database",
      };
    case "Admin":
      return {
        title: "As Admin",
        bullets: ["Full create / approve / verify workflow", "Admin tools and role simulation", "All exports and ingest"],
        to: "/admin",
        cta: "Open Admin",
      };
    default:
      return {
        title: "Get started",
        bullets: ["Pick a role in the top bar", "Open Dashboard for NDC vs emissions", "Use Documentation for help"],
        to: "/dashboard",
        cta: "Open Dashboard",
      };
  }
}

export function getWorkQueueBadgeCount(
  role: AppRole | null,
  counts: { approvals: number; verifications: number },
): number {
  if (!role) return 0;
  if (role === "Admin") return counts.approvals + counts.verifications;
  if (role === "SeniorDecisionMaker") return counts.approvals;
  if (role === "MRVOfficer") return counts.verifications;
  return 0;
}
