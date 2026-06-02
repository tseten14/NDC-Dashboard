import { useQuery } from "@tanstack/react-query";
import { emissionsApi } from "@/lib/api";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Factory, Layers, Loader2, AlertCircle } from "lucide-react";

const STALE_MS = 15 * 60 * 1000;

function titleize(slug: string | null): string {
  if (!slug) return "—";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Asset / source-level drill-down for the active geography, backed by the
 * Climate TRACE /v7/sources endpoint. Lists the highest-emitting individual
 * assets and GADM aggregations (forestry, buildings, agriculture, roads).
 */
export function TopEmittingSources({ limit = 15 }: { limit?: number }) {
  const emissions = useEmissionsData();
  const isDistrict = emissions.isDistrictView;
  const districtName = emissions.districtName;
  const geoKey = isDistrict ? districtName ?? "national" : "national";

  const query = useQuery({
    queryKey: ["emissions", "sources", geoKey, limit],
    queryFn: () =>
      emissionsApi.sources(
        isDistrict && districtName ? { district: districtName } : undefined,
        { limit },
      ),
    staleTime: STALE_MS,
    retry: 1,
  });

  const geoLabel = isDistrict && districtName ? districtName : "Uganda (national)";

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading top emitting sources…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs text-destructive">
        <AlertCircle className="h-4 w-4" /> Could not load sources from Climate TRACE.
      </div>
    );
  }

  const data = query.data;
  const sources = data?.sources ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1 text-[10px] h-5">
          <MapPin className="h-2.5 w-2.5" />
          {geoLabel}
        </Badge>
        {data?.year != null && (
          <Badge variant="outline" className="text-[10px] h-5">
            {data.year}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          Source: Climate TRACE · top {sources.length} by emissions
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {sources.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            No source-level rows returned for this geography and year.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">#</th>
                <th className="px-3 py-1.5 font-medium">Source</th>
                <th className="px-3 py-1.5 font-medium">Sector / Subsector</th>
                <th className="px-3 py-1.5 font-medium">Type</th>
                <th className="px-3 py-1.5 font-medium text-right">MtCO2e</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={`${s.id ?? i}-${i}`} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium">{s.name ?? "Unnamed source"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {titleize(s.sector)}
                    {s.subsector ? <span className="opacity-70"> · {titleize(s.subsector)}</span> : null}
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 text-[10px] h-5",
                        s.is_asset ? "border-primary/40 text-primary" : "text-muted-foreground",
                      )}
                    >
                      {s.is_asset ? <Factory className="h-2.5 w-2.5" /> : <Layers className="h-2.5 w-2.5" />}
                      {s.is_asset ? "Asset" : "Aggregation"}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {s.emissions_mtco2e != null ? s.emissions_mtco2e.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="shrink-0 px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
        Rows mix individual assets and GADM aggregations (forestry, buildings, agriculture, roads). These
        located sources do not sum to the dashboard total: spatially-uncertain emissions are included in the
        aggregate total but not attributed to individual rows. Data: Climate TRACE, CC BY 4.0.
      </div>
    </div>
  );
}
