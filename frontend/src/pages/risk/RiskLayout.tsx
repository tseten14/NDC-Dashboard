/**
 * Shared frame for the risk screens.
 *
 * Holds the navigation between the risk overview, map, screening and drilldown
 * views, so they share one consistent shell.
 */
// Keep every risk route available while stating the missing evidence once.
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert } from "lucide-react";
import { RiskBanner } from "@/components/risk/RiskBanner";
import { useHazardLayers } from "@/hooks/use-risk-data";

const tabs = [
  { to: "/risk", label: "Overview", end: true },
  { to: "/risk/map", label: "Risk Map" },
  { to: "/risk/screening", label: "Screening" },
  { to: "/risk/drilldown", label: "Technical Drill-down" },
];

export default function RiskLayout() {
  const loc = useLocation();
  const { data: hazards, loading, error } = useHazardLayers();
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-foreground" />
            <h1 className="text-sm font-bold text-foreground">Climate Risk &amp; Vulnerability</h1>
            <span className="text-[10px] text-muted-foreground">Hazard × Exposure × Vulnerability</span>
          </div>
        </div>
        <nav className="flex gap-1">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `text-[11px] px-2.5 py-1 rounded border  ${
                  isActive
                    ? "bg-accent text-accent-foreground border-border"
                    : "bg-transparent text-muted-foreground border-transparent  "
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3 max-w-7xl">
          {loading ? <p>Checking risk data…</p> : error ? (
            <p role="alert">Risk data could not be loaded. Please try again later.</p>
          ) : hazards.length === 0 ? <RiskBanner /> : <Outlet key={loc.pathname} />}
        </div>
      </ScrollArea>
    </div>
  );
}
