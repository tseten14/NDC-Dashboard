/**
 * Screen: performance measures and stand-ins.
 *
 * Some things cannot be measured directly, so a proxy is used instead. This
 * lists both, shows the formula behind each, and names which strategies rely on
 * it — making the substitution explicit rather than hidden.
 */
import { kpis, strategies, dataSources, getActor, getDataSource, computeKPIProgress } from "@/data/uganda-strategy-data";
import { useAppContext } from "@/hooks/use-app-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function KPIsProxies() {
  const { activeStrategy } = useAppContext();
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  const filteredKPIs = activeStrategy === "all"
    ? kpis
    : kpis.filter(k => k.targets.some(t => t.strategy_id === activeStrategy));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">KPIs & Proxy Indicators</h2>
        <p className="text-xs text-muted-foreground">Catalog of indicators and proxy formulas. Click to see detail.</p>

        <Card>
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Category</th>
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Unit</th>
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Proxy</th>
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Formula</th>
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Progress</th>
                    <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Strategies</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKPIs.map(kpi => {
                    const progress = computeKPIProgress(kpi);
                    const source = getDataSource(kpi.data_source_id);
                    return (
                      <tr key={kpi.id} className={cn("border-b border-border/30 cursor-pointer hover:bg-muted/30", selectedKPI === kpi.id && "bg-accent/10")}
                        onClick={() => setSelectedKPI(selectedKPI === kpi.id ? null : kpi.id)}>
                        <td className="py-1.5 px-1 font-medium text-foreground">{kpi.kpi_name}</td>
                        <td className="py-1.5 px-1"><Badge variant="outline" className="text-[8px] h-3">{kpi.category}</Badge></td>
                        <td className="py-1.5 px-1 text-muted-foreground">{kpi.unit}</td>
                        <td className="py-1.5 px-1">{kpi.is_proxy ? <Badge variant="outline" className="text-[8px] h-3 bg-at-risk/10 text-at-risk">Yes</Badge> : "–"}</td>
                        <td className="py-1.5 px-1"><code className="font-mono text-[9px] bg-muted px-1 rounded">{kpi.formula}</code></td>
                        <td className="py-1.5 px-1">
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", progress.status === "on-track" ? "bg-on-track" : progress.status === "at-risk" ? "bg-at-risk" : "bg-off-track")}
                                style={{ width: `${progress.pct}%` }} />
                            </div>
                            <span className="text-[9px] font-bold">{progress.pct}%</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-1">
                          <div className="flex gap-0.5 flex-wrap">{kpi.targets.map(t => {
                            const strat = strategies.find(s => s.id === t.strategy_id);
                            return <Badge key={t.strategy_id} variant="outline" className="text-[8px] h-3">{strat?.name ?? t.strategy_id}</Badge>;
                          })}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selectedKPI && (() => {
          const kpi = kpis.find(k => k.id === selectedKPI);
          if (!kpi) return null;
          const source = getDataSource(kpi.data_source_id);
          const sourceContact = source ? getActor(source.contact_actor_id) : null;
          return (
            <Card className="ring-1 ring-accent">
              <CardContent className="p-3 space-y-2">
                <h3 className="text-xs font-bold text-foreground">{kpi.kpi_name} — Detail</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{kpi.category}</span></div>
                  <div><span className="text-muted-foreground">Unit:</span> <span className="font-medium text-foreground">{kpi.unit}</span></div>
                  <div><span className="text-muted-foreground">Frequency:</span> <span className="font-medium text-foreground">{kpi.frequency}</span></div>
                  <div><span className="text-muted-foreground">Is Proxy:</span> <span className="font-medium text-foreground">{kpi.is_proxy ? "Yes" : "No"}</span></div>
                </div>
                <div className="text-[10px]"><span className="text-muted-foreground">Formula:</span> <code className="font-mono bg-muted px-1 rounded">{kpi.formula}</code></div>
                <div className="text-[10px]"><span className="text-muted-foreground">Inputs:</span> {kpi.inputs.join(", ")}</div>
                {kpi.calculation_note && <div className="text-[10px]"><span className="text-muted-foreground">Calculation:</span> {kpi.calculation_note}</div>}
                {kpi.uncertainty_note && <div className="text-[10px] text-at-risk">⚠ Uncertainty: {kpi.uncertainty_note}</div>}
                {source && <div className="text-[10px]"><span className="text-muted-foreground">Data Source:</span> {source.name} ({source.owner_org}) — {source.access_method} / {source.format}</div>}
                {sourceContact && <div className="text-[10px]"><span className="text-muted-foreground">Contact:</span> {sourceContact.display_name} ({sourceContact.org_unit})</div>}

                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2">Targets per Strategy</h4>
                {kpi.targets.map(t => {
                  const strat = strategies.find(s => s.id === t.strategy_id);
                  return (
                    <div key={t.strategy_id} className="text-[10px] flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] h-3">{strat?.name}</Badge>
                      <span className="text-foreground font-medium">{t.target_value.toLocaleString()} {kpi.unit}</span>
                      <span className="text-muted-foreground">by {t.target_year}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </ScrollArea>
  );
}
