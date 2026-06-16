import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  policyImpactApi,
  type PolicyImpactForecastResponse,
  type PolicyImpactOutcome,
  type TefElement,
} from "@/lib/api";
import { PolicyPathwayDiagram } from "@/components/PolicyPathwayDiagram";
import type { TransportPathwayModel } from "@/data/transport-theory-of-change";
import { sectorDefinitions } from "@/data/uganda-ndc-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Coins,
  ExternalLink,
  Scale,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { climateFinanceHrefFromPolicyImpact } from "@/lib/policy-impact-link";

const STEPS = ["Objective", "Intervention", "Parameters", "Results"] as const;
type Step = (typeof STEPS)[number];

/** Map dashboard sector id or label to the Select value (display name). */
function resolveSectorLabel(raw: string): string {
  const key = raw.trim();
  const byId = sectorDefinitions.find((s) => s.id === key.toLowerCase());
  if (byId) return byId.name;
  const byName = sectorDefinitions.find((s) => s.name.toLowerCase() === key.toLowerCase());
  if (byName) return byName.name;
  return key;
}

/** Normalize dashboard sector id/label for TEF API lookup. */
function tefSectorQuery(sector: string): string {
  const aliases: Record<string, string> = {
    afolu: "AFOLU",
    agriculture: "AFOLU",
    energy: "Energy",
    transport: "Transport",
    waste: "Economy-wide",
    ippu: "Energy",
    "economy-wide": "Economy-wide",
  };
  return aliases[sector.trim().toLowerCase()] ?? sector;
}

const OBJECTIVES = [
  "Increase renewable generation",
  "Reduce AFOLU emissions while supporting rural livelihoods",
  "Improve transport efficiency and lower emissions",
  "Strengthen climate finance and carbon pricing signals",
];

const OUTCOME_ICONS: Record<string, typeof TrendingUp> = {
  jobs: Users,
  gdp: TrendingUp,
  inequality: Scale,
  gender: UserRound,
  trade: Coins,
};

const OUTCOME_LABELS: Record<string, string> = {
  jobs: "Jobs",
  gdp: "Economy",
  inequality: "Fairness",
  gender: "Gender equality",
  trade: "Trade & finance",
};

const DIRECTION_LABELS: Record<string, string> = {
  increase: "Likely up",
  decrease: "Likely down",
  mixed: "Mixed",
};

const HEADLINE_IMPACT_PRIORITY = ["jobs", "gdp", "inequality", "gender", "trade"];

function confidenceLabel(score: number): string {
  if (score >= 0.75) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

function pickHeadlineImpacts(impacts: PolicyImpactOutcome[], max = 5): PolicyImpactOutcome[] {
  const ranked = [...impacts].sort((a, b) => {
    const priorityA = HEADLINE_IMPACT_PRIORITY.indexOf(a.category);
    const priorityB = HEADLINE_IMPACT_PRIORITY.indexOf(b.category);
    const scoreA =
      (priorityA >= 0 ? (HEADLINE_IMPACT_PRIORITY.length - priorityA) * 10 : 0) +
      a.confidence * 5 +
      (a.magnitude ? 3 : 0);
    const scoreB =
      (priorityB >= 0 ? (HEADLINE_IMPACT_PRIORITY.length - priorityB) * 10 : 0) +
      b.confidence * 5 +
      (b.magnitude ? 3 : 0);
    return scoreB - scoreA;
  });
  return ranked.slice(0, max);
}

type MatchedCase = PolicyImpactForecastResponse["matched_cases"][number];

/** Plain-language source line — never implies the forecast *is* a single foreign country. */
function describeForecastSources(
  matchedCases: MatchedCase[],
  dataSource?: string,
): { summary: string; badge: string } {
  const library =
    dataSource === "bundled KCI corpus"
      ? "UNFCCC KCI case study library"
      : dataSource?.trim() || "policy case study library";

  if (matchedCases.length === 0) {
    return {
      summary: `No close match in the ${library}. Treat this as a rough sketch for Uganda only.`,
      badge: "Limited case matches",
    };
  }

  const n = matchedCases.length;
  const topTitle = matchedCases[0]?.title;
  const countLabel = `${n} matched case ${n === 1 ? "study" : "studies"}`;
  const countries = [
    ...new Set(
      matchedCases
        .map((c) => c.country?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  const analogueNote =
    countries.length > 0
      ? ` Programme examples documented in ${countries.join(", ")} — used as analogues, not Uganda outcomes.`
      : "";
  const summary = topTitle
    ? `Informed by ${countLabel} from the ${library}, scaled to your Uganda NDC context.${analogueNote} Closest match: “${topTitle}”.`
    : `Informed by ${countLabel} from the ${library}, scaled to your Uganda NDC context.${analogueNote}`;

  return { summary, badge: countLabel };
}

function pathwayToModel(
  diagram: PolicyImpactForecastResponse["pathway_diagram"],
  title: string,
): TransportPathwayModel {
  return {
    id: "forecast-pathway",
    title,
    subtitle: "How matched case studies suggest outcomes could unfold",
    sector: "Multi-sector",
    ndcTargetHint: "Matched case studies — not an official Uganda forecast",
    measuredOutcomeNote:
      "Drawn from programmes in the policy corpus — not measured impacts in Uganda.",
    nodes: diagram.nodes.map((n) => ({
      id: n.id,
      kind: n.kind as TransportPathwayModel["nodes"][0]["kind"],
      label: n.label,
    })),
    edges: diagram.edges,
  };
}

export default function PolicyImpact() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("Objective");
  const [objective, setObjective] = useState(OBJECTIVES[1]);
  const [customObjective, setCustomObjective] = useState("");
  const [sector, setSector] = useState("AFOLU");
  const [intervention, setIntervention] = useState<TefElement | null>(null);
  const [scale, setScale] = useState(1);
  const [timelineYears, setTimelineYears] = useState(10);
  const [result, setResult] = useState<PolicyImpactForecastResponse | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  const sectorParam = searchParams.get("sector");
  const interventionParam = searchParams.get("intervention");
  const objectiveParam = searchParams.get("objective");

  useEffect(() => {
    if (prefillApplied) return;
    if (!sectorParam && !interventionParam && !objectiveParam) return;

    if (objectiveParam) {
      setCustomObjective(objectiveParam);
    }
    if (sectorParam) {
      setSector(resolveSectorLabel(sectorParam));
    }
    setPrefillApplied(true);
  }, [sectorParam, interventionParam, objectiveParam, prefillApplied]);

  const casesQuery = useQuery({
    queryKey: ["policy-cases"],
    queryFn: () => policyImpactApi.listCases(),
    staleTime: 1000 * 60 * 60,
  });

  const tefSector = tefSectorQuery(sector);

  const tefQuery = useQuery({
    queryKey: ["tef-elements", tefSector],
    queryFn: () => policyImpactApi.tefElements(tefSector),
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    setIntervention(null);
  }, [tefSector]);

  useEffect(() => {
    if (!interventionParam || !tefQuery.data?.elements.length) return;
    const match = tefQuery.data.elements.find((el) => el.intervention_type === interventionParam);
    if (match) {
      setIntervention(match);
      setStep("Parameters");
    }
  }, [interventionParam, tefQuery.data?.elements]);

  const forecastMut = useMutation({
    mutationFn: () =>
      policyImpactApi.forecast({
        objective: customObjective.trim() || objective,
        intervention: {
          type: intervention?.intervention_type ?? "agricultural_credit",
          label: intervention?.label,
        },
        parameters: { scale, timeline_years: timelineYears, sector },
        context: { country: "UGA" },
      }),
    onSuccess: (data) => {
      setResult(data);
      setStep("Results");
    },
  });

  const sectorOptions = useMemo(
    () =>
      sectorDefinitions
        .filter((s) => s.id !== "economy-wide")
        .map((s) => ({ id: s.id, label: s.name })),
    [],
  );

  const stepIdx = STEPS.indexOf(step);

  const headlineImpacts = useMemo(
    () => (result ? pickHeadlineImpacts(result.impacts) : []),
    [result],
  );
  const extraImpacts = useMemo(
    () =>
      result
        ? result.impacts.filter((imp) => !headlineImpacts.some((h) => h === imp))
        : [],
    [result, headlineImpacts],
  );
  const topTradeOffs = useMemo(
    () =>
      result
        ? [...result.trade_offs].sort((a, b) => b.confidence - a.confidence).slice(0, 3)
        : [],
    [result],
  );
  const extraTradeOffs = useMemo(
    () =>
      result ? result.trade_offs.filter((t) => !topTradeOffs.some((top) => top.id === t.id)) : [],
    [result, topTradeOffs],
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <Workflow className="h-4 w-4" />
              Policy Impact Forecasting
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore what a policy might mean for jobs, income, and fairness — using lessons from similar programmes elsewhere.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 flex-wrap">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                type="button"
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md border transition-colors",
                  step === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground",
                  i < stepIdx && "border-on-track/40",
                )}
                onClick={() => i <= stepIdx && setStep(s)}
              >
                {i + 1}. {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === "Objective" && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-xs">Policy objective</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs text-muted-foreground">Or describe your own</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  placeholder="e.g. Expand climate-smart agriculture credit for women farmers"
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Sector context</Label>
                <Select value={sector} onValueChange={(v) => { setSector(v); setIntervention(null); }}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map((s) => (
                      <SelectItem key={s.id} value={s.label} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="Economy-wide" className="text-xs">Economy-wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="text-xs" onClick={() => setStep("Intervention")}>
                Next: Select intervention <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "Intervention" && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-xs">What kind of policy?</Label>
              {tefQuery.isLoading && (
                <p className="text-[11px] text-muted-foreground">Loading intervention types…</p>
              )}
              {tefQuery.isError && (
                <p className="text-[11px] text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Could not load interventions — check that the API is running ({tefSector}).
                </p>
              )}
              {!tefQuery.isLoading && !tefQuery.isError && (tefQuery.data?.elements?.length ?? 0) === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No policy types for <strong>{sector}</strong> yet. Go back and try AFOLU, Energy, Transport, or Economy-wide.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {(tefQuery.data?.elements ?? []).map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    className={cn(
                      "text-left rounded-lg border p-3 text-xs transition-colors hover:bg-muted/40",
                      intervention?.id === el.id && "border-primary bg-primary/5",
                    )}
                    onClick={() => setIntervention(el)}
                  >
                    <p className="font-semibold text-foreground">{el.label}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep("Objective")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={!intervention}
                  onClick={() => setStep("Parameters")}
                >
                  Next: Parameters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "Parameters" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs">
                  Coverage: <span className="font-semibold text-foreground">{
                    scale <= 0.25 ? "Small pilot (1–2 districts)" :
                    scale <= 0.5  ? "District level" :
                    scale <= 0.75 ? "Regional (several districts)" :
                    scale <= 1.0  ? "National programme" :
                    scale <= 1.5  ? "Scaled-up national" :
                                    "Maximum ambition"
                  }</span>
                </Label>
                <Slider
                  className="mt-2"
                  min={0.25}
                  max={2}
                  step={0.25}
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-0.5">
                  <span>Pilot</span><span>District</span><span>Regional</span><span>National</span><span>Scaled</span><span>Maximum</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Over how many years? ({timelineYears})</Label>
                <Slider
                  className="mt-2"
                  min={3}
                  max={20}
                  step={1}
                  value={[timelineYears]}
                  onValueChange={([v]) => setTimelineYears(v)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep("Intervention")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={forecastMut.isPending}
                  onClick={() => forecastMut.mutate()}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {forecastMut.isPending ? "Forecasting…" : "Run forecast"}
                </Button>
              </div>
              {forecastMut.isError && (
                <p className="text-xs text-destructive">Forecast failed — check API connection.</p>
              )}
            </CardContent>
          </Card>
        )}

        {step === "Results" && result && (() => {
          const sourceCopy = describeForecastSources(result.matched_cases, result.data_source);
          return (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">What this might mean</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{intervention?.label ?? "Selected policy"}</span> in{" "}
                  {sector}. {sourceCopy.summary}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Reliability: {confidenceLabel(result.overall_confidence)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {sourceCopy.badge}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              {result.disclaimers[0] ??
                "This is an illustrative comparison — not a prediction of what will happen in Uganda."}
            </p>

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Key outcomes</p>
                <div className="space-y-3">
                  {headlineImpacts.map((imp, i) => {
                    const Icon = OUTCOME_ICONS[imp.category] ?? TrendingUp;
                    return (
                      <div key={i} className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                        <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-foreground">
                              {OUTCOME_LABELS[imp.category] ?? imp.category.replace(/_/g, " ")}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                imp.direction === "increase" && "text-on-track border-on-track/30",
                                imp.direction === "decrease" && "text-destructive border-destructive/30",
                              )}
                            >
                              {DIRECTION_LABELS[imp.direction] ?? imp.direction}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">{imp.description}</p>
                          {imp.magnitude && (
                            <p className="text-sm font-semibold text-foreground">
                              {imp.magnitude.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {imp.magnitude.unit}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {topTradeOffs.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Trade-offs to watch</p>
                  {topTradeOffs.map((t) => (
                    <div key={t.id} className="rounded-md border border-border/60 p-3 text-xs space-y-1.5">
                      <p>
                        <span className="text-on-track font-medium">Benefit: </span>
                        {t.positive_effect}
                      </p>
                      <p>
                        <span className="text-destructive font-medium">Risk: </span>
                        {t.negative_effect}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full text-left">
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">Show details</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-3 pb-4 pt-0 space-y-4 border-t border-border/60">
                    {result.matched_cases[0]?.sector_score != null && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-foreground">How well this case matches</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              ["Sector", result.matched_cases[0].sector_score],
                              ["Policy type", result.matched_cases[0].intervention_score],
                              ["Region", result.matched_cases[0].region_score],
                              ["Scale", result.matched_cases[0].scale_score],
                            ] as const
                          ).map(([label, score]) =>
                            score != null ? (
                              <Badge key={label} variant="secondary" className="text-[10px] font-normal">
                                {label}: {Math.round(score * 100)}%
                              </Badge>
                            ) : null,
                          )}
                        </div>
                      </div>
                    )}

                    {extraImpacts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-foreground">Other possible effects</p>
                        {extraImpacts.map((imp, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                            <span className="text-foreground font-medium">
                              {OUTCOME_LABELS[imp.category] ?? imp.category}:{" "}
                            </span>
                            {imp.description}
                          </p>
                        ))}
                      </div>
                    )}

                    {extraTradeOffs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-foreground">Additional trade-offs</p>
                        {extraTradeOffs.map((t) => (
                          <p key={t.id} className="text-[11px] text-muted-foreground">
                            {t.positive_effect} — but {t.negative_effect.toLowerCase()}
                          </p>
                        ))}
                      </div>
                    )}

                    {result.disclaimers.length > 1 && (
                      <div className="space-y-1">
                        {result.disclaimers.slice(1).map((d, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">
                            {d}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-foreground">How we got here</p>
                      <PolicyPathwayDiagram
                        model={pathwayToModel(result.pathway_diagram, "Policy pathway")}
                        compact
                        showFooter={false}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-foreground flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> Source case studies
                      </p>
                      {(casesQuery.data?.cases ?? [])
                        .filter((c) => result.matched_cases.some((m) => m.id === c.id))
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0"
                          >
                            <div>
                              <p className="text-[11px] font-semibold">{c.title}</p>
                              {c.country ? (
                                <p className="text-[10px] text-muted-foreground">{c.country}</p>
                              ) : null}
                              <p className="text-[10px] text-muted-foreground">{c.summary}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0" asChild>
                              <a
                                href="https://unfccc.int/constituted-bodies/KCI"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" /> View
                              </a>
                            </Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep("Parameters")}>
                Adjust parameters
              </Button>
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link
                  to={climateFinanceHrefFromPolicyImpact({
                    sector,
                    intervention: intervention?.label ?? intervention?.intervention_type,
                    objective: customObjective.trim() || objective,
                    scale,
                  })}
                >
                  <Coins className="h-3 w-3 mr-1" /> Find funding (Climate Finance)
                </Link>
              </Button>
            </div>
          </div>
          );
        })()}
      </div>
    </ScrollArea>
  );
}
