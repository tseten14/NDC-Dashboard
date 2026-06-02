import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { emissionsApi, type EmissionsSource } from "@/lib/api";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MapPin, Factory, Layers, Loader2, AlertCircle, Download, Plus } from "lucide-react";
import { toast } from "sonner";

const STALE_MS = 15 * 60 * 1000;
const PAGE_SIZE = 25;
const MAX_LIMIT = 200;

function titleize(slug: string | null): string {
  if (!slug) return "—";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toCsv(rows: EmissionsSource[], geoLabel: string, year: number | undefined): string {
  const header = ["rank", "name", "sector", "subsector", "type", "emissions_mtco2e", "emissions_tco2e", "lat", "lng"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((s, i) =>
    [
      i + 1,
      s.name ?? "",
      s.sector ?? "",
      s.subsector ?? "",
      s.is_asset ? "asset" : "aggregation",
      s.emissions_mtco2e ?? "",
      s.emissions_tco2e ?? "",
      s.centroid?.lat ?? "",
      s.centroid?.lng ?? "",
    ]
      .map(escape)
      .join(","),
  );
  return [`# Climate TRACE top emitting sources — ${geoLabel}${year ? ` (${year})` : ""}`, header.join(","), ...lines].join("\n");
}

/**
 * Asset / source-level drill-down for the active geography, backed by the
 * Climate TRACE /v7/sources endpoint. Lists the highest-emitting individual
 * assets and GADM aggregations (forestry, buildings, agriculture, roads), with
 * a sector filter, load-more pagination, and CSV export.
 */
export function TopEmittingSources() {
  const emissions = useEmissionsData();
  const isDistrict = emissions.isDistrictView;
  const districtName = emissions.districtName;
  const geoKey = isDistrict ? districtName ?? "national" : "national";

  const [limit, setLimit] = useState(PAGE_SIZE);
  const [sectorFilter, setSectorFilter] = useState<string>("all");

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
  const allSources = useMemo(() => query.data?.sources ?? [], [query.data]);

  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSources) if (s.sector) set.add(s.sector);
    return Array.from(set).sort();
  }, [allSources]);

  const sources = useMemo(
    () => (sectorFilter === "all" ? allSources : allSources.filter((s) => s.sector === sectorFilter)),
    [allSources, sectorFilter],
  );

  const canLoadMore = allSources.length >= limit && limit < MAX_LIMIT;

  const handleCsv = () => {
    if (sources.length === 0) return;
    const csv = toCsv(sources, geoLabel, query.data?.year);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top_emitting_sources_${geoKey.replace(/\s+/g, "_")}_${query.data?.year ?? "latest"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sources.length} sources (${geoLabel})`);
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading top emitting sources…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-xs">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" /> Could not load sources from Climate TRACE.
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1 text-[10px] h-5">
          <MapPin className="h-2.5 w-2.5" />
          {geoLabel}
        </Badge>
        {query.data?.year != null && (
          <Badge variant="outline" className="text-[10px] h-5">
            {query.data.year}
          </Badge>
        )}
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[160px] h-7 text-xs" aria-label="Filter by sector">
            <SelectValue placeholder="All sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="text-xs">All sectors</span>
            </SelectItem>
            {sectorOptions.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="text-xs">{titleize(s)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 ml-auto"
          onClick={handleCsv}
          disabled={sources.length === 0}
        >
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {sources.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            No source-level rows for this geography{sectorFilter !== "all" ? " and sector filter" : ""}.
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

        {canLoadMore && (
          <div className="p-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setLimit((l) => Math.min(l + PAGE_SIZE, MAX_LIMIT))}
              disabled={query.isFetching}
            >
              {query.isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Load more
            </Button>
          </div>
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
