import { useState } from "react";
import { activities, kpis, strategies, getActor, computeKPIProgress } from "@/data/uganda-strategy-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function InvestmentTemplates() {
  const [selectedActivity, setSelectedActivity] = useState(activities[0]?.id ?? "");
  const activity = activities.find(a => a.id === selectedActivity);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-4xl">
        <h2 className="text-lg font-bold text-foreground">Investment Templates</h2>
        <p className="text-xs text-muted-foreground">Generate a minimum viable investment memo for a selected activity.</p>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-muted-foreground">Activity:</span>
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger className="w-[300px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {activities.map(a => <SelectItem key={a.id} value={a.id}><span className="text-xs">{a.title}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {activity && (
          <Card className="ring-1 ring-accent">
            <CardContent className="p-4 space-y-3">
              <div className="text-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Investment Memo</h3>
                <p className="text-xs text-muted-foreground">{activity.title}</p>
              </div>

              {/* Alignment summary */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Strategy Alignment</h4>
                <div className="flex flex-wrap gap-1">
                  {activity.strategy_links.map(l => {
                    const s = strategies.find(st => st.id === l.strategy_id);
                    return (
                      <Badge key={l.strategy_id} variant="outline" className="text-[9px] h-5">
                        {s?.name}: {l.anchor_or_program_code}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* KPIs & targets */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">KPIs & Progress</h4>
                {activity.kpi_links.map(kpiId => {
                  const kpi = kpis.find(k => k.id === kpiId);
                  if (!kpi) return null;
                  const progress = computeKPIProgress(kpi);
                  return (
                    <div key={kpiId} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                      <div>
                        <span className="text-[10px] font-medium text-foreground">{kpi.kpi_name}</span>
                        {kpi.is_proxy && <span className="text-[8px] text-at-risk ml-1">(proxy)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{progress.value.toLocaleString()} / {progress.target.toLocaleString()} {kpi.unit}</span>
                        <Badge variant="outline" className={cn("text-[8px] h-3",
                          progress.status === "on-track" ? "bg-on-track/10 text-on-track" : progress.status === "at-risk" ? "bg-at-risk/10 text-at-risk" : "bg-off-track/10 text-off-track"
                        )}>{progress.pct}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Budget & readiness */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Budget Code</h4>
                  <p className="text-[10px] font-mono text-foreground">{activity.budget_code_alignment}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Investment Readiness</h4>
                  <ReadinessBadge level={activity.investment_readiness_level} />
                </div>
              </div>

              {/* Ownership */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Decision Owners & Validators</h4>
                <div className="space-y-1">
                  {[
                    { role: "Data Owner", actorId: activity.data_owner_id },
                    { role: "Validator", actorId: activity.validator_id },
                    { role: "Decision Owner", actorId: activity.decision_owner_id },
                  ].map(({ role, actorId }) => {
                    const actor = getActor(actorId);
                    return (
                      <div key={role} className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{role}</span>
                        <span className="font-medium text-foreground">{actor?.display_name ?? actorId} ({actor?.org_unit})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ministries & districts */}
              <div className="flex gap-3">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Ministries</h4>
                  <div className="flex gap-1">{activity.ministry_badges.map(m => <Badge key={m} variant="outline" className="text-[9px] h-4">{m}</Badge>)}</div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Districts</h4>
                  <div className="flex gap-1">{activity.district_tags.map(d => <Badge key={d} variant="outline" className="text-[9px] h-4">{d}</Badge>)}</div>
                </div>
              </div>

              <Button size="sm" className="w-full text-xs mt-3" onClick={() => toast.info("PDF/Word export coming soon — currently UI only")}>
                Export Investment Memo (PDF/Word)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

function ReadinessBadge({ level }: { level: string }) {
  const colors: Record<string, string> = { NotReady: "bg-off-track/10 text-off-track", Emerging: "bg-at-risk/10 text-at-risk", Pipeline: "bg-chart-4/10 text-chart-4", Bankable: "bg-on-track/10 text-on-track" };
  return <Badge variant="outline" className={cn("text-[9px] h-4", colors[level])}>{level}</Badge>;
}
