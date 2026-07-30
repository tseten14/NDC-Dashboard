/**
 * Screen: National Development Plan IV alignment.
 *
 * Uganda's climate commitments sit inside its wider development plan. This shows
 * which NDP IV targets each climate activity supports, so the two are planned
 * together rather than separately.
 */
import { programmes, activities, kpis, computeKPIProgress, getActor } from "@/data/uganda-strategy-data";
import { useAppContext } from "@/hooks/use-app-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function NDPIVLayer() {
  const { districtFilter } = useAppContext();
  const [expandedProg, setExpandedProg] = useState<string | null>(null);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">NDP IV — 18 Programmes</h2>
        <p className="text-xs text-muted-foreground">Map activities to programme groups. {districtFilter ? `Filtered: ${districtFilter}` : "National view."}</p>

        <div className="space-y-2">
          {programmes.map(prog => {
            const linkedActivities = activities.filter(a =>
              a.strategy_links.some(l => l.strategy_id === "STRAT-NDPIV" && l.anchor_or_program_code === prog.program_code)
            );
            const linkedKPIs = prog.kpi_refs.map(id => kpis.find(k => k.id === id)).filter(Boolean) as typeof kpis;
            const isExpanded = expandedProg === prog.id;

            return (
              <Card key={prog.id} className={cn("transition-all", isExpanded && "ring-1 ring-accent")}>
                <CardContent className="p-3">
                  <button className="w-full text-left" onClick={() => setExpandedProg(isExpanded ? null : prog.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] h-4 font-mono">{prog.program_code}</Badge>
                          <h4 className="text-xs font-bold text-foreground">{prog.program_name}</h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{prog.mission}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-[9px] h-4">{prog.lead_ministry}</Badge>
                        <span className="text-[10px] text-muted-foreground">{isExpanded ? "▼" : "▶"}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      {/* Core targets */}
                      {prog.core_targets && prog.core_targets.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Core Targets</h5>
                          <ul className="space-y-0.5">
                            {prog.core_targets.map((t, i) => (
                              <li key={i} className="text-[10px] text-foreground">• {t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Indicators */}
                      {prog.indicators && prog.indicators.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Indicators</h5>
                          <div className="flex flex-wrap gap-1">
                            {prog.indicators.map((ind, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] h-4">{ind}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked KPIs */}
                      {linkedKPIs.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Linked KPIs</h5>
                          {linkedKPIs.map(kpi => {
                            const progress = computeKPIProgress(kpi);
                            return (
                              <div key={kpi.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-[10px] font-medium text-foreground w-32 shrink-0">{kpi.kpi_name}</span>
                                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", progress.status === "on-track" ? "bg-on-track" : progress.status === "at-risk" ? "bg-at-risk" : "bg-off-track")}
                                    style={{ width: `${progress.pct}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-foreground w-10 text-right">{progress.pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Linked activities */}
                      {linkedActivities.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Linked Activities</h5>
                          {linkedActivities.map(a => (
                            <div key={a.id} className="py-1 border-b border-border/30 last:border-0">
                              <p className="text-[10px] font-medium text-foreground">{a.title}</p>
                              <p className="text-[9px] text-muted-foreground">{a.description}</p>
                              <div className="flex gap-1 mt-0.5">
                                {a.ministry_badges.map(m => <Badge key={m} variant="outline" className="text-[8px] h-3">{m}</Badge>)}
                                {a.district_tags.map(d => <Badge key={d} variant="outline" className="text-[8px] h-3 bg-muted">{d}</Badge>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
