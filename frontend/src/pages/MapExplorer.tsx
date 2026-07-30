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
import {
  Loader2, AlertCircle, Map as MapIcon, Layers,
  TrendingUp, TrendingDown, Factory,
} from "lucide-react";
import ugandaGeo from "@/data/uganda-adm2.geo.json";

const GEO = ugandaGeo as unknown as FeatureCollection;
// Climate TRACE v7 (March 2026 dataset) is confirmed through 2025.
const YEARS = [2021, 2022, 2023, 2024, 2025];

/** Climate-tech sector palette — saturated for crisp map bubbles */
const SECTOR_COLORS: Record<string, string> = {
  "forestry-and-land-use": "#16a34a",
  agriculture: "#d97706",
  transportation: "#0284c7",
  buildings: "#7c3aed",
  waste: "#ea580c",
  power: "#ef4444",
  manufacturing: "#0d9488",
  "fossil-fuel-operations": "#64748b",
  "mineral-extraction": "#c2410c",
  "fluorinated-gases": "#db2777",
};
const FALLBACK_COLOR = "#94a3b8";
const sectorColor = (s: string) => SECTOR_COLORS[s] ?? FALLBACK_COLOR;
const bubbleKey = (p: MapSourcePoint, i: number) => `${p.id ?? "x"}-${i}`;

function titleize(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function fmtMt(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  if (v >= 1) return `${v.toFixed(digits)} Mt`;
  if (v >= 0.001) return `${(v * 1000).toFixed(1)} kt`;
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
    const prev = Object.fromEntries((prevYearData.sectors ?? []).map((s) => [s.sector, s.mtco2e ?? 0]));
    const changes = (data.sectors ?? [])
      .map((s) => {
        const cur = s.mtco2e ?? 0;
        const old = prev[s.sector] ?? 0;
        const pct = old > 0 ? ((cur - old) / old) * 100 : null;
        return { sector: s.sector, label: titleize(s.sector), pct, delta: cur - old };
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
  const topSectorPct =
    data && topSector && data.total_mtco2e
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
        {/* Dark header — Climate TRACE dashboard style, themed to app greens */}
        <div className="overflow-hidden rounded-xl border border-sidebar-border shadow-sm">
          <div className="bg-[hsl(var(--sidebar-background))] px-5 py-4 sm:py-5 text-sidebar-foreground">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapIcon className="h-5 w-5 text-sidebar-primary" />
                  <h1 className="font-brand text-xl sm:text-2xl font-bold tracking-tight">Uganda</h1>
                </div>
                <p className="text-xs sm:text-sm text-sidebar-foreground/70 max-w-xl">
                  Geolocated emission sources · {year} · CO₂e 100-yr GWP · Climate TRACE
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg overflow-hidden border border-sidebar-border/60">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium tabular-nums transition-colors",
                        y === year
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "bg-sidebar-accent/40 text-sidebar-foreground/80 hover:bg-sidebar-accent",
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
          <Card className="border-0 shadow-sm bg-gradient-to-br from-on-track/12 via-card to-card overflow-hidden dash-card-hover gradient-border-card">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-on-track/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total emissions</p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-on-track">
                {query.isLoading || data?.total_mtco2e == null ? (
                  "…"
                ) : (
                  <>
                    <CountUpNumber value={data.total_mtco2e} format={(v) => fmtMt(v, 1)} durationMs={1000} />
                    <span className="text-sm font-medium text-muted-foreground ml-1">CO₂e</span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-500/10 via-card to-card overflow-hidden dash-card-hover">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tracked sources</p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {query.isLoading ? "…" : (data?.point_count ?? 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {data?.asset_count ?? 0} individual assets
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-chart-2/12 via-card to-card overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-chart-2/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Leading sector</p>
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
          <Card className="overflow-hidden border-border/80 shadow-md dash-card-hover">
            <CardContent className="p-3 sm:p-4 map-globe-stage">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                {/* Sectors — left gutter */}
                <aside className="shrink-0 lg:w-44 xl:w-48 order-2 lg:order-1">
                  <div className="rounded-lg border border-white/10 bg-black/45 backdrop-blur-sm px-3 py-2.5 lg:py-3 shadow-sm">
                    <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-300 mb-2">Sectors</p>
                    <ul className="space-y-0.5">
                      {(data?.sectors ?? []).map((s) => {
                        const pct = data?.total_mtco2e
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
                                "map-legend-item flex w-full items-center gap-2 text-left text-[10px] rounded-md px-2 py-1 hover:bg-white/10",
                                isActive && "is-active",
                                isHidden && "opacity-35",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-[#0c1018] transition-shadow",
                                  isActive && "ring-current",
                                )}
                                style={{ background: sectorColor(s.sector), color: sectorColor(s.sector) }}
                              />
                              <span className="flex-1 min-w-0 leading-tight text-slate-100">{titleize(s.sector)}</span>
                              {pct != null && (
                                <span className="tabular-nums text-slate-400 shrink-0">{pct}%</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[9px] text-slate-400 mt-2 border-t border-white/10 pt-2 leading-snug">
                      Bubble size ∝ emissions · click a bubble for details · click a sector to highlight
                    </p>
                  </div>
                </aside>

                {/* Map — center */}
                <div
                  ref={wrapRef}
                  className="relative flex-1 min-w-0 order-1 lg:order-2 w-full max-w-[min(100%,560px)] lg:max-w-none mx-auto"
                >
                  <div className="relative w-full aspect-[4/3] min-h-[380px] max-h-[min(72vh,540px)] rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                    {query.isLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#060a12]/85 backdrop-blur-sm text-sm text-slate-300 rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading {year} sources…
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
                        className="pointer-events-none absolute z-20 max-w-[260px] rounded-lg border border-border/80 bg-popover/95 backdrop-blur-md px-3 py-2.5 shadow-xl dash-crossfade"
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
                    const shownValue = sectorRow ? sectorRow.mtco2e ?? 0 : data.total_mtco2e ?? 0;
                    const sectorPct =
                      sectorRow && data.total_mtco2e
                        ? ((sectorRow.mtco2e ?? 0) / data.total_mtco2e) * 100
                        : null;
                    return (
                    <div className="map-globe-summary rounded-lg border border-white/10 bg-black/45 px-3 py-2.5 text-left lg:text-right shadow-sm">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{year}</p>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-400 leading-tight">
                        <CountUpNumber
                          value={shownValue}
                          format={(v) => (v >= 1 ? v.toFixed(1) : v.toFixed(2))}
                          durationMs={1100}
                        />
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {sectorRow ? "Mt CO₂e — this sector" : "Mt CO₂e mapped"}
                      </p>
                      {sectorRow ? (
                        <p className="mt-2 pt-2 border-t border-white/10 text-[10px] lg:text-right dash-crossfade">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: sectorColor(highlightedSector!) }} />
                            <span className="font-medium text-slate-100">{titleize(highlightedSector!)}</span>
                          </span>
                          {sectorPct != null && (
                            <span className="block text-slate-400">{sectorPct.toFixed(1)}% of mapped total</span>
                          )}
                        </p>
                      ) : null}
                    </div>
                    );
                  })() : (
                    <div className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-[10px] text-slate-400 text-center lg:text-right">
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
            <Card className="border-border/80 shadow-sm">
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

            <Card className="border-border/80 shadow-sm">
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
                const pct = data?.total_mtco2e ? ((s.mtco2e ?? 0) / data.total_mtco2e) * 100 : 0;
                return (
                  <button
                    key={s.sector}
                    type="button"
                    onClick={() => toggleSector(s.sector)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all hover:shadow-sm",
                      off ? "opacity-40 border-border bg-muted/50" : "border-transparent shadow-sm",
                    )}
                    style={off ? undefined : { background: `${sectorColor(s.sector)}18`, borderColor: `${sectorColor(s.sector)}55` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: sectorColor(s.sector) }} />
                    {titleize(s.sector)}
                    <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
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
              Satellite: Esri World Imagery · Terrain: Nextzen/AWS · Boundaries: geoBoundaries (CC BY 4.0) · Data: Climate TRACE (CC BY 4.0)
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
