import { strategies, activities, kpis, progressRecords, getActor, roadmapPhases, raciData } from "@/data/uganda-strategy-data";
import { useAppContext } from "@/hooks/use-app-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function Overview() {
  const { activeStrategy, validationFilter } = useAppContext();

  const filteredActivities = activeStrategy === "all"
    ? activities
    : activities.filter(a => a.strategy_links.some(l => l.strategy_id === activeStrategy));

  const filteredProgress = validationFilter === "all"
    ? progressRecords
    : progressRecords.filter(p => p.validation_status === (validationFilter === "verified" ? "Verified" : "Preliminary"));

  const verifiedCount = progressRecords.filter(p => p.validation_status === "Verified").length;
  const totalKPIs = kpis.length;
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">Overview</h2>
        <p className="text-xs text-muted-foreground">High-level status across strategies. Showing {activeStrategy === "all" ? "all strategies" : strategies.find(s => s.id === activeStrategy)?.name}.</p>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active Strategies" value={String(strategies.filter(s => s.is_active).length)} />
          <StatCard label="Activities" value={String(filteredActivities.length)} />
          <StatCard label="KPIs Tracked" value={String(totalKPIs)} />
          <StatCard label="Verified Data Points" value={`${verifiedCount}/${progressRecords.length}`} />
        </div>

        {/* Strategy Alignment Heatmap */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Strategy Alignment Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Activity</th>
                    {strategies.filter(s => s.is_active).map(s => (
                      <th key={s.id} className="text-center py-1 px-2 font-semibold text-muted-foreground">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map(a => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-1.5 px-2 font-medium text-foreground">{a.title}</td>
                      {strategies.filter(s => s.is_active).map(s => (
                        <td key={s.id} className="text-center py-1.5 px-2">
                          {a.strategy_links.some(l => l.strategy_id === s.id)
                            ? <span className="text-on-track font-bold">✓</span>
                            : <span className="text-muted-foreground/30">–</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Funding Gap & Readiness */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Funding Gap & Readiness</h3>
            <div className="space-y-1.5">
              {filteredActivities.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-1 border-b border-border/30 last:border-0">
                  <span className="text-[10px] text-foreground font-medium">{a.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4">{a.budget_code_alignment}</Badge>
                    <ReadinessBadge level={a.investment_readiness_level} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Latest Validations */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Latest Validations</h3>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 px-1 font-semibold text-muted-foreground">KPI</th>
                  <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Value</th>
                  <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Updated By</th>
                  <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Period</th>
                </tr>
              </thead>
              <tbody>
                {filteredProgress.map(p => {
                  const kpi = kpis.find(k => k.id === p.kpi_id);
                  const actor = getActor(p.last_updated_by);
                  return (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-1 px-1 font-medium text-foreground">{kpi?.kpi_name ?? p.kpi_id}</td>
                      <td className="py-1 px-1">{p.value.toLocaleString()} {kpi?.unit}</td>
                      <td className="py-1 px-1"><ValidationBadge status={p.validation_status} /></td>
                      <td className="py-1 px-1 text-muted-foreground">{actor?.display_name ?? p.last_updated_by}</td>
                      <td className="py-1 px-1 text-muted-foreground">{p.period_start} – {p.period_end}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Roadmap */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Roadmap & Milestones</h3>
            <div className="space-y-3">
              {roadmapPhases.map((phase, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-foreground">{phase.phase}</span>
                    <Badge variant="outline" className="text-[9px] h-4">{phase.period}</Badge>
                  </div>
                  <ul className="space-y-0.5 ml-3">
                    {phase.milestones.map((m, j) => (
                      <li key={j} className="text-[10px] text-muted-foreground">• {m}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RACI */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Governance (RACI)</h3>
            <div className="space-y-1">
              {Object.entries(raciData).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-[10px] font-bold text-foreground capitalize w-24 shrink-0">{key}</span>
                  <span className="text-[10px] text-muted-foreground">{val}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-3 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </CardContent></Card>
  );
}

function ReadinessBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    NotReady: "bg-off-track/10 text-off-track border-off-track/30",
    Emerging: "bg-at-risk/10 text-at-risk border-at-risk/30",
    Pipeline: "bg-chart-4/10 text-chart-4 border-chart-4/30",
    Bankable: "bg-on-track/10 text-on-track border-on-track/30",
  };
  return <Badge variant="outline" className={cn("text-[9px] h-4", colors[level])}>{level}</Badge>;
}

function ValidationBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("text-[9px] h-4",
      status === "Verified" ? "bg-on-track/10 text-on-track border-on-track/30" : "bg-at-risk/10 text-at-risk border-at-risk/30"
    )}>{status}</Badge>
  );
}
