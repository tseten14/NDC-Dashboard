import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import {
  UGANDA_FINANCE_CONTEXT,
  buildProjectRecommendation,
  getUgandaSequencingGuidance,
  assessPortfolioDataQuality,
  type FundFit,
} from "@/lib/climate-finance-pathways";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Coins, Download, TrendingUp, MapPin, Leaf, Banknote, CheckCircle2, Info,
  Route, AlertTriangle, Landmark,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SectorId } from "@/data/uganda-ndc-data";

/** Plain-language names for funding channels, for readers new to climate finance. */
const CHANNEL_PLAIN_NAME: Record<string, string> = {
  "gcf-readiness": "Preparation grant (GCF)",
  "gcf-sap": "Green Climate Fund — smaller projects",
  "gcf-full": "Green Climate Fund — large projects",
  "gef-cc": "Global Environment Facility (GEF)",
  "wb-ida": "World Bank",
  afdb: "African Development Bank",
  "carbon-market": "Selling carbon credits",
  "bilateral-ta": "Donor country support",
  "national-budget": "Uganda government budget",
  "ldcf-adaptation": "Adaptation fund (LDCF)",
};

/** One-line plain-language reason per fit level (carbon market keeps its own). */
const FIT_PLAIN_WHY: Record<FundFit, string> = {
  high: "Right size for this project.",
  medium: "Could work — check the size limits and rules.",
  low: "Probably not the right size for this project.",
  ineligible: "Not available for this project.",
};

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
  const { geographyLevel, selectedDistrictId, selectedSector } = useAppContext();
  const [searchParams] = useSearchParams();
  const districtName = geographyLevel === "district" && selectedDistrictId ? selectedDistrictId : null;
  const geoKey = districtName ?? "national";
  const sectorParam = searchParams.get("sector") as SectorId | null;
  const projectParam = searchParams.get("projectId");
  const fromPolicyImpact = searchParams.get("from") === "policy-impact";

  const [assumptions, setAssumptions] = useState<FinanceAssumptions>(DEFAULT_ASSUMPTIONS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam);
  const setA = (patch: Partial<FinanceAssumptions>) => setAssumptions((a) => ({ ...a, ...patch }));

  useEffect(() => {
    if (projectParam) setSelectedProjectId(projectParam);
  }, [projectParam]);

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

  const focusSectorKey = sectorParam ?? selectedSector ?? null;

  const focusSectorGap = useMemo(() => {
    if (!pred || !focusSectorKey) return null;
    const p = pred.predictions[focusSectorKey as keyof typeof pred.predictions];
    if (!p) return null;
    return { key: focusSectorKey, label: p.label, gapMt: p.gap ?? 0 };
  }, [pred, focusSectorKey]);

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

  const dataWarnings = useMemo(
    () => assessPortfolioDataQuality(summary.totalGapMt, macc),
    [summary.totalGapMt, macc],
  );

  const selectedEcon = useMemo(
    () => macc.find((e) => e.id === selectedProjectId) ?? dealCards[0] ?? null,
    [macc, dealCards, selectedProjectId],
  );

  const selectedRec = useMemo(
    () => (selectedEcon ? buildProjectRecommendation(selectedEcon, assumptions.carbonPrice) : null),
    [selectedEcon, assumptions.carbonPrice],
  );

  const sequencing = useMemo(() => getUgandaSequencingGuidance(), []);

  function handleCsv() {
    const header = [
      "Project", "Sector", "Abatement_MtCO2e_yr", "Abatement_Unit", "CostToAbate_USD_per_t",
      "CostToAbate_Low_USD_per_t", "CostToAbate_High_USD_per_t", "Investment_USD",
      "AnnualCarbonRevenue_USD", "NetAnnualValue_USD", "CarbonCoversCost", "Confidence",
      "Abatement_Source", "Cost_Source",
    ];
    const rows = macc.map((e) => [
      JSON.stringify(e.title), e.sectorId, e.abatementMtPerYr, JSON.stringify(e.abatementUnit),
      e.costToAbateUSDPerT?.toFixed(2) ?? "", e.costToAbateLowUSDPerT?.toFixed(2) ?? "",
      e.costToAbateHighUSDPerT?.toFixed(2) ?? "", Math.round(e.fundingNeedUSD),
      Math.round(e.annualRevenueUSD), Math.round(e.netAnnualUSD), e.carbonCoversCost ? "yes" : "no",
      e.confidence, JSON.stringify(e.abatementSource), JSON.stringify(e.costSource),
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
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Compare climate projects by cost, possible carbon-credit income, and how much emissions Uganda still needs
              to cut by 2030 — then see which funding channels might fit.
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

        {fromPolicyImpact && focusSectorGap && (
          <Card className="border-sky-500/30 bg-sky-500/5">
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">From Policy Impact — {focusSectorGap.label}</span>
                  {" · "}
                  Emissions still to cut by 2030:{" "}
                  {focusSectorGap.gapMt > 0 ? (
                    <span className="text-off-track font-semibold">+{formatMt(focusSectorGap.gapMt, 1)}</span>
                  ) : (
                    <span className="text-on-track font-semibold">on track</span>
                  )}
                  {" "}(from Policy Impact — same live data as the dashboard)
                </span>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
                <Link to={`/dashboard?sector=${focusSectorGap.key}`}>Open sector on Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Plain-language explainer */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] text-foreground/90 leading-relaxed">
              <span className="font-semibold">In short:</span> each project shows what it costs to cut one tonne of
              emissions. Set a credit price below — if the project costs{" "}
              <span className="font-semibold text-on-track">less per tonne than that price</span>, selling credits could
              cover the cost. All figures are planning estimates from Uganda&apos;s climate pledge, not final prices or
              investment advice.
            </div>
          </CardContent>
        </Card>

        <Collapsible>
          <Card className="border-border/80">
            <CardContent className="p-3">
              <CollapsibleTrigger className="text-xs font-bold text-primary hover:underline">
                How are these numbers calculated?
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-1">From Uganda&apos;s climate plans</p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                    <li>Emissions cuts and project costs from the 2022 NDC</li>
                    <li>Cost ranges widen when data quality is lower (±10–35%)</li>
                    <li>Fund sizes are public guidelines — not approval decisions</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">From your settings above</p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                    <li>Cost per tonne = upfront + running costs spread over the project life</li>
                    <li>Gap closure picks the cheapest projects first until the gap is filled</li>
                    <li>Chart ranking uses the high end of the range when confidence is low</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

        {/* Data accuracy warnings */}
        <div className="space-y-2">
          {dataWarnings.map((w) => (
            <Card
              key={w.id}
              className={cn(w.severity === "warn" ? "border-amber-500/40 bg-amber-500/5" : "border-border/60")}
            >
              <CardContent className="p-2.5 flex gap-2 text-[11px] leading-relaxed">
                {w.severity === "warn" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <span className={w.severity === "warn" ? "text-amber-900 dark:text-amber-100" : "text-muted-foreground"}>
                  {w.message}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assumptions */}
        <Card>
          <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SliderControl label="Credit price per tonne" value={assumptions.carbonPrice} suffix=" $/t"
              bounds={ASSUMPTION_BOUNDS.carbonPrice} onChange={(v) => setA({ carbonPrice: v })} />
            <SliderControl label="Project lifespan" value={assumptions.lifetimeYears} suffix=" yrs"
              bounds={ASSUMPTION_BOUNDS.lifetimeYears} onChange={(v) => setA({ lifetimeYears: v })} />
            <SliderControl label="Costing interest rate" value={assumptions.discountRate}
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
          <Tile label="Still to cut by 2030" value={formatMt(summary.totalGapMt, 1)} sub="Based on live emissions trends" icon={Leaf} tone="text-off-track" />
          <Tile label="Rough investment needed" value={formatUSD(summary.investment)} sub="From NDC cost estimates" icon={Banknote} />
          <Tile label="Possible credit income / yr" value={formatUSD(summary.annualRevenue)} sub={`If credits sell at $${assumptions.carbonPrice}/tonne`} icon={TrendingUp} tone="text-on-track" />
          <Tile label="Self-paying projects" value={`${summary.selfFunding} of ${macc.length}`} sub="Credits cover cost at your price" icon={CheckCircle2} />
        </div>

        {/* Sector gap -> opportunity */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold text-foreground mb-0.5">Opportunity by sector</h3>
            <p className="text-[10px] text-muted-foreground mb-2">How far each sector is from its 2030 goal, and which projects could help close the gap.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-1 px-1 font-semibold">Sector</th>
                    <th className="text-right py-1 px-1 font-semibold">Still to cut</th>
                    <th className="text-center py-1 px-1 font-semibold">Projects</th>
                    <th className="text-right py-1 px-1 font-semibold">Lowest $/tonne</th>
                    <th className="text-right py-1 px-1 font-semibold">Investment</th>
                    <th className="text-right py-1 px-1 font-semibold">Credit income / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorRows.map((r) => (
                    <tr
                      key={r.key}
                      className={cn(
                        "border-b border-border/20",
                        focusSectorKey === r.key && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                      )}
                    >
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
            <h3 className="text-xs font-bold text-foreground mb-0.5">Cost per tonne, by project</h3>
            <p className="text-[10px] text-muted-foreground mb-2">
              <span className="text-on-track font-medium">Green bars</span> cost less per tonne than your credit price — credits could cover the cost.
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
                <ReferenceLine y={assumptions.carbonPrice} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" />
                <Bar dataKey="cost" radius={[2, 2, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.covers ? "hsl(var(--on-track))" : "hsl(var(--chart-1))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground mt-2 px-1">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-3 rounded-sm bg-[hsl(var(--on-track))]" aria-hidden />
                Below credit price
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-3 rounded-sm bg-[hsl(var(--chart-1))]" aria-hidden />
                Above credit price
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-2))]" aria-hidden />
                Credit price (${assumptions.carbonPrice}/tonne)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Financing pathways (NAPX-inspired) */}
        <Card className="border-primary/15">
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Route className="h-3.5 w-3.5 text-primary" />
              Where to look for funding — {UGANDA_FINANCE_CONTEXT.classification}
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {UGANDA_FINANCE_CONTEXT.sequencingPrinciple} Based on {UGANDA_FINANCE_CONTEXT.ndcAnchor}.
            </p>
            <ul className="text-[10px] text-foreground/90 space-y-1 list-disc pl-4">
              {sequencing.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Investor opportunity cards */}
        <div>
          <h3 className="text-xs font-bold text-foreground mb-0.5">Top opportunities</h3>
          <p className="text-[10px] text-muted-foreground mb-2">
            Projects with the best payback. Click one to see where the money could come from.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dealCards.slice(0, 6).map((e) => (
              <DealCard
                key={e.id}
                e={e}
                carbonPrice={assumptions.carbonPrice}
                selected={selectedEcon?.id === e.id}
                onSelect={() => setSelectedProjectId(e.id)}
              />
            ))}
          </div>
        </div>

        {/* Matched funding + recommendations for selected project */}
        {selectedRec && selectedEcon && (
          <Card className="border-primary/25 shadow-sm">
            <CardContent className="p-3 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Where could the money come from? — {selectedEcon.title}
              </h3>

              {selectedRec.primaryWindow && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2 text-[11px]">
                  <span className="font-semibold text-primary">Start here: </span>
                  {CHANNEL_PLAIN_NAME[selectedRec.primaryWindow.window.id] ?? selectedRec.primaryWindow.window.name}
                  <span className="text-muted-foreground">
                    {" — "}
                    {selectedRec.primaryWindow.window.id === "carbon-market"
                      ? selectedRec.primaryWindow.rationale
                      : FIT_PLAIN_WHY[selectedRec.primaryWindow.fit]}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {selectedRec.matches
                  .filter((m) => m.window.id !== selectedRec.primaryWindow?.window.id)
                  .slice(0, 3)
                  .map((m) => (
                    <div
                      key={m.window.id}
                      className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-[10px]"
                    >
                      <span className="font-medium text-foreground">
                        {CHANNEL_PLAIN_NAME[m.window.id] ?? m.window.name}
                      </span>
                      <FitBadge fit={m.fit} />
                      <span className="text-muted-foreground hidden sm:inline truncate">
                        {m.window.id === "carbon-market" ? m.rationale : FIT_PLAIN_WHY[m.fit]}
                      </span>
                    </div>
                  ))}
              </div>

              <div>
                <p className="text-[10px] font-semibold text-foreground mb-1">What to do next</p>
                <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal pl-4">
                  {selectedRec.nextSteps
                    .filter((step) => !step.startsWith("Best-fit funding channel"))
                    .slice(0, 3)
                    .map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                </ol>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Big projects usually need government sign-off, an approved delivery partner, and some matching money
                from Uganda&apos;s own budget or private partners.
              </p>

              <Collapsible>
                <CollapsibleTrigger className="text-[10px] text-primary hover:underline">
                  Where these figures come from
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-[10px] space-y-1 text-muted-foreground">
                  <p>{selectedRec.dataCaveat}</p>
                  <p><span className="font-semibold text-foreground">Emissions data: </span>{selectedEcon.abatementSource}</p>
                  <p><span className="font-semibold text-foreground">Cost data: </span>{selectedEcon.costSource}</p>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {/* Project readiness */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold text-foreground mb-0.5">How ready are projects?</h3>
            <p className="text-[10px] text-muted-foreground mb-2">How close each activity is to being ready for investment.</p>
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

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Screening tool for Uganda&apos;s climate projects — not investment advice. The 2030 gap uses live emissions
          data vs official goals; costs come from NDC planning figures; credit income assumes sellable reductions at $
          {assumptions.carbonPrice}/tonne.
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

function Tile({
  label, value, sub, icon: Icon, tone,
}: {
  label: string; value: string; sub?: string; icon: typeof Coins; tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
        </div>
        <p className={cn("text-lg font-bold tabular-nums", tone ?? "text-foreground")}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FitBadge({ fit }: { fit: FundFit }) {
  const style: Record<FundFit, string> = {
    high: "bg-on-track/10 text-on-track border-on-track/30",
    medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    low: "bg-muted text-muted-foreground border-border",
    ineligible: "bg-muted text-muted-foreground border-border",
  };
  const label: Record<FundFit, string> = {
    high: "Strong fit",
    medium: "Possible",
    low: "Weak fit",
    ineligible: "N/A",
  };
  return (
    <Badge variant="outline" className={cn("text-[8px] h-4", style[fit])}>
      {label[fit]}
    </Badge>
  );
}

function DealCard({
  e, carbonPrice, selected, onSelect,
}: {
  e: ProjectEconomics;
  carbonPrice: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const gapPerT = e.costToAbateUSDPerT != null ? e.costToAbateUSDPerT - carbonPrice : null;
  const hasBand = e.costToAbateLowUSDPerT != null && e.costToAbateHighUSDPerT != null && e.confidence !== "high";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-3 text-left w-full transition-colors hover:border-primary/40",
        selected && "ring-2 ring-primary/40 border-primary/50",
      )}
    >
      <p className="text-xs font-bold text-foreground leading-tight mb-2">{e.title}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-2">
        <Metric label="Costs to build" value={formatUSD(e.fundingNeedUSD)} />
        <Metric label="Earns per year" value={formatUSD(e.annualRevenueUSD)} tone="text-on-track" />
        <Metric label="Emissions cut" value={`${formatMt(e.abatementMtPerYr)}/yr`} />
        <Metric
          label="Cost / tonne"
          value={
            hasBand
              ? `${formatPerT(e.costToAbateLowUSDPerT)} – ${formatPerT(e.costToAbateHighUSDPerT)}`
              : formatPerT(e.costToAbateUSDPerT)
          }
        />
      </div>
      {e.carbonCoversCost ? (
        <div className="flex items-center gap-1.5 rounded-md bg-on-track/10 px-2 py-1 text-[10px] text-on-track">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span className="font-medium">Pays for itself (+{formatUSD(e.netAnnualUSD)}/yr)</span>
        </div>
      ) : (
        <div className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
          Needs extra funding ({gapPerT != null ? formatPerT(gapPerT) : "—"}/tonne short)
        </div>
      )}
    </button>
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
