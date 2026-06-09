import type { AppRole } from "@/hooks/use-current-role";

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
  switch (role) {
    case "SeniorDecisionMaker":
      return "/";
    case "MRVOfficer":
      return "/dashboard?sector=afolu";
    case "FieldOfficer":
      return "/dashboard";
    case "ProjectDeveloper":
      return "/my-work";
    case "MinistryDeliveryOfficer":
      return "/dashboard";
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
      return "Briefing mode — read-only; PDF export available; activity edits disabled.";
    case "MRVOfficer":
      return "MRV mode — verification tools emphasized; full export formats.";
    case "MinistryDeliveryOfficer":
      return "Programme mode — create and approve activities; check approvals queue in My Work.";
    case "FieldOfficer":
      return "Field mode — district geography default; map and local sources emphasized.";
    case "ProjectDeveloper":
      return "Project mode — create activities and track delivery in My Work.";
    case "Admin":
      return "Admin — full workflow and configuration access.";
    default:
      return "Select a role to tailor the workspace.";
  }
}

export function canExport(role: AppRole | null, format: ExportFormat): boolean {
  if (!role) return true;
  if (role === "SeniorDecisionMaker") return format === "pdf";
  return true;
}

export function canUseIngest(role: AppRole | null): boolean {
  if (!role) return true;
  return role === "MRVOfficer" || role === "Admin" || role === "MinistryDeliveryOfficer";
}

export function shouldShowAdvancedNav(role: AppRole | null): boolean {
  return role !== "SeniorDecisionMaker";
}

function isDemoModeNavOverride(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("demo") === "1" ||
    sessionStorage.getItem("uganda-ndc-demo-mode") === "1"
  );
}

export function isPrimaryNavVisible(role: AppRole | null, url: string): boolean {
  const demo = isDemoModeNavOverride();
  if (url === "/ingest" && role === "SeniorDecisionMaker") return false;
  if (url === "/climate-finance" && (role === "SeniorDecisionMaker" || role === "FieldOfficer") && !demo) {
    return false;
  }
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
        bullets: ["Open Dashboard for national on-track summary", "Export PDF briefing", "No activity edits in this mode"],
        to: "/dashboard",
        cta: "Open Dashboard",
      };
    case "MRVOfficer":
      return {
        title: "As MRV Officer",
        bullets: ["Review spatial certainty and trackability", "Export CRT/BTR-style CSV", "Verify outputs in My Work"],
        to: "/dashboard?sector=afolu",
        cta: "Open MRV dashboard",
      };
    case "MinistryDeliveryOfficer":
      return {
        title: "As Ministry Delivery Officer",
        bullets: ["Find IMPL. GAPS targets on Dashboard", "Approve submitted activities", "Browse policy documents"],
        to: "/dashboard",
        cta: "Open Dashboard",
      };
    case "FieldOfficer":
      return {
        title: "As Field Officer",
        bullets: ["Switch Dashboard to District view", "Use Emissions Map for local sources", "Log activities from the field"],
        to: "/map",
        cta: "Open Emissions Map",
      };
    case "ProjectDeveloper":
      return {
        title: "As Project Developer",
        bullets: ["Create draft activities linked to targets", "Submit for ministry approval", "Track status in My Work"],
        to: "/my-work",
        cta: "Go to My Work",
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
  if (role === "MinistryDeliveryOfficer") return counts.approvals;
  if (role === "MRVOfficer") return counts.verifications;
  return 0;
}
