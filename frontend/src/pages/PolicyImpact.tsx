import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  policyImpactApi,
  type PolicyImpactForecastResponse,
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
  AlertTriangle,
  ArrowRight,
  BookOpen,
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

const STEPS = ["Objective", "Intervention", "Parameters", "Results"] as const;
type Step = (typeof STEPS)[number];

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

function pathwayToModel(
  diagram: PolicyImpactForecastResponse["pathway_diagram"],
  title: string,
): TransportPathwayModel {
  return {
    id: "forecast-pathway",
    title,
    subtitle: "Aggregated causal pathway from matched KCI case studies (TEF framework)",
    sector: "Multi-sector",
    ndcTargetHint: "Indicative — traceable to UNFCCC KCI evidence",
    measuredOutcomeNote:
      "Socio-economic forecasts are analogies from comparable case studies, not attributed Uganda impacts.",
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
      setSector(sectorParam);
    }
    setPrefillApplied(true);
  }, [sectorParam, interventionParam, objectiveParam, prefillApplied]);

  const casesQuery = useQuery({
    queryKey: ["policy-cases"],
    queryFn: () => policyImpactApi.listCases(),
    staleTime: 1000 * 60 * 60,
  });

  const tefQuery = useQuery({
    queryKey: ["tef-elements", sector],
    queryFn: () => policyImpactApi.tefElements(sector),
    staleTime: 1000 * 60 * 60,
  });

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
              Socio-economic impacts beyond emissions — evidence from UNFCCC KCI case studies via the Transition Element Framework.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
            Indicative forecast — not official projection
          </Badge>
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
              <Label className="text-xs">Intervention type (TEF-aligned)</Label>
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
                    <p className="text-[10px] text-muted-foreground mt-0.5">{el.intervention_type}</p>
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
                <Label className="text-xs">Scale multiplier ({scale.toFixed(1)}×)</Label>
                <Slider
                  className="mt-2"
                  min={0.25}
                  max={2}
                  step={0.25}
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Relative to reference case study scale</p>
              </div>
              <div>
                <Label className="text-xs">Timeline ({timelineYears} years)</Label>
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

        {step === "Results" && result && (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="text-[10px]">
                    Confidence {Math.round(result.overall_confidence * 100)}%
                  </Badge>
                  {result.matched_cases.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-[9px]">
                      {c.country} — {Math.round(c.match_score * 100)}% match
                    </Badge>
                  ))}
                </div>
                {result.matched_cases[0]?.sector_score != null && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
                    <span className="text-[9px] text-muted-foreground w-full">Match breakdown (top case):</span>
                    {(
                      [
                        ["Sector", result.matched_cases[0].sector_score],
                        ["Intervention", result.matched_cases[0].intervention_score],
                        ["Region", result.matched_cases[0].region_score],
                        ["Scale", result.matched_cases[0].scale_score],
                      ] as const
                    ).map(([label, score]) =>
                      score != null ? (
                        <Badge key={label} variant="secondary" className="text-[8px] font-normal">
                          {label} {Math.round(score * 100)}%
                        </Badge>
                      ) : null,
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {result.disclaimers.map((d, i) => (
              <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-600" />
                {d}
              </p>
            ))}

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {result.impacts.map((imp, i) => {
                const Icon = OUTCOME_ICONS[imp.category] ?? TrendingUp;
                return (
                  <Card key={i}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {imp.category.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px]",
                            imp.direction === "increase" && "text-on-track",
                            imp.direction === "decrease" && "text-destructive",
                          )}
                        >
                          {imp.direction}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-foreground leading-snug">{imp.description}</p>
                      {imp.magnitude && (
                        <p className="text-sm font-bold text-foreground">
                          {imp.magnitude.value} {imp.magnitude.unit}
                        </p>
                      )}
                      <p className="text-[9px] text-muted-foreground italic">{imp.provenance}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-bold text-foreground">Trade-offs</p>
                {result.trade_offs.map((t) => (
                  <div key={t.id} className="border rounded-md p-2 text-[11px] space-y-1">
                    <div className="flex gap-2">
                      <span className="text-on-track font-medium">+ {t.positive_effect}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-destructive font-medium">− {t.negative_effect}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Affected: {t.affected_groups.join(", ")}
                    </p>
                    {t.provenance && (
                      <p className="text-[9px] text-muted-foreground italic">{t.provenance}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <PolicyPathwayDiagram
              model={pathwayToModel(result.pathway_diagram, "Forecast causal pathway")}
              compact
              showFooter={false}
            />

            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Evidence — source case studies
                </p>
                {(casesQuery.data?.cases ?? [])
                  .filter((c) => result.matched_cases.some((m) => m.id === c.id))
                  .map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="text-[11px] font-semibold">{c.title}</p>
                        <p className="text-[10px] text-muted-foreground">{c.summary}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0" asChild>
                        <a
                          href="https://unfccc.int/constituted-bodies/KCI"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" /> KCI
                        </a>
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep("Parameters")}>
                Adjust parameters
              </Button>
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link to="/climate-finance">
                  <Coins className="h-3 w-3 mr-1" /> Funding requirements (Climate Finance)
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
