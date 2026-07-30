/**
 * Screen: Vision 2040 alignment.
 *
 * Places climate commitments in the context of Uganda's long-term national
 * vision.
 */
import { kpis, computeKPIProgress, strategies } from "@/data/uganda-strategy-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const v2040Pillars = [
  { name: "Economic Growth & Transformation", kpiCategories: ["Economic", "EnergyReliability"] as const },
  { name: "Food Security & Agriculture", kpiCategories: ["FoodSecurity"] as const },
  { name: "Climate & Environment", kpiCategories: ["NDC", "Adaptation"] as const },
  { name: "Programme Delivery", kpiCategories: ["ProgrammeDelivery", "Budget"] as const },
];

export default function Vision2040() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">Vision 2040</h2>
        <p className="text-xs text-muted-foreground">Long-term socio-economic transformation pathway. Structural indicators and continuity view.</p>

        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Strategy Overview</h3>
            <p className="text-[10px] text-muted-foreground">{strategies.find(s => s.id === "STRAT-V2040")?.description}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Owner: <span className="font-medium text-foreground">{strategies.find(s => s.id === "STRAT-V2040")?.owner_org}</span></p>
          </CardContent>
        </Card>

        {v2040Pillars.map(pillar => {
          const pillarKPIs = kpis.filter(k => (pillar.kpiCategories as readonly string[]).includes(k.category));
          return (
            <Card key={pillar.name}>
              <CardContent className="p-3">
                <h3 className="text-xs font-bold text-foreground mb-2">{pillar.name}</h3>
                {pillarKPIs.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No KPIs linked yet. Placeholder for long-term structural indicators.</p>
                ) : (
                  <div className="space-y-1.5">
                    {pillarKPIs.map(kpi => {
                      const progress = computeKPIProgress(kpi);
                      const longTermTarget = kpi.targets.find(t => t.strategy_id === "STRAT-V2040") || kpi.targets[0];
                      return (
                        <div key={kpi.id} className="p-2 rounded border border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-foreground">{kpi.kpi_name}</span>
                            <div className="flex gap-1">
                              {kpi.is_proxy && <Badge variant="outline" className="text-[8px] h-3 bg-at-risk/10 text-at-risk">Proxy</Badge>}
                              <Badge variant="outline" className="text-[8px] h-3">{kpi.unit}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", progress.status === "on-track" ? "bg-on-track" : progress.status === "at-risk" ? "bg-at-risk" : "bg-off-track")}
                                style={{ width: `${progress.pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold">{progress.pct}%</span>
                          </div>
                          {longTermTarget && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">Target: {longTermTarget.target_value.toLocaleString()} {kpi.unit} by {longTermTarget.target_year}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
