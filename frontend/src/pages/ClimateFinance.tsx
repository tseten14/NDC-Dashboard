import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { emissionsApi, cockpitApi, type SectorPrediction } from "@/lib/api";
import { mitigationOptions as localOptions, type MitigationOption } from "@/data/uganda-ndc-data";
import { activities, type InvestmentReadiness } from "@/data/uganda-strategy-data";
import { useAppContext } from "@/hooks/use-app-state";
import {
  DEFAULT_ASSUMPTIONS, ASSUMPTION_BOUNDS, type FinanceAssumptions,
  computeProjectEconomics, buildMaccCurve, investmentToCloseGap,
  formatUSD, formatPerT, formatMt, type ProjectEconomics,
} from "@/lib/climate-finance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Coins, Download, TrendingUp, MapPin, Leaf, Banknote, CheckCircle2, Info,
} from "lucide-react";

const READINESS_ORDER: InvestmentReadiness[] = ["NotReady", "Emerging", "Pipeline", "Bankable"];
const READINESS_LABEL: Record<InvestmentReadiness, string> = {
  NotReady: "Early idea",
  Emerging: "In development",
  Pipeline: "Investment-ready",
  Bankable: "Bankable",
};
const READINESS_STYLE: Record<InvestmentReadiness, string> = {
  NotReady: "bg-muted text-muted-foreground border-border",
  Emerging: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Pipeline: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  Bankable: "bg-on-track/10 text-on-track border-on-track/30",
};

export default function ClimateFinance() {
  const { geographyLevel, selectedDistrictId } = useAppContext();
  const districtName = geographyLevel === "district" && selectedDistrictId ? selectedDistrictId : null;
  const geoKey = districtName ?? "national";

  const [assumptions, setAssumptions] = useState<FinanceAssumptions>(DEFAULT_ASSUMPTIONS);
  const setA = (patch: Partial<FinanceAssumptions>) => setAssumptions((a) => ({ ...a, ...patch }));

  const predQuery = useQuery({
    queryKey: ["emissions", "predictions", geoKey],
    queryFn: () => emissionsApi.predictions(districtName ? { district: districtName } : undefined),
    staleTime: 1000 * 60 * 30,
  });

  const mitQuery = useQuery({
    queryKey: ["catalog", "mitigation"],
    queryFn: async () => {
      try {
        const res = await cockpitApi.catalogMitigationOptions();
        const opts = res.options?.map((r) => r.body as unknown as MitigationOption).filter((o) => o && o.id);
        return opts && opts.length ? opts : localOptions;
      } catch {
        return localOptions;
      }
    },
    staleTime: 1000 * 60 * 60,
  });

  const options = mitQuery.data ?? localOptions;
  const pred = predQuery.data;

  const macc = useMemo(() => buildMaccCurve(options, assumptions), [options, assumptions]);

  const sectorRows = useMemo(() => {
    if (!pred) return [];
    return (Object.entries(pred.predictions) as [string, SectorPrediction][])
      .map(([key, p]) => {
        const gapMt = p.gap ?? 0;
        const secOpts = options.filter((o) => String(o.sectorId) === key);
        const closure = investmentToCloseGap(gapMt > 0 ? gapMt : 0, secOpts, assumptions);
        const econ = secOpts.map((o) => computeProjectEconomics(o, assumptions));
        const cheapest = econ.length
          ? econ.reduce((a, b) => ((a.costToAbateUSDPerT ?? Infinity) < (b.costToAbateUSDPerT ?? Infinity) ? a : b))
          : null;
        return { key, label: p.label, gapMt, optionCount: secOpts.length, closure, cheapest };
      })
      .sort((a, b) => b.gapMt - a.gapMt);
  }, [pred, options, assumptions]);

  const summary = useMemo(() => {
    const totalGapMt = sectorRows.reduce((s, r) => s + Math.max(0, r.gapMt), 0);
    const investment = sectorRows.reduce((s, r) => s + (r.gapMt > 0 ? r.closure.fundingNeedUSD : 0), 0);
    const annualRevenue = macc.reduce((s, e) => s + e.annualRevenueUSD, 0);
    const selfFunding = macc.filter((e) => e.carbonCoversCost).length;
    return { totalGapMt, investment, annualRevenue, selfFunding };
  }, [sectorRows, macc]);

  const dealCards = useMemo(() => [...macc].sort((a, b) => b.netAnnualUSD - a.netAnnualUSD), [macc]);

  function handleCsv() {
    const header = ["Project", "Sector", "Abatement_MtCO2e_yr", "CostToAbate_USD_per_t", "Investment_USD", "AnnualCarbonRevenue_USD", "NetAnnualValue_USD", "CarbonCoversCost"];
    const rows = macc.map((e) => [
      JSON.stringify(e.title), e.sectorId, e.abatementMtPerYr, e.costToAbateUSDPerT?.toFixed(2) ?? "",
      Math.round(e.fundingNeedUSD), Math.round(e.annualRevenueUSD), Math.round(e.netAnnualUSD), e.carbonCoversCost ? "yes" : "no",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `climate-finance-${geoKey}-cp${assumptions.carbonPrice}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartData = macc.map((e) => ({
    name: e.title.length > 22 ? e.title.slice(0, 20) + "…" : e.title,
    cost: e.costToAbateUSDPerT ?? 0,
    covers: e.carbonCoversCost,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Climate Finance
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Which climate projects make business sense? This turns Uganda's 2030 emissions gap into the cost of
              cutting carbon and the revenue that carbon credits could bring.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-6 gap-1">
              {districtName ? <MapPin className="h-3 w-3" /> : null}
              {districtName ? districtName : "National"}
            </Badge>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleCsv} aria-label="Export CSV">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Plain-language explainer */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] text-foreground/90 leading-relaxed">
              <span className="font-semibold">How to read this:</span> every project has a{" "}
              <span className="font-semibold">cost to abate</span> — the dollars needed to cut one tonne of CO₂.
              Carbon credits pay a price per tonne (you set it below). When a project's cost to abate is{" "}
              <span className="font-semibold text-on-track">below the carbon price</span>, selling credits covers the
              cost — it can pay for itself. These are <span className="font-semibold">indicative estimates</span> for
              spotting opportunities, not investment advice.
            </div>
          </CardContent>
        </Card>

        {/* Assumptions */}
        <Card>
          <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SliderControl label="Carbon price" value={assumptions.carbonPrice} suffix=" $/tCO₂e"
              bounds={ASSUMPTION_BOUNDS.carbonPrice} onChange={(v) => setA({ carbonPrice: v })} />
            <SliderControl label="Project lifetime" value={assumptions.lifetimeYears} suffix=" yrs"
              bounds={ASSUMPTION_BOUNDS.lifetimeYears} onChange={(v) => setA({ lifetimeYears: v })} />
            <SliderControl label="Discount rate" value={assumptions.discountRate}
              display={`${(assumptions.discountRate * 100).toFixed(1)}%`}
              bounds={ASSUMPTION_BOUNDS.discountRate} onChange={(v) => setA({ discountRate: v })} />
          </CardContent>
        </Card>

        {predQuery.isLoading && (
          <Card><CardContent className="p-4"><div className="h-20 animate-pulse rounded bg-muted/40" /></CardContent></Card>
        )}
        {predQuery.isError && (
          <Card className="border-off-track/30">
            <CardContent className="p-3 text-xs text-off-track">
              Couldn't load the 2030 emissions gap. The project economics below still work; only the per-sector gap
              needs the prediction service.
            </CardContent>
          </Card>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="2030 gap to close" value={formatMt(summary.totalGapMt, 1)} sub="CO₂e above target" icon={Leaf} tone="text-off-track" />
          <Tile label="Investment needed" value={formatUSD(summary.investment)} sub="for matched projects" icon={Banknote} />
          <Tile label="Carbon revenue / yr" value={formatUSD(summary.annualRevenue)} sub={`at $${assumptions.carbonPrice}/tonne`} icon={TrendingUp} tone="text-on-track" />
          <Tile label="Projects that pay for themselves" value={`${summary.selfFunding} of ${macc.length}`} sub="at this carbon price" icon={CheckCircle2} />
        </div>

        {/* Sector gap -> opportunity */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold text-foreground mb-0.5">Where is the opportunity?</h3>
            <p className="text-[10px] text-muted-foreground mb-2">Each sector's distance from its 2030 target, and the projects that can close it.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-1 px-1 font-semibold">Sector</th>
                    <th className="text-right py-1 px-1 font-semibold">2030 gap</th>
                    <th className="text-center py-1 px-1 font-semibold">Projects</th>
                    <th className="text-right py-1 px-1 font-semibold">Cheapest to abate</th>
                    <th className="text-right py-1 px-1 font-semibold">Investment</th>
                    <th className="text-right py-1 px-1 font-semibold">Carbon revenue / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorRows.map((r) => (
                    <tr key={r.key} className="border-b border-border/20">
                      <td className="py-1.5 px-1 font-medium text-foreground">{r.label}</td>
                      <td className="py-1.5 px-1 text-right">
                        {r.gapMt > 0 ? (
                          <span className="text-off-track tabular-nums">+{formatMt(r.gapMt, 1)}</span>
                        ) : (
                          <Badge variant="outline" className="text-[8px] h-4 bg-on-track/10 text-on-track border-on-track/30">on track</Badge>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center text-muted-foreground">{r.optionCount || "—"}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{r.cheapest ? formatPerT(r.cheapest.costToAbateUSDPerT) : "—"}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{r.gapMt > 0 && r.optionCount ? formatUSD(r.closure.fundingNeedUSD) : "—"}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums text-on-track">{r.gapMt > 0 && r.optionCount ? formatUSD(r.closure.annualRevenueUSD) : "—"}</td>
                    </tr>
                  ))}
                  {sectorRows.length === 0 && (
                    <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">No sector gap data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cost-to-abate chart */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold text-foreground mb-0.5">Cost to cut carbon, by project</h3>
            <p className="text-[10px] text-muted-foreground mb-2">
              Sorted cheapest first. <span className="text-on-track font-medium">Green bars</span> sit below the carbon
              price line — those projects can pay for themselves with carbon credits.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ bottom: 44 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
                  label={{ value: "$ per tonne CO₂e", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }}
                  formatter={(v: unknown) => [formatPerT(v as number), "Cost to abate"]} />
                <ReferenceLine y={assumptions.carbonPrice} stroke="hsl(var(--chart-2))" strokeDasharray="4 4"
                  label={{ value: `carbon price $${assumptions.carbonPrice}`, fontSize: 9, fill: "hsl(var(--chart-2))", position: "insideTopRight" }} />
                <Bar dataKey="cost" radius={[2, 2, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.covers ? "hsl(var(--on-track))" : "hsl(var(--chart-1))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Investor opportunity cards */}
        <div>
          <h3 className="text-xs font-bold text-foreground mb-0.5">Top opportunities</h3>
          <p className="text-[10px] text-muted-foreground mb-2">Ranked by yearly value after costs, at the carbon price you set.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dealCards.slice(0, 6).map((e) => (
              <DealCard key={e.id} e={e} carbonPrice={assumptions.carbonPrice} />
            ))}
          </div>
        </div>

        {/* Project readiness */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold text-foreground mb-0.5">Project readiness</h3>
            <p className="text-[10px] text-muted-foreground mb-2">How close each delivery activity is to attracting private capital.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {READINESS_ORDER.map((stage) => {
                const items = activities.filter((a) => a.investment_readiness_level === stage);
                return (
                  <div key={stage} className="rounded-md border border-border/60 p-2">
                    <Badge variant="outline" className={cn("text-[9px] h-5 mb-1.5", READINESS_STYLE[stage])}>{READINESS_LABEL[stage]}</Badge>
                    {items.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">—</p>
                    ) : (
                      items.map((a) => (
                        <div key={a.id} className="mb-1.5 last:mb-0">
                          <p className="text-[10px] font-medium text-foreground leading-tight">{a.title}</p>
                          <p className="text-[9px] text-muted-foreground">{a.sector}</p>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground">
          Indicative screening only — not investment advice. The 2030 gap comes from Climate TRACE observed emissions
          versus Uganda's NDC targets. Project abatement and cost are public estimates from the NDC mitigation
          catalogue; carbon revenue assumes credits can be certified and sold at ${assumptions.carbonPrice}/tonne.
        </p>
      </div>
    </ScrollArea>
  );
}

function SliderControl({
  label, value, suffix, display, bounds, onChange,
}: {
  label: string; value: number; suffix?: string; display?: string;
  bounds: { min: number; max: number; step: number }; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground tabular-nums">{display ?? `${value}${suffix ?? ""}`}</span>
      </div>
      <Slider value={[value]} min={bounds.min} max={bounds.max} step={bounds.step}
        onValueChange={(v) => onChange(v[0])} aria-label={label} />
    </div>
  );
}

function Tile({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: typeof Coins; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
        </div>
        <p className={cn("text-lg font-bold tabular-nums", tone ?? "text-foreground")}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function DealCard({ e, carbonPrice }: { e: ProjectEconomics; carbonPrice: number }) {
  const gapPerT = e.costToAbateUSDPerT != null ? e.costToAbateUSDPerT - carbonPrice : null;
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs font-bold text-foreground leading-tight mb-1">{e.title}</p>
      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{e.description}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-2">
        <Metric label="Investment" value={formatUSD(e.fundingNeedUSD)} />
        <Metric label="Carbon revenue / yr" value={formatUSD(e.annualRevenueUSD)} tone="text-on-track" />
        <Metric label="Cuts" value={`${formatMt(e.abatementMtPerYr)}/yr`} />
        <Metric label="Cost to abate" value={formatPerT(e.costToAbateUSDPerT)} />
      </div>
      {e.carbonCoversCost ? (
        <div className="flex items-center gap-1.5 rounded-md bg-on-track/10 px-2 py-1 text-[10px] text-on-track">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span className="font-medium">Carbon credits cover the cost (+{formatUSD(e.netAnnualUSD)}/yr)</span>
        </div>
      ) : (
        <div className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
          Needs <span className="font-medium text-foreground">{gapPerT != null ? formatPerT(gapPerT) : "—"}</span> more funding per tonne
        </div>
      )}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[8px] h-4 capitalize">{e.confidence} confidence</Badge>
        {e.bestPractice && <Badge variant="outline" className="text-[8px] h-4">proven in {e.bestPractice.country}</Badge>}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone ?? "text-foreground")}>{value}</span>
    </div>
  );
}
