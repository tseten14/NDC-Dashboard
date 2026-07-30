/**
 * Screen: scenario projections.
 *
 * Project emissions forward under different assumptions and compare the result
 * against the baseline, to see which drivers actually move the outcome.
 */
import { useState } from "react";
import { projections, kpis, generateProjectionSeries, strategies } from "@/data/uganda-strategy-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function Projections() {
  const [selectedProjection, setSelectedProjection] = useState(projections[0]?.id ?? "");
  const projection = projections.find(p => p.id === selectedProjection);

  const driverKPIs = projection
    ? projection.drivers.map(d => kpis.find(k => k.id === d.kpi_id)).filter(Boolean) as typeof kpis
    : [];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">Projections</h2>
        <p className="text-xs text-muted-foreground">Growth path slider & what-if scenarios.</p>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-muted-foreground">Scenario:</span>
          <Select value={selectedProjection} onValueChange={setSelectedProjection}>
            <SelectTrigger className="w-[220px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {projections.map(p => <SelectItem key={p.id} value={p.id}><span className="text-xs">{p.name}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {projection && (
          <>
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-bold text-foreground mb-1">{projection.name}</h3>
                <p className="text-[10px] text-muted-foreground">{projection.assumptions_note}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px] h-4">{projection.start_year}–{projection.end_year}</Badge>
                  {projection.linked_strategies.map(sid => {
                    const s = strategies.find(st => st.id === sid);
                    return s ? <Badge key={sid} variant="outline" className="text-[9px] h-4">{s.name}</Badge> : null;
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Drivers */}
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Scenario Drivers</h3>
                {projection.drivers.map(d => {
                  const kpi = kpis.find(k => k.id === d.kpi_id);
                  return (
                    <div key={d.kpi_id} className="py-1.5 border-b border-border/30 last:border-0 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-foreground">{kpi?.kpi_name ?? d.kpi_id}</span>
                      <Badge variant="outline" className="text-[9px] h-4 font-mono">{d.assumption_delta_or_path}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Projection table */}
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Projected Series</h3>
                {driverKPIs.map(kpi => {
                  const series = generateProjectionSeries(kpi, projection);
                  const sampledYears = series.filter((_, i) => i % 3 === 0 || i === series.length - 1);
                  return (
                    <div key={kpi.id} className="mb-3">
                      <p className="text-[10px] font-semibold text-foreground mb-1">{kpi.kpi_name} ({kpi.unit})</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[9px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-0.5 px-1 font-semibold text-muted-foreground">Year</th>
                              <th className="text-right py-0.5 px-1 font-semibold text-muted-foreground">Baseline</th>
                              <th className="text-right py-0.5 px-1 font-semibold text-muted-foreground">Scenario</th>
                              <th className="text-right py-0.5 px-1 font-semibold text-muted-foreground">Δ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sampledYears.map(row => (
                              <tr key={row.year} className="border-b border-border/20">
                                <td className="py-0.5 px-1 text-foreground">{row.year}</td>
                                <td className="py-0.5 px-1 text-right text-muted-foreground">{row.baseline.toLocaleString()}</td>
                                <td className="py-0.5 px-1 text-right font-medium text-foreground">{row.scenario.toLocaleString()}</td>
                                <td className={cn("py-0.5 px-1 text-right font-medium", row.scenario > row.baseline ? "text-on-track" : "text-off-track")}>
                                  {row.scenario > row.baseline ? "+" : ""}{(row.scenario - row.baseline).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Impact note */}
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Impact on Tenfold Timeline</h3>
                <p className="text-[10px] text-foreground">
                  {projection.id === "PROJ-NDC100"
                    ? "NDC100 scenario accelerates renewable energy KPI achievement by ~2 years and shortens export target timeline by an estimated 1.5 years vs baseline."
                    : "Baseline trajectory maintains current policy path. No acceleration effect on Tenfold or NDP IV timelines."}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
