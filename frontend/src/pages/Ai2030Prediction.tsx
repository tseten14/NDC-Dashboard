/**
 * Screen: projected emissions in 2030.
 *
 * Takes the observed history and projects it forward to 2030, then compares that
 * projection with what Uganda pledged, showing the shortfall per sector.
 *
 * These are indicative planning estimates produced by a statistical model, not
 * official figures — the screen says so, and shows an uncertainty range rather
 * than a single confident number.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";
import { emissionsApi, type SectorPrediction, type PredictionStatus } from "@/lib/api";
import { useAppContext } from "@/hooks/use-app-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown, CheckCircle2,
  AlertTriangle, XCircle, HelpCircle, MapPin,
} from "lucide-react";

const STATUS: Record<PredictionStatus, { label: string; blurb: string; cls: string; icon: typeof CheckCircle2 }> = {
  on_track:          { label: "On track",       blurb: "Likely to meet the 2030 climate target",         cls: "bg-on-track/10 text-on-track border-on-track/30",         icon: CheckCircle2 },
  at_risk:           { label: "At risk",         blurb: "May miss the 2030 target if trend continues",   cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",       icon: AlertTriangle },
  off_track:         { label: "Off track",       blurb: "Likely to overshoot the 2030 target",           cls: "bg-off-track/10 text-off-track border-off-track/30",       icon: XCircle },
  unknown:           { label: "No target set",   blurb: "No NDC commitment found for this sector",       cls: "bg-muted text-muted-foreground border-border",             icon: HelpCircle },
  insufficient_data: { label: "Not enough data", blurb: "Not enough historical data to make a forecast", cls: "bg-muted text-muted-foreground border-border",             icon: HelpCircle },
};

function fmt(v: number | null | undefined, nd = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: nd });
}

function buildChartData(p: SectorPrediction) {
  const rows: { year: number; observed: number | null; forecast: number | null; band: [number, number] | null }[] = [];
  const lastHist = p.history.length ? p.history[p.history.length - 1] : null;
  for (const h of p.history) {
    rows.push({ year: h.year, observed: h.value, forecast: null, band: null });
  }
  // Bridge the observed line into the forecast line at the last observed year.
  if (lastHist && rows.length) {
    rows[rows.length - 1].forecast = lastHist.value;
  }
  for (const f of p.forecast) {
    rows.push({
      year: f.year,
      observed: null,
      forecast: f.yhat,
      band: f.lower != null && f.upper != null ? [f.lower, f.upper] : null,
    });
  }
  return rows;
}

export default function Ai2030Prediction() {
  const { geographyLevel, selectedDistrictId } = useAppContext();
  const districtName = geographyLevel === "district" && selectedDistrictId ? selectedDistrictId : null;
  const geoKey = districtName ?? "national";

  const query = useQuery({
    queryKey: ["emissions", "predictions", geoKey],
    queryFn: () => emissionsApi.predictions(districtName ? { district: districtName } : undefined),
    staleTime: 1000 * 60 * 30,
  });

  const data = query.data;
  const entries = useMemo(
    () => Object.entries(data?.predictions ?? {}) as [string, SectorPrediction][],
    [data],
  );
  const trackable = useMemo(
    () => entries.filter(([, p]) => p.status !== "insufficient_data"),
    [entries],
  );

  const [focus, setFocus] = useState<string | null>(null);
  const focusKey = focus && data?.predictions?.[focus as keyof typeof data.predictions]
    ? focus
    : trackable[0]?.[0] ?? entries[0]?.[0] ?? null;
  const focusPred = focusKey ? data?.predictions?.[focusKey as keyof typeof data.predictions] : undefined;
  const chartData = focusPred ? buildChartData(focusPred) : [];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              2030 Emissions Forecast
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Based on real historical emissions data, this shows where each sector is heading by 2030 —
              and whether Uganda is on course to meet its national climate pledges (NDC 2022).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-6 gap-1">
              {districtName ? <MapPin className="h-3 w-3" /> : null}
              {districtName ? districtName : "National"}
            </Badge>
            {data?.engine && (
              <Badge variant="outline" className="text-[10px] h-6 font-mono">{data.engine}</Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              aria-label="Run prediction"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
              {query.isFetching ? "Running…" : "Run prediction"}
            </Button>
          </div>
        </div>

        {query.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><div className="h-24 animate-pulse rounded bg-muted/40" /></CardContent></Card>
            ))}
          </div>
        )}

        {query.isError && (
          <Card className="border-off-track/30">
            <CardContent className="p-4 text-xs text-off-track">
              Could not generate predictions. The forecast engine needs live Climate TRACE data — check the
              API is reachable, then try “Run prediction” again.
            </CardContent>
          </Card>
        )}

        {data && !query.isLoading && (
          <>
            {/* Summary strip */}
            <Card>
              <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Summary label="On track" sub="Likely to meet 2030 goal" value={data.summary.on_track} cls="text-on-track" />
                <Summary label="At risk" sub="Could miss if trend continues" value={data.summary.at_risk} cls="text-amber-600" />
                <Summary label="Off track" sub="Likely to miss 2030 goal" value={data.summary.off_track} cls="text-off-track" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall 2030 shortfall</p>
                  <p className={cn("text-lg font-bold", (data.summary.total_gap ?? 0) > 0 ? "text-off-track" : "text-on-track")}>
                    {(data.summary.total_gap ?? 0) > 0 ? "+" : ""}{fmt(data.summary.total_gap)} <span className="text-xs font-normal">Mt</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Forecast: {fmt(data.summary.total_predicted)} Mt · NDC target: {fmt(data.summary.total_target)} Mt
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Per-sector cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map(([key, p]) => {
                const s = STATUS[p.status];
                const Icon = s.icon;
                const overshoot = p.gap != null && p.gap > 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFocus(key)}
                    className={cn(
                      "text-left rounded-lg border bg-card p-3 transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40",
                      focusKey === key && "border-primary/60 ring-1 ring-primary/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-foreground">{p.label}</span>
                      <Badge variant="outline" className={cn("text-[9px] h-5 gap-1", s.cls)}>
                        <Icon className="h-3 w-3" />{s.label}
                      </Badge>
                    </div>
                    {p.status === "insufficient_data" ? (
                      <p className="text-[10px] text-muted-foreground">Not enough historical data to make a reliable forecast for this sector.</p>
                    ) : (
                      <>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Projected emissions by 2030</p>
                        <div className="flex items-end gap-1.5">
                          <span className="text-xl font-bold text-foreground tabular-nums">{fmt(p.predicted_value)}</span>
                          <span className="text-[10px] text-muted-foreground mb-0.5">million tonnes</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          Likely range: {fmt(p.predicted_lower)}–{fmt(p.predicted_upper)} Mt
                          {p.target_value != null && <> · NDC target: {fmt(p.target_value)} Mt</>}
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          {overshoot ? <TrendingUp className="h-3 w-3 text-off-track shrink-0" /> : <TrendingDown className="h-3 w-3 text-on-track shrink-0" />}
                          <span className={cn("text-[11px] font-semibold", overshoot ? "text-off-track" : "text-on-track")}>
                            {fmt(Math.abs(p.gap ?? 0))} Mt {overshoot ? "above" : "below"} target
                          </span>
                          {p.gap_pct != null && (
                            <span className="text-[10px] text-muted-foreground">({overshoot ? "+" : ""}{fmt(p.gap_pct)}%)</span>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{STATUS[p.status].blurb}</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Focus chart */}
            {focusPred && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Where is this sector heading?
                      </h3>
                      <p className="text-[9px] text-muted-foreground">Solid line = measured · Dashed = forecast · Shaded = 95% likely range</p>
                    </div>
                    <Select value={focusKey ?? undefined} onValueChange={setFocus}>
                      <SelectTrigger className="w-[180px] h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {entries.map(([key, p]) => (
                          <SelectItem key={key} value={key}><span className="text-xs">{p.label}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        label={{ value: focusPred.unit, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                      />
                      <RTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }}
                        formatter={(value: unknown, name: string) => {
                          if (Array.isArray(value)) return [`${fmt(value[0])}–${fmt(value[1])} Mt`, "Likely range"];
                          if (name === "observed") return [`${fmt(value as number, 2)} Mt`, "Measured emissions"];
                          if (name === "forecast") return [`${fmt(value as number, 2)} Mt`, "Forecast"];
                          return [fmt(value as number, 2), name];
                        }}
                      />
                      <Area dataKey="band" name="95% interval" stroke="none" fill="hsl(var(--chart-1))" fillOpacity={0.15} connectNulls isAnimationActive={false} />
                      <Line dataKey="observed" name="Observed (Climate TRACE)" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                      <Line dataKey="forecast" name="Forecast" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                      {focusPred.target_value != null && (
                        <ReferenceLine y={focusPred.target_value} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" label={{ value: `NDC target ${fmt(focusPred.target_value)}`, fontSize: 9, fill: "hsl(var(--chart-2))", position: "insideTopRight" }} />
                      )}
                      {focusPred.predicted_value != null && (
                        <ReferenceDot x={data.target_year} y={focusPred.predicted_value} r={4} fill="hsl(var(--chart-1))" stroke="hsl(var(--card))" />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Measured emissions from {focusPred.history[0]?.year ?? "—"} to {focusPred.history[focusPred.history.length - 1]?.year ?? "—"} (Climate TRACE satellite data).
                    The dashed line shows where emissions are heading if recent trends continue; the shaded area shows the range of likely outcomes.
                    {focusPred.bau_2030 != null && ` Without new policies, emissions in this sector are expected to reach about ${fmt(focusPred.bau_2030)} Mt by 2030 — Uganda's NDC target sits ${focusPred.reduction_below_bau_pct ?? "—"}% below that level.`}
                  </p>
                </CardContent>
              </Card>
            )}

            <p className="text-[10px] text-muted-foreground">
              Forecasts are based on historical trends in Climate TRACE satellite data ({data.observed_from}–{data.observed_to}) and do not account for new policies not yet reflected in emissions. This is a planning tool, not an official government projection.
            </p>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function Summary({ label, sub, value, cls }: { label: string; sub: string; value: number; cls: string }) {
  return (
    <div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", cls)}>{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", cls)}>{value} <span className="text-xs font-normal text-muted-foreground">sector{value !== 1 ? "s" : ""}</span></p>
      <p className="text-[9px] text-muted-foreground leading-relaxed">{sub}</p>
    </div>
  );
}
