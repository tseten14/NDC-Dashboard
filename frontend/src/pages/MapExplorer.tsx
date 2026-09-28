/**
 * Screen: the emissions map.
 *
 * A 3D map of Uganda with a bubble at every emitting site Climate TRACE has
 * located — power stations, factories, roads, farmland — sized by how much it
 * emits and coloured by sector. Clicking a bubble gives that site's details.
 *
 * The year selector re-draws the map for a chosen year, which is how a change
 * over time becomes visible geographically rather than as a line on a chart.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { geoContains } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { emissionsApi, type MapSourcePoint } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CountUpNumber } from "@/components/dashboard/CountUpNumber";
import { EmissionsMap3D } from "@/components/map/EmissionsMap3D";
import { MAP_SECTOR_COLORS, MAP_SECTOR_FALLBACK } from "@/lib/visual-palette";
import {
  AlertCircle, Layers,
  TrendingUp, TrendingDown, Factory,
} from "lucide-react";
import ugandaGeo from "@/data/uganda-adm2.geo.json";

const GEO = ugandaGeo as unknown as FeatureCollection;
// Climate TRACE v7 (March 2026 dataset) is confirmed through 2025.
const YEARS = [2021, 2022, 2023, 2024, 2025];

const sectorColor = (s: string) => MAP_SECTOR_COLORS[s] ?? MAP_SECTOR_FALLBACK;
const bubbleKey = (p: MapSourcePoint, i: number) => `${p.id ?? "x"}-${i}`;

function titleize(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function fmtMt(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  if (Math.abs(v) >= 1) return `${v.toFixed(digits)} Mt`;
  if (Math.abs(v) >= 0.001) return `${(v * 1000).toFixed(1)} kt`;
  return `${(v * 1e6).toFixed(0)} t`;
}

function aggregateByDistrict(points: MapSourcePoint[]): Float64Array {
  const sums = new Float64Array(GEO.features.length);
  for (const p of points) {
    const idx = findDistrictIndex(p.lng, p.lat);
    if (idx >= 0) sums[idx] += p.mtco2e ?? 0;
  }
  return sums;
}

function findDistrictIndex(lng: number, lat: number): number {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return -1;
  for (let i = 0; i < GEO.features.length; i++) {
    if (geoContains(GEO.features[i], [lng, lat])) return i;
  }
  return -1;
}

export default function MapExplorer() {
  const [year, setYear] = useState<number>(2025);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [highlightedSector, setHighlightedSector] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<MapSourcePoint | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["emissions", "map", year],
    queryFn: () => emissionsApi.map(undefined, year),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const trendQueries = useQueries({
    queries: YEARS.map((y) => ({
      queryKey: ["emissions", "map", y],
      queryFn: () => emissionsApi.map(undefined, y),
      staleTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const data = query.data;

  const visiblePoints = useMemo(() => {
    if (!data) return [];
    return (data.points ?? [])
      .filter((p) => !hidden.has(p.sector))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .sort((a, b) => (a.mtco2e ?? 0) - (b.mtco2e ?? 0));
  }, [data, hidden]);

  const districtEmissions = useMemo(() => aggregateByDistrict(visiblePoints), [visiblePoints]);

  const hoveredPointAreaMt = useMemo(() => {
    if (!hoveredPoint) return null;
    const idx = findDistrictIndex(hoveredPoint.lng, hoveredPoint.lat);
    return idx >= 0 ? districtEmissions[idx] : null;
  }, [hoveredPoint, districtEmissions]);

  const maxPointMt = useMemo(
    () => visiblePoints.reduce((m, p) => Math.max(m, p.mtco2e ?? 0), 0),
    [visiblePoints],
  );

  const prevYearData = trendQueries.find((q) => q.data?.year === year - 1)?.data;
  const sectorChanges = useMemo(() => {
    if (!data || !prevYearData) return { up: [], down: [] };
    const prev = Object.fromEntries((prevYearData.sectors ?? []).map((s) => [s.sector, s.mtco2e]));
    const changes = (data.sectors ?? [])
      .map((s) => {
        const cur = s.mtco2e;
        const old = prev[s.sector];
        const pct = cur != null && old != null && old > 0 ? ((cur - old) / old) * 100 : null;
        return { sector: s.sector, label: titleize(s.sector), pct };
      })
      .filter((c) => c.pct != null && Math.abs(c.pct!) > 0.5)
      .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!));
    return {
      up: changes.filter((c) => (c.pct ?? 0) > 0).slice(0, 4),
      down: changes.filter((c) => (c.pct ?? 0) < 0).slice(0, 4),
    };
  }, [data, prevYearData]);

  const topSources = useMemo(
    () => [...visiblePoints].sort((a, b) => (b.mtco2e ?? 0) - (a.mtco2e ?? 0)).slice(0, 5),
    [visiblePoints],
  );

  const topSector = data?.sectors?.[0];
  const showShares = !!data && data.total_mtco2e != null && data.total_mtco2e > 0
    && data.sectors.every((sector) => sector.mtco2e != null && sector.mtco2e >= 0);
  const topSectorPct =
    showShares && data && topSector && data.total_mtco2e
      ? ((topSector.mtco2e ?? 0) / data.total_mtco2e) * 100
      : null;

  const toggleSector = (s: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const handleSectorHighlight = (s: string) =>
    setHighlightedSector((prev) => (prev === s ? null : s));

  const handlePointHover = (
    p: MapSourcePoint | null,
    _key: string | null,
    e?: globalThis.MouseEvent,
  ) => {
    setHoveredPoint(p);
    if (p && e && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  useEffect(() => {
    setHighlightedSector(null);
  }, [year]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-7xl p-4 pb-8 space-y-4">
        <div className="overflow-hidden rounded-sm border border-border">
          <div className="bg-card px-5 py-4 sm:py-5 text-foreground">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mb-1 text-2xl font-bold">Uganda emissions map</h1>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Geolocated emission sources · {year} · CO₂e 100-yr GWP · Climate TRACE
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap overflow-hidden rounded-sm border border-border" aria-label="Map year">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={cn(
                        "min-h-11 border-r border-border px-3 py-2 text-sm font-medium tabular-nums",
                        y === year
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground",
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border border-border bg-card">
            <CardContent className="p-4 relative">
              <p className="text-sm font-semibold text-muted-foreground">Net emissions in mapped records</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {query.isLoading || data?.total_mtco2e == null ? (
                  query.isLoading ? "…" : "Unavailable"
                ) : (
                  <>
                    <CountUpNumber value={data.total_mtco2e} format={(v) => fmtMt(v, 1)} durationMs={1000} />
                    <span className="text-sm font-medium text-muted-foreground ml-1">CO₂e</span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-4 relative">
              <p className="text-sm font-semibold text-muted-foreground">Tracked sources</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {query.isLoading ? "…" : data ? data.point_count.toLocaleString() : "Unavailable"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {data ? `${data.asset_count} individual assets` : ""}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-4 relative">
              <p className="text-sm font-semibold text-muted-foreground">Leading sector</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-foreground truncate">
                {topSector ? titleize(topSector.sector) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {topSectorPct != null ? `${topSectorPct.toFixed(1)}% of mapped total` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 3D satellite map — bubble size ∝ emissions */}
        <div className="mx-auto w-full max-w-6xl px-1">
          <Card className="overflow-hidden border-border/80  dash-card-hover">
            <CardContent className="bg-card p-3 sm:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                {/* Sectors — left gutter */}
                <aside className="shrink-0 lg:w-44 xl:w-48 order-2 lg:order-1">
                  <div className="rounded-sm border border-border bg-card px-3 py-2.5 lg:py-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">Sectors</p>
                    <ul className="space-y-0.5">
                      {(data?.sectors ?? []).map((s) => {
                        const pct = showShares && data?.total_mtco2e
                          ? (((s.mtco2e ?? 0) / data.total_mtco2e) * 100).toFixed(1)
                          : null;
                        const isActive = highlightedSector === s.sector;
                        const isHidden = hidden.has(s.sector);
                        return (
                          <li key={s.sector}>
                            <button
                              type="button"
                              onClick={() => handleSectorHighlight(s.sector)}
                              className={cn(
                                "map-legend-item flex min-h-9 w-full items-center gap-2 rounded-sm border border-transparent px-2 py-1 text-left text-sm text-foreground",
                                isActive && "is-active",
                                isHidden && "opacity-35",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full shrink-0 border border-foreground",
                                  isActive && "ring-current",
                                )}
                                style={{ background: sectorColor(s.sector), color: sectorColor(s.sector) }}
                              />
                              <span className="flex-1 min-w-0 leading-tight text-foreground">{titleize(s.sector)}</span>
                              {pct != null && (
                                <span className="tabular-nums text-muted-foreground shrink-0">{pct}%</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 border-t border-border pt-2 text-sm leading-snug text-muted-foreground">
                      Bubble size ∝ emissions · click a bubble for details · click a sector to highlight
                    </p>
                  </div>
                </aside>

                {/* Map — center */}
                <div
                  ref={wrapRef}
                  className="relative flex-1 min-w-0 order-1 lg:order-2 w-full max-w-[min(100%,560px)] lg:max-w-none mx-auto"
                >
                  <div className="relative w-full aspect-[4/3] min-h-[380px] max-h-[min(72vh,540px)] overflow-hidden rounded-sm border border-border">
                    {query.isLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-card text-base text-foreground">
                        Loading {year} sources…
                      </div>
                    )}
                    {query.isError && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 rounded-lg">
                        <span className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" /> Could not load map data
                        </span>
                        <Button variant="outline" size="sm" onClick={() => query.refetch()}>Retry</Button>
                      </div>
                    )}
                    <EmissionsMap3D
                      points={visiblePoints}
                      maxPointMt={maxPointMt}
                      sectorColor={sectorColor}
                      highlightedSector={highlightedSector}
                      pointKey={bubbleKey}
                      onPointHover={handlePointHover}
                      className="rounded-xl"
                    />
                    {hoveredPoint && (
                      <div
                        className="pointer-events-none absolute z-20 max-w-[260px] rounded-lg border border-border/80 bg-popover/95  px-3 py-2.5  dash-crossfade"
                        style={{
                          left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 400) - 270),
                          top: tip.y + 14,
                        }}
                      >
                        <div className="text-sm font-semibold leading-tight">{hoveredPoint.name ?? "Unnamed source"}</div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: sectorColor(hoveredPoint.sector) }} />
                          <span className="text-xs text-muted-foreground">{titleize(hoveredPoint.sector)}</span>
                          {hoveredPoint.is_asset && (
                            <Badge variant="secondary" className="text-[8px] h-4 px-1">Asset</Badge>
                          )}
                        </div>
                        <div className="mt-1.5 text-sm font-bold tabular-nums text-on-track">{fmtMt(hoveredPoint.mtco2e)} CO₂e</div>
                        {hoveredPointAreaMt != null && hoveredPointAreaMt > 0 && (
                          <p className="mt-1.5 text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
                            Area total:{" "}
                            <span className="font-semibold text-foreground tabular-nums">{fmtMt(hoveredPointAreaMt)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Year / total — right gutter */}
                <aside className="shrink-0 lg:w-36 xl:w-40 order-3 flex lg:flex-col lg:items-stretch lg:justify-start">
                  {data && !query.isLoading ? (() => {
                    const sectorRow = highlightedSector
                      ? data.sectors?.find((s) => s.sector === highlightedSector)
                      : null;
                    const shownValue = sectorRow ? sectorRow.mtco2e : data.total_mtco2e;
                    const sectorPct =
                      showShares && sectorRow && data.total_mtco2e
                        ? ((sectorRow.mtco2e ?? 0) / data.total_mtco2e) * 100
                        : null;
                    return (
                    <div className="rounded-sm border border-border bg-card px-3 py-2.5 text-left lg:text-right">
                      <p className="text-sm font-semibold text-muted-foreground">{year}</p>
                      <p className="text-2xl font-bold tabular-nums text-foreground leading-tight">
                        {shownValue == null ? "Unavailable" : <CountUpNumber
                          value={shownValue}
                          format={(v) => (v >= 1 ? v.toFixed(1) : v.toFixed(2))}
                          durationMs={1100}
                        />}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sectorRow ? "Mt CO₂e — this sector" : "Mt CO₂e mapped"}
                      </p>
                      {sectorRow ? (
                        <p className="mt-2 border-t border-border pt-2 text-sm lg:text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: sectorColor(highlightedSector!) }} />
                            <span className="font-medium text-foreground">{titleize(highlightedSector!)}</span>
                          </span>
                          {sectorPct != null && (
                            <span className="block text-muted-foreground">{sectorPct.toFixed(1)}% of mapped total</span>
                          )}
                        </p>
                      ) : null}
                    </div>
                    );
                  })() : (
                    <div className="rounded-sm border border-dashed border-border px-3 py-4 text-sm text-muted-foreground text-center lg:text-right">
                      Totals load with map data
                    </div>
                  )}
                </aside>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/80 ">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2">Where emissions are changing</h3>
                <p className="text-[10px] text-muted-foreground mb-2">Year-over-year by sector ({year - 1} → {year})</p>
                {sectorChanges.up.length + sectorChanges.down.length > 0 ? (
                  <div className="space-y-2">
                    {sectorChanges.down.map((c) => (
                      <div key={c.sector} className="flex items-center gap-2 text-[11px]">
                        <TrendingDown className="h-3.5 w-3.5 text-on-track shrink-0" />
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="font-semibold tabular-nums text-on-track">{c.pct!.toFixed(1)}%</span>
                      </div>
                    ))}
                    {sectorChanges.up.map((c) => (
                      <div key={c.sector} className="flex items-center gap-2 text-[11px]">
                        <TrendingUp className="h-3.5 w-3.5 text-off-track shrink-0" />
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="font-semibold tabular-nums text-off-track">+{c.pct!.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Not enough prior-year data to compare.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 ">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5 text-primary" />
                  Top emitting sources
                </h3>
                <ul className="space-y-2">
                  {topSources.map((s, i) => (
                    <li key={`${s.id}-${i}`} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground truncate leading-tight">{s.name ?? "Unnamed"}</p>
                        <p className="text-[9px] text-muted-foreground">{titleize(s.sector)}</p>
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-foreground shrink-0">{fmtMt(s.mtco2e)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
        </div>

        {/* Sector filter panel */}
        <Card className="border-border/80">
          <CardContent className="p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" /> Filter sectors
            </h3>
            <div className="flex flex-wrap gap-2">
              {(data?.sectors ?? []).map((s) => {
                const off = hidden.has(s.sector);
                const pct = showShares && data?.total_mtco2e ? ((s.mtco2e ?? 0) / data.total_mtco2e) * 100 : null;
                return (
                  <button
                    key={s.sector}
                    type="button"
                    onClick={() => toggleSector(s.sector)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]  ",
                      off ? "opacity-40 border-border bg-muted/50" : "border-transparent ",
                    )}
                    style={off ? undefined : { background: `${sectorColor(s.sector)}18`, borderColor: `${sectorColor(s.sector)}55` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: sectorColor(s.sector) }} />
                    {titleize(s.sector)}
                    <span className="text-muted-foreground tabular-nums">{pct == null ? fmtMt(s.mtco2e) : `${pct.toFixed(0)}%`}</span>
                  </button>
                );
              })}
            </div>
            {data?.truncated && (
              <Badge variant="outline" className="mt-2 text-[10px] border-at-risk/40 text-at-risk">
                Showing capped sample — full inventory has more sources
              </Badge>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              Mapped records include facilities and estimates for larger areas. This is not a complete national inventory.
              Negative values represent net removals. Mt means million tonnes; kt means thousand tonnes of CO₂-equivalent gases.
              {!!data?.missing_emissions && ` ${data.missing_emissions} records have missing estimates; their totals are unavailable.`}
              {!!data?.missing_coordinates && ` ${data.missing_coordinates} records without coordinates are excluded.`}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Satellite: Esri World Imagery · Terrain: Nextzen/AWS · Boundaries: geoBoundaries (CC BY 4.0) · Data: Climate TRACE (CC BY 4.0)
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
