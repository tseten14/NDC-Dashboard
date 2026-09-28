import { BookOpen, Briefcase, Coins, GitBranch, Home, Layers3, Map as MapIcon, MapPinned, Scale, Sparkles, Store, Target, Upload, Workflow } from "lucide-react";

export const PRIMARY_NAV = [
  { title: "Home", url: "/", icon: Home, description: "Your climate workspace", group: "Explore" },
  { title: "Emissions Map", url: "/map", icon: MapIcon, description: "See mapped emissions sources", group: "Explore" },
  { title: "District Translator", url: "/district-translator", icon: MapPinned, description: "Turn an area into local insights", group: "Explore" },
  { title: "Sector Classification", url: "/sector-classification", icon: Layers3, description: "Explore Climate TRACE data by reporting category", group: "Explore" },
  { title: "Scenario Analysis", url: "/scenario-analysis", icon: GitBranch, description: "Compare actions, timing and policy evidence", group: "Explore" },
  { title: "Dashboard", url: "/dashboard", icon: Target, description: "Track national NDC progress", group: "Explore" },
  { title: "AI 2030 Projection", url: "/ai-2030", icon: Sparkles, description: "Explore future emissions scenarios", group: "Plan & deliver" },
  { title: "Policy Impact", url: "/policy-impact", icon: Workflow, description: "Connect policies and outcomes", group: "Plan & deliver" },
  { title: "Climate Finance", url: "/climate-finance", icon: Coins, description: "Explore climate investments", group: "Plan & deliver" },
  { title: "Marketplace", url: "/mwp-marketplace", icon: Store, description: "Discover mitigation opportunities", group: "Plan & deliver" },
  { title: "Data Ingestion", url: "/ingest", icon: Upload, description: "Import and validate evidence", group: "Manage & learn" },
  { title: "Policy Documents", url: "/documents", icon: Scale, description: "Find the underlying policy evidence", group: "Manage & learn" },
  { title: "Database", url: "/my-work", icon: Briefcase, description: "Manage activities and submissions", group: "Manage & learn" },
  { title: "Documentation", url: "/docs", icon: BookOpen, description: "Methods, sources, and guidance", group: "Manage & learn" },
];
