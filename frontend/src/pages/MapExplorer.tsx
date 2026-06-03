import { useMemo, useRef, useState, type MouseEvent } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { geoIdentity, geoPath, geoContains } from "d3-geo";
import type { FeatureCollection } from "geojson";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip,
} from "recharts";
import { emissionsApi, type MapSourcePoint } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Loader2, AlertCircle, Map as MapIcon, Building2, Layers,
  TrendingUp, TrendingDown, Factory, Sparkles,
} from "lucide-react";
import ugandaGeo from "@/data/uganda-adm2.geo.json";

const GEO = ugandaGeo as unknown as FeatureCollection;
const WIDTH = 1000;
const HEIGHT = 1000;
const YEARS = [2021, 2022, 2023, 2024];

/** Vivid sector palette — aligned with app chart accents */
const SECTOR_COLORS: Record<string, string> = {
  "forestry-and-land-use": "#16a34a",
  agriculture: "#eab308",
  transportation: "#0ea5e9",
  buildings: "#8b5cf6",
  waste: "#ea580c",
  power: "#ef4444",
  manufacturing: "#14b8a6",
  "fossil-fuel-operations": "#64748b",
  "mineral-extraction": "#b45309",
  "fluorinated-gases": "#ec4899",
};
const FALLBACK_COLOR = "#94a3b8";
const sectorColor = (s: string) => SECTOR_COLORS[s] ?? FALLBACK_COLOR;
const sectorGradId = (s: string) => `sg-${s.replace(/[^a-z0-9]/gi, "-")}`;

function titleize(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function fmtMt(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  if (v >= 1) return `${v.toFixed(digits)} Mt`;
  if (v >= 0.001) return `${(v * 1000).toFixed(1)} kt`;
  return `${(v * 1e6).toFixed(0)} t`;
}

function choroplethFill(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const h = 152;
  const s = 28 + clamped * 22;
  const l = 94 - clamped * 58;
  return `hsl(${h} ${s}% ${l}%)`;
}

function useProjection() {
  return useMemo(() => {
    const projection = geoIdentity()
      .reflectY(true)
      .fitExtent([[20, 20], [WIDTH - 20, HEIGHT - 20]], GEO);
    const pathGen = geoPath(projection);
    const districtPaths = GEO.features.map((f, idx) => ({
      d: pathGen(f) ?? "",
      key: idx,
      feature: f,
    }));
    return { projection, districtPaths };
  }, []);
}

function aggregateByDistrict(points: MapSourcePoint[]): Float64Array {
  const sums = new Float64Array(GEO.features.length);
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    for (let i = 0; i < GEO.features.length; i++) {
      if (geoContains(GEO.features[i], [p.lng, p.lat])) {
        sums[i] += p.mtco2e ?? 0;
        break;
      }
    }
  }
  return sums;
}

interface MapSvgProps {
  districtPaths: { d: string; key: number }[];
  districtEmissions: Float64Array;
  maxDistrictMt: number;
  points: MapSourcePoint[];
  maxPointMt: number;
  projection: ReturnType<typeof geoIdentity>;
  hoveredDistrict: number | null;
  onDistrictHover: (idx: number | null) => void;
  onPointHover: (p: MapSourcePoint | null, e?: MouseEvent) => void;
  variant: "main" | "mini";
  showBubbles?: boolean;
  className?: string;
}

function MapSvg({
  districtPaths, districtEmissions, maxDistrictMt, points, maxPointMt,
  projection, hoveredDistrict, onDistrictHover, onPointHover, variant, showBubbles = true, className,
}: MapSvgProps) {
  const isMain = variant === "main";
  const radius = (mt: number | null) => {
    const v = mt ?? 0;
    if (maxPointMt <= 0) return isMain ? 2.5 : 1.5;
    const scale = isMain ? 28 : 14;
    return Math.max(isMain ? 2 : 1.2, Math.sqrt(v / maxPointMt) * scale);
  };

  const sectorList = useMemo(
    () => [...new Set(points.map((p) => p.sector))],
    [points],
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("w-full h-full max-h-full", className)}
      role="img"
      aria-label="Uganda emissions map"
      onMouseLeave={() => {
        onDistrictHover(null);
        onPointHover(null);
      }}
    >
      <defs>
        <linearGradient id="map-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(150 25% 96%)" />
          <stop offset="100%" stopColor="hsl(152 20% 90%)" />
        </linearGradient>
        <filter id="bubble-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {sectorList.map((s) => (
          <radialGradient key={s} id={sectorGradId(s)} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={sectorColor(s)} stopOpacity="0.95" />
            <stop offset="100%" stopColor={sectorColor(s)} stopOpacity="0.35" />
          </radialGradient>
        ))}
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="url(#map-ocean)" rx={isMain ? 0 : 8} />

      <g>
        {districtPaths.map((p) => {
          const mt = districtEmissions[p.key] ?? 0;
          const t = maxDistrictMt > 0 ? mt / maxDistrictMt : 0;
          const active = hoveredDistrict === p.key;
          return (
            <path
              key={p.key}
              d={p.d}
              fill={choroplethFill(t)}
              stroke={active ? "hsl(152 34% 38%)" : "hsl(150 12% 78%)"}
              strokeWidth={active ? 1.4 : 0.5}
              className="transition-[fill,stroke] duration-150"
              onMouseEnter={() => onDistrictHover(p.key)}
            />
          );
        })}
      </g>

      {showBubbles && (
        <g filter={isMain ? "url(#bubble-glow)" : undefined}>
          {points.map((p, i) => {
            const xy = projection([p.lng, p.lat]);
            if (!xy) return null;
            const r = radius(p.mtco2e);
            return (
              <circle
                key={`${p.id}-${i}`}
                cx={xy[0]}
                cy={xy[1]}
                r={r}
                fill={`url(#${sectorGradId(p.sector)})`}
                stroke={sectorColor(p.sector)}
                strokeWidth={isMain ? 0.6 : 0.4}
                strokeOpacity={0.7}
                className="cursor-pointer"
                onMouseEnter={(e) => onPointHover(p, e)}
                onMouseMove={(e) => onPointHover(p, e)}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

export default function MapExplorer() {
  const [year, setYear] = useState<number>(2024);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [assetsOnly, setAssetsOnly] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<MapSourcePoint | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<number | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const { projection, districtPaths } = useProjection();

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
    return data.points
      .filter((p) => !hidden.has(p.sector))
      .filter((p) => (assetsOnly ? p.is_asset : true))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .sort((a, b) => (a.mtco2e ?? 0) - (b.mtco2e ?? 0));
  }, [data, hidden, assetsOnly]);

  const districtEmissions = useMemo(() => aggregateByDistrict(visiblePoints), [visiblePoints]);

  const maxDistrictMt = useMemo(
    () => districtEmissions.reduce((m, v) => Math.max(m, v), 0),
    [districtEmissions],
  );

  const maxPointMt = useMemo(
    () => visiblePoints.reduce((m, p) => Math.max(m, p.mtco2e ?? 0), 0),
    [visiblePoints],
  );

  const trendData = useMemo(
    () =>
      YEARS.map((y, i) => ({
        year: y,
        total: trendQueries[i]?.data?.total_mtco2e ?? null,
      })).filter((d) => d.total != null),
    [trendQueries],
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

  const handlePointHover = (p: MapSourcePoint | null, e?: MouseEvent) => {
    setHoveredPoint(p);
    if (p && e && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

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
                <label className="flex items-center gap-2 text-xs text-sidebar-foreground/80 cursor-pointer">
                  <Building2 className="h-3.5 w-3.5" />
                  Assets only
                  <Switch checked={assetsOnly} onCheckedChange={setAssetsOnly} aria-label="Asset-level only" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-on-track/12 via-card to-card overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-on-track/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total emissions</p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-on-track">
                {query.isLoading ? "…" : fmtMt(data?.total_mtco2e, 1)}
                <span className="text-sm font-medium text-muted-foreground ml-1">CO₂e</span>
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-500/10 via-card to-card overflow-hidden">
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

        {/* Main bubble map — side gutters for legend & summary (no overlap) */}
        <div className="mx-auto w-full max-w-6xl px-1">
          <Card className="overflow-hidden border-border/80 shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                {/* Sectors — left gutter */}
                <aside className="shrink-0 lg:w-44 xl:w-48 order-2 lg:order-1">
                  <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 lg:py-3">
                    <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Sectors</p>
                    <ul className="space-y-1">
                      {(data?.sectors ?? []).map((s) => {
                        const pct = data?.total_mtco2e
                          ? (((s.mtco2e ?? 0) / data.total_mtco2e) * 100).toFixed(1)
                          : null;
                        return (
                          <li key={s.sector}>
                            <button
                              type="button"
                              onClick={() => toggleSector(s.sector)}
                              className={cn(
                                "flex w-full items-center gap-2 text-left text-[10px] rounded-md px-1 py-0.5 transition-colors hover:bg-background/80",
                                hidden.has(s.sector) && "opacity-40",
                              )}
                            >
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: sectorColor(s.sector) }} />
                              <span className="flex-1 min-w-0 leading-tight text-foreground">{titleize(s.sector)}</span>
                              {pct != null && (
                                <span className="tabular-nums text-muted-foreground shrink-0">{pct}%</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[9px] text-muted-foreground mt-2 border-t border-border/60 pt-2">
                      Bubble size ∝ emissions · click to filter
                    </p>
                  </div>
                </aside>

                {/* Map — center */}
                <div
                  ref={wrapRef}
                  className="relative flex-1 min-w-0 order-1 lg:order-2 w-full max-w-[min(100%,560px)] lg:max-w-none mx-auto"
                >
                  <div className="relative w-full aspect-square max-h-[min(72vh,560px)]">
                    {query.isLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-sm text-sm text-muted-foreground rounded-lg">
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
                    <MapSvg
                      variant="main"
                      districtPaths={districtPaths}
                      districtEmissions={districtEmissions}
                      maxDistrictMt={maxDistrictMt}
                      points={visiblePoints}
                      maxPointMt={maxPointMt}
                      projection={projection}
                      hoveredDistrict={hoveredDistrict}
                      onDistrictHover={setHoveredDistrict}
                      onPointHover={handlePointHover}
                    />
                    {hoveredPoint && (
                      <div
                        className="pointer-events-none absolute z-20 max-w-[240px] rounded-lg border border-border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-xl"
                        style={{
                          left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 400) - 250),
                          top: tip.y + 14,
                        }}
                      >
                        <div className="text-sm font-semibold leading-tight">{hoveredPoint.name ?? "Unnamed source"}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: sectorColor(hoveredPoint.sector) }} />
                          <span className="text-xs text-muted-foreground">{titleize(hoveredPoint.sector)}</span>
                          {hoveredPoint.is_asset && (
                            <Badge variant="secondary" className="text-[8px] h-4 px-1">Asset</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-bold tabular-nums text-on-track">{fmtMt(hoveredPoint.mtco2e)} CO₂e</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Year / total — right gutter */}
                <aside className="shrink-0 lg:w-36 xl:w-40 order-3 flex lg:flex-col lg:items-stretch lg:justify-start">
                  {data && !query.isLoading ? (
                    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 text-left lg:text-right">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{year}</p>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums text-on-track leading-tight">{fmtMt(data.total_mtco2e, 1)}</p>
                      <p className="text-[9px] text-muted-foreground">Mt CO₂e mapped</p>
                      {hoveredDistrict != null && (
                        <p className="mt-2 pt-2 border-t border-border/60 text-[10px] text-foreground lg:text-right">
                          <span className="text-muted-foreground">Area: </span>
                          <span className="font-semibold tabular-nums">{fmtMt(districtEmissions[hoveredDistrict])}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-[10px] text-muted-foreground text-center lg:text-right">
                      Totals load with map data
                    </div>
                  )}
                </aside>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: trend + insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Mapped emissions over time
              </h3>
              <div className="h-[180px]">
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(152 34% 44%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(152 34% 44%)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => `${v}`} />
                      <LineTooltip
                        formatter={(v: number) => [`${fmtMt(v)} CO₂e`, "Total"]}
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(152 34% 38%)"
                        strokeWidth={2.5}
                        fill="url(#trend-fill)"
                        dot={{ r: 4, fill: "hsl(152 34% 38%)", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading trend…</div>
                )}
              </div>
            </CardContent>
          </Card>

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
              Basemap: geoBoundaries (CC BY 4.0) · Data: Climate TRACE (CC BY 4.0)
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
