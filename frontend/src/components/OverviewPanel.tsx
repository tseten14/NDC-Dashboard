import { sectors, getTotalEmissions, getTotalBaseline, getOverallProgress, getProgressPercent, getSectorStatus } from "@/data/climate-data";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Target, Activity, AlertTriangle } from "lucide-react";
import { SectorProgressBar } from "./SectorProgressBar";

export function OverviewPanel() {
  const totalCurrent = getTotalEmissions();
  const totalBaseline = getTotalBaseline();
  const overallProgress = getOverallProgress();
  const totalReduction = totalBaseline - totalCurrent;
  const atRiskCount = sectors.filter(s => getSectorStatus(s) !== "on-track").length;

  if (!sectors || sectors.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground" role="status">
        Climate data is not yet available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingDown}
          label="Total Emissions"
          value={`${totalCurrent} MtCO₂e`}
          sub={`Baseline: ${totalBaseline} MtCO₂e`}
        />
        <KPICard
          icon={Target}
          label="Overall Progress"
          value={`${overallProgress}%`}
          sub="Toward NDC targets"
          highlight
        />
        <KPICard
          icon={Activity}
          label="Total Reduced"
          value={`${totalReduction} MtCO₂e`}
          sub="Since baseline year"
        />
        <KPICard
          icon={AlertTriangle}
          label="Sectors At Risk"
          value={`${atRiskCount}`}
          sub={`of ${sectors.length} sectors`}
          warning={atRiskCount > 2}
        />
      </div>

      {/* All Sectors Progress */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Sector Progress Toward NDC Targets</h3>
          <div className="space-y-4">
            {sectors.map((sector) => (
              <SectorProgressBar key={sector.id} sector={sector} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, highlight, warning }: {
  icon: any; label: string; value: string; sub: string; highlight?: boolean; warning?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? "status-on-track" : warning ? "status-at-risk" : "text-foreground"}`}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`p-2 rounded-lg ${highlight ? "bg-on-track/10" : warning ? "bg-at-risk/10" : "bg-muted"}`}>
            <Icon className={`h-5 w-5 ${highlight ? "status-on-track" : warning ? "status-at-risk" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
