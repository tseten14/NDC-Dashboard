/**
 * Panel: how precisely emissions are located.
 *
 * A power station's emissions are pinned to an exact point; farmland emissions
 * are spread across a wide area. This states which is which, so a map bubble is
 * not read as more precise than the data behind it.
 */
import { useQuery } from "@tanstack/react-query";
import { emissionsApi } from "@/lib/api";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Satellite, Loader2, AlertCircle, ExternalLink, Info } from "lucide-react";

const STALE_MS = 30 * 60 * 1000;

function titleize(slug: string): string {
  return slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function certaintyTone(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 75) return "text-on-track";
  if (pct >= 40) return "text-muted-foreground";
  return "text-off-track";
}

/**
 * Spatial-certainty panel: shows how much of a location's Climate TRACE
 * emissions are attributed to located sources (assets + mapped forestry,
 * buildings, agriculture, roads) versus distributed from the national total
 * via statistical proxies (the spatially-uncertain emissions). Most useful at
 * district level, where proxy distribution drives much of the figure.
 */
export function SpatialConfidencePanel() {
  const emissions = useEmissionsData();
  const isDistrict = emissions.isDistrictView;
  const districtName = emissions.districtName;
  const geoKey = isDistrict ? districtName ?? "national" : "national";

  const query = useQuery({
    queryKey: ["emissions", "spatial-confidence", geoKey],
    queryFn: () => emissionsApi.spatialConfidence(isDistrict && districtName ? { district: districtName } : undefined),
    staleTime: STALE_MS,
    retry: 1,
  });

  const geoLabel = isDistrict && districtName ? districtName : "Uganda (national)";
  const data = query.data;
  const certain = data?.certain_pct ?? null;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Satellite className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Spatial certainty</span>
        <Badge variant="outline" className="text-[10px] h-5 gap-1">
          {isDistrict ? <MapPin className="h-3 w-3" /> : null}
          {geoLabel}
        </Badge>
        {data?.year != null && <Badge variant="outline" className="text-[10px] h-5">{data.year}</Badge>}
      </div>

      {/* Plain explainer */}
      <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground/90 leading-relaxed">
          Climate TRACE pins some emissions to <span className="font-semibold">known sources</span> (power plants,
          factories, and mapped forestry, buildings, agriculture and roads). The rest is the national total{" "}
          <span className="font-semibold">distributed here using proxies</span> (population, night-lights, land use).
          The more that is located, the more spatially reliable the figure.
        </p>
      </div>

      {query.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Computing spatial certainty…
        </div>
      )}

      {query.isError && (
        <div className="flex items-center gap-2 text-xs text-off-track py-6 justify-center">
          <AlertCircle className="h-4 w-4" /> Could not load spatial certainty for {geoLabel}.
        </div>
      )}

      {data && (
        <>
          {/* Headline */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Located to known sources</p>
                <p className={cn("text-3xl font-bold tabular-nums", certaintyTone(certain))}>
                  {certain != null ? `${certain.toFixed(0)}%` : "—"}
                </p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <p><span className="text-foreground font-semibold tabular-nums">{data.located_mtco2e ?? "—"}</span> Mt located</p>
                <p><span className="text-foreground font-semibold tabular-nums">{data.distributed_mtco2e ?? "—"}</span> Mt distributed</p>
                <p className="text-[10px]">of {data.aggregate_mtco2e ?? "—"} Mt total</p>
              </div>
            </div>
            <Bar pct={certain} />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span className="text-on-track font-medium">Located ({data.located_source_count} sources · {data.located_aggregation_count} mapped areas)</span>
              <span className="text-muted-foreground font-medium">Proxy-distributed</span>
            </div>
            {data.truncated && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Note: this location has a very large number of sources; the located share is a lower bound (source list
                truncated). District figures are exact.
              </p>
            )}
          </div>

          {/* Per-sector */}
          {data.sectors.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">By sector</p>
              <div className="space-y-1.5">
                {data.sectors.map((s) => (
                  <div key={s.sector} className="rounded-md border border-border/60 bg-card p-2">
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="font-medium text-foreground">{titleize(s.sector)}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {s.total_mtco2e ?? "—"} Mt ·{" "}
                        <span className={certaintyTone(s.certain_pct)}>
                          {s.certain_pct != null ? `${s.certain_pct.toFixed(0)}% located` : "—"}
                        </span>
                      </span>
                    </div>
                    <Bar pct={s.certain_pct} thin />
                  </div>
                ))}
              </div>
            </div>
          )}

          <a
            href={data.methodology_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            Climate TRACE disaggregation methodology <ExternalLink className="h-3 w-3" />
          </a>
        </>
      )}
    </div>
  );
}

function Bar({ pct, thin }: { pct: number | null; thin?: boolean }) {
  const located = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-muted", thin ? "h-1.5" : "h-2.5")}>
      <div className="h-full rounded-full bg-on-track" style={{ width: `${located}%` }} />
    </div>
  );
}
