/**
 * Complete directory of browser routes registered by the application.
 *
 * The in-app Documentation page renders this list so users can see what each
 * address does and whether its evidence is ready for operational use. Keep a
 * route here even when its screen is unavailable: an honest unavailable state
 * prevents an old prototype from being mistaken for verified data.
 */

export type RouteReadiness = "Live" | "Workflow" | "Unavailable" | "System";

export interface RouteDirectoryEntry {
  path: string;
  screen: string;
  readiness: RouteReadiness;
  description: string;
}

export const ROUTE_DIRECTORY: RouteDirectoryEntry[] = [
  { path: "/", screen: "Home", readiness: "Live", description: "Starting point and links to the main decision tools." },
  { path: "/dashboard", screen: "Dashboard", readiness: "Live", description: "Official NDC targets compared with live Climate TRACE observations." },
  { path: "/map", screen: "Emissions Map", readiness: "Live", description: "Located Climate TRACE source records on a satellite map." },
  { path: "/district-translator", screen: "District Translator", readiness: "Live", description: "Mapped source records filtered by pinned 2020 UBOS district boundaries." },
  { path: "/sector-classification", screen: "Sector Classification", readiness: "Live", description: "Climate TRACE series organised by supported reporting categories." },
  { path: "/sector-classification/archive", screen: "Classification archive", readiness: "Workflow", description: "Browser-saved classification exercises and their audit history." },
  { path: "/scenario-analysis", screen: "Scenario Analysis", readiness: "Workflow", description: "User-entered deterministic scenarios based on a pinned inventory exercise." },
  { path: "/ai-2030", screen: "AI 2030 Projection", readiness: "Live", description: "Planning estimates calculated from live historical emissions; not an official forecast." },
  { path: "/climate-finance", screen: "Climate Finance", readiness: "Live", description: "Partial register containing only provider-sourced finance commitments." },
  { path: "/documents", screen: "Policy Documents", readiness: "Live", description: "Build-time policy metadata, passages, and climate-fund project sources." },
  { path: "/documents/view", screen: "Document analysis", readiness: "Workflow", description: "Read and analyse one selected source document; AI output requires verification." },
  { path: "/library", screen: "Strategy Library", readiness: "Live", description: "Versioned strategy targets and their links to NDC themes." },
  { path: "/ingest", screen: "Data Ingestion", readiness: "Workflow", description: "Operator-unlocked file profiling and mapped observation import." },
  { path: "/my-work", screen: "Database", readiness: "Workflow", description: "Personal browser-local activities, decisions, and submissions." },
  { path: "/activities/new", screen: "Create activity", readiness: "Workflow", description: "Create a browser-local activity record." },
  { path: "/activities/:id", screen: "Activity details", readiness: "Workflow", description: "Review one browser-local activity and its evidence trail." },
  { path: "/activities/:id/edit", screen: "Edit activity", readiness: "Workflow", description: "Update one browser-local activity." },
  { path: "/mwp-marketplace", screen: "Marketplace", readiness: "Workflow", description: "Database-backed user project records; unavailable when persistence is not connected." },
  { path: "/mwp-marketplace/:id", screen: "Marketplace deal room", readiness: "Workflow", description: "Pitch, evaluation, and delivery record for one user-created project." },
  { path: "/executive", screen: "Executive Overview", readiness: "Live", description: "Compact briefing view assembled from the verified dashboard sources." },
  { path: "/delivery", screen: "Delivery & Accountability", readiness: "Workflow", description: "User-maintained activity delivery records and catalogue context." },
  { path: "/evidence", screen: "Evidence & MRV", readiness: "Workflow", description: "Evidence workflow using connected observations and user records." },
  { path: "/finance", screen: "Finance & Investment", readiness: "Workflow", description: "Planning workflow; figures require linked sources before official use." },
  { path: "/investment", screen: "Investment Templates", readiness: "Workflow", description: "Structured templates for user-authored investment concepts." },
  { path: "/exports", screen: "Exports & API", readiness: "Workflow", description: "Download helpers and API guidance for the current workspace." },
  { path: "/admin", screen: "Administration", readiness: "Workflow", description: "Operator tools and application configuration status." },
  { path: "/vision-2040", screen: "Vision 2040", readiness: "Live", description: "Versioned policy commitments with links to their source context." },
  { path: "/policy-impact", screen: "Policy Impact", readiness: "Unavailable", description: "No production case series with verified quantitative effects is connected." },
  { path: "/risk", screen: "Climate Risk", readiness: "Unavailable", description: "No verified hazard, exposure, and vulnerability dataset is connected." },
  { path: "/risk/map", screen: "Risk map", readiness: "Unavailable", description: "Reserved for sourced geographic hazard evidence." },
  { path: "/risk/screening", screen: "Risk screening", readiness: "Unavailable", description: "Reserved for a documented screening method and verified inputs." },
  { path: "/risk/drilldown", screen: "Risk drill-down", readiness: "Unavailable", description: "Reserved for sourced district risk detail." },
  { path: "/financial-flow", screen: "Financial Flows", readiness: "Unavailable", description: "No verified commitment, payment, and expenditure ledger is connected." },
  { path: "/cost-effectiveness", screen: "Cost Effectiveness", readiness: "Unavailable", description: "No compatible audited project cost and mitigation evidence is connected." },
  { path: "/institutional-map", screen: "Institutional Alignment", readiness: "Unavailable", description: "No authoritative responsibility and focal-point roster is connected." },
  { path: "/indicators", screen: "Indicator Catalogue", readiness: "Unavailable", description: "The legacy indicator set had no sourced observations or approved targets." },
  { path: "/interlinkages", screen: "Interlinkage Explorer", readiness: "Unavailable", description: "No verified quantitative relationship dataset is connected." },
  { path: "/causal-chains", screen: "Causal Chains", readiness: "Unavailable", description: "No approved causal model with evidence is connected." },
  { path: "/project-check", screen: "Project Check", readiness: "Unavailable", description: "No verified project assessment record is connected." },
  { path: "/tenfold", screen: "Tenfold Growth Strategy", readiness: "Unavailable", description: "No sourced programme delivery and readiness records are connected." },
  { path: "/ndp-iv", screen: "NDP IV", readiness: "Unavailable", description: "Draft programme labels and assumed targets were removed." },
  { path: "/afolu-mrv", screen: "AFOLU MRV", readiness: "Unavailable", description: "No verified agriculture, forestry, and land-use monitoring records are connected." },
  { path: "/kpis", screen: "KPIs & Proxy Indicators", readiness: "Unavailable", description: "The legacy view had no sourced observations or approved indicators." },
  { path: "/ownership", screen: "Ownership & Focal Points", readiness: "Unavailable", description: "No confirmed focal-point roster is connected." },
  { path: "/projections", screen: "Legacy projections", readiness: "Unavailable", description: "Unsupported fixed-rate scenarios were removed; use AI 2030 instead." },
  { path: "/legacy-overview", screen: "Legacy overview", readiness: "Unavailable", description: "No connected delivery, spending, or validation source supports this old view." },
  { path: "/ndc", screen: "Dashboard alias", readiness: "System", description: "Compatibility address for the main NDC Dashboard." },
  { path: "/docs", screen: "Documentation", readiness: "System", description: "User guide, full route directory, codebase guide, and system design." },
  { path: "/auth", screen: "Sign-in compatibility route", readiness: "System", description: "Redirects while site-wide sign-in is disabled." },
  { path: "/select-country", screen: "Country selection", readiness: "System", description: "Select the supported national workspace before entering the app." },
];
