/**
 * Screen: Tenfold Growth Strategy alignment.
 *
 * Shows how climate activities line up with Uganda's Tenfold growth ambitions,
 * and how ready each one is — so growth and climate plans can be read together.
 */
import { activities, kpis, computeKPIProgress, getActor, strategies } from "@/data/uganda-strategy-data";
import { useAppContext } from "@/hooks/use-app-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const tenfoldAnchors = ["Agri-Exports", "Industrial-Competitiveness", "FoodSecurity", "Jobs", "Productivity"];

export default function TenfoldLayer() {
  const { viewMode } = useAppContext();
  const tenfoldActivities = activities.filter(a => a.strategy_links.some(l => l.strategy_id === "STRAT-TENFOLD"));
  const economicKPIs = kpis.filter(k => k.category === "Economic" || k.category === "EnergyReliability");

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">Tenfold Growth Strategy</h2>
        <p className="text-xs text-muted-foreground">Align NDC activities to Tenfold anchors. {viewMode === "economic" ? "Showing economic KPIs." : "Showing policy alignment."}</p>

        {/* Anchor alignment */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tenfold Anchor Alignment</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Activity</th>
                    <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Anchor</th>
                    <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Ministries</th>
                    <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {tenfoldActivities.map(a => {
                    const anchor = a.strategy_links.find(l => l.strategy_id === "STRAT-TENFOLD")?.anchor_or_program_code;
                    return (
                      <tr key={a.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground">{a.title}</td>
                        <td className="py-1.5 px-2"><Badge variant="outline" className="text-[9px] h-4">{anchor}</Badge></td>
                        <td className="py-1.5 px-2">{a.ministry_badges.join(", ")}</td>
                        <td className="py-1.5 px-2"><ReadinessBadge level={a.investment_readiness_level} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Economic KPIs */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Economic KPIs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {economicKPIs.map(kpi => {
                const progress = computeKPIProgress(kpi);
                return (
                  <div key={kpi.id} className="p-2 rounded-md border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-foreground">{kpi.kpi_name}</span>
                      {kpi.is_proxy && <Badge variant="outline" className="text-[8px] h-3 bg-at-risk/10 text-at-risk">Proxy</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", progress.status === "on-track" ? "bg-on-track" : progress.status === "at-risk" ? "bg-at-risk" : "bg-off-track")}
                          style={{ width: `${progress.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{progress.pct}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{progress.value.toLocaleString()} / {progress.target.toLocaleString()} {kpi.unit}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function ReadinessBadge({ level }: { level: string }) {
  const colors: Record<string, string> = { NotReady: "bg-off-track/10 text-off-track", Emerging: "bg-at-risk/10 text-at-risk", Pipeline: "bg-chart-4/10 text-chart-4", Bankable: "bg-on-track/10 text-on-track" };
  return <Badge variant="outline" className={cn("text-[9px] h-4", colors[level])}>{level}</Badge>;
}
