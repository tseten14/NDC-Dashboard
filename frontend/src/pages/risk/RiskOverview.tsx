// Executive overview: top risk signals, hotspots by district, what-this-means panels.
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useTopHotspots, useHazardLayers, useAdaptationOptions, riskColor } from "@/hooks/use-risk-data";
import { AlertCircle, ArrowRight, Sparkles, Target } from "lucide-react";

function RiskError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-[11px]">Failed to load risk data: {message}</span>
      </CardContent>
    </Card>
  );
}

export default function RiskOverview() {
  const { hotspots, loading: hotspotsLoading, error: hotspotsError } = useTopHotspots(5);
  const { data: hazards, loading: hazardsLoading, error: hazardsError } = useHazardLayers();
  const { data: options, loading: optionsLoading, error: optionsError } = useAdaptationOptions();

  return (
    <div className="space-y-3">
      {/* Top risk signals */}
      <section>
        <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Top 5 national risk signals
        </h2>
        {hotspotsError ? (
          <RiskError message={hotspotsError.message} />
        ) : hotspotsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {hotspots.length === 0 && (
              <Card className="md:col-span-5">
                <CardContent className="p-3 text-[11px] text-muted-foreground">
                  No risk cells loaded yet.
                </CardContent>
              </Card>
            )}
            {hotspots.map(({ cell, district, hazard }) => (
              <Card key={cell.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {hazard?.hazard_type || "—"}
                    </span>
                    <span
                      className="inline-block h-3 w-3 rounded-sm border border-border"
                      style={{ background: riskColor(cell.intensity_score_0_100) }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{district?.name || cell.district_id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Score <strong className="text-foreground">{cell.intensity_score_0_100}</strong> · {cell.risk_level}
                  </p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px]">{cell.data_status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Hazard summary */}
      <section>
        <h2 className="text-xs font-semibold text-foreground mb-2">Hazards in registry</h2>
        {hazardsError ? (
          <RiskError message={hazardsError.message} />
        ) : hazardsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-1 pt-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {hazards.map(h => (
              <Card key={h.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{h.hazard_type}</p>
                    <Badge variant="outline" className="text-[9px]">{h.acute_or_chronic}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{h.name}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge variant="outline" className="text-[9px]">{h.data_status}</Badge>
                    <Badge variant="outline" className="text-[9px]">{h.scenario_name}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* What this means for delivery */}
      <section>
        <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" /> What this means for delivery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground">NDC adaptation targets</p>
              <p className="text-[11px] text-muted-foreground">
                Hotspot scores feed directly into NDC adaptation target tracking. Use the screening tab to
                check whether activities mapped to a target are exposed to the surfaced hazards.
              </p>
              <Button asChild size="sm" variant="outline" className="h-6 text-[10px] mt-1">
                <Link to="/risk/screening">Open screening <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground">Development outcomes (NDP IV / Tenfold)</p>
              <p className="text-[11px] text-muted-foreground">
                Climate hazards directly affect delivery of jobs, infrastructure, agriculture and energy
                programmes. Hotspot districts should be cross-checked against ministry portfolios.
              </p>
              <Button asChild size="sm" variant="outline" className="h-6 text-[10px] mt-1">
                <Link to="/risk/map">Open risk map <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Priority adaptation options */}
      <section>
        <h2 className="text-xs font-semibold text-foreground mb-2">Priority adaptation options</h2>
        {optionsError ? (
          <RiskError message={optionsError.message} />
        ) : optionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-1 pt-1">
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {options.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">{o.name}</p>
                  <p className="text-[10px] text-muted-foreground">{o.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {o.hazard_types.map(t => (
                      <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Risk reduction: <span className="text-foreground">{o.expected_risk_reduction}</span>
                  </p>
                  {o.cost_range_min_usd && (
                    <p className="text-[10px] text-muted-foreground">
                      Cost: ${(o.cost_range_min_usd / 1000).toFixed(0)}k – ${(o.cost_range_max_usd! / 1000000).toFixed(1)}M
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
