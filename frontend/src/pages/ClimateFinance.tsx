import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { emissionsApi } from "@/lib/api";
import { sectorDefinitions, type SectorId } from "@/data/uganda-ndc-data";
import { useAppContext } from "@/hooks/use-app-state";
import { formatUSD, formatMt } from "@/lib/climate-finance";
import {
  currentClimateFinance,
  summariseClimateFinance,
  financeForSector,
  type ActiveFinance,
} from "@/data/uganda-climate-finance";
import {
  screenFundsForIntervention,
  estimateInterventionNeedUSD,
  type FundFit,
  type FundMatch,
  type FinanceChallenge,
} from "@/lib/climate-finance-pathways";
import { FundingProposalDialog, type ProposalContext } from "@/components/finance/FundingProposalDialog";
import { McfDocumentsPanel } from "@/components/McfDocumentsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Coins, MapPin, Landmark, Info, AlertTriangle, FileText, ArrowRight,
  Banknote, Sparkles, Building2, CheckCircle2, Target, ExternalLink,
} from "lucide-react";

const FUNDER_TONE: Record<string, string> = {
  "World Bank": "bg-sky-500/10 text-sky-600 border-sky-500/30",
  GCF: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  AfDB: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  GEF: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  Bilateral: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  "Other MDB": "bg-muted text-muted-foreground border-border",
};

const FIT_PLAIN_WHY: Record<FundFit, string> = {
  high: "Right size for this project.",
  medium: "Could work — check the size limits and rules.",
  low: "Probably not the right size for this project.",
  ineligible: "Not available for this project.",
};


export default function ClimateFinance() {
  const { geographyLevel, selectedDistrictId, selectedSector } = useAppContext();
  const [searchParams] = useSearchParams();
  const districtName = geographyLevel === "district" && selectedDistrictId ? selectedDistrictId : null;
  const geoKey = districtName ?? "national";

  const sectorParam = searchParams.get("sector") as SectorId | null;
  const interventionParam = searchParams.get("intervention");
  const objectiveParam = searchParams.get("objective");
  const scaleParam = Number(searchParams.get("scale")) || 1;
  const fromPolicyImpact = searchParams.get("from") === "policy-impact";

  const focusSectorId = (sectorParam ?? (selectedSector as SectorId | null)) ?? null;
  const hasIntervention = fromPolicyImpact && !!focusSectorId;

  const [showAllFinance, setShowAllFinance] = useState(!hasIntervention);
  const [proposalOpen, setProposalOpen] = useState(false);

  // Live 2030 gap for the focus sector (used only to contextualise the ask).
  const predQuery = useQuery({
    queryKey: ["emissions", "predictions", geoKey],
    queryFn: () => emissionsApi.predictions(districtName ? { district: districtName } : undefined),
    staleTime: 1000 * 60 * 30,
  });
  const predData = predQuery.data;
  const focusGap = useMemo(() => {
    if (!predData || !focusSectorId) return null;
    const p = predData.predictions[focusSectorId as keyof typeof predData.predictions];
    return p ? { label: p.label, gapMt: p.gap ?? 0 } : null;
  }, [predData, focusSectorId]);

  const sectorLabel =
    sectorDefinitions.find((s) => s.id === focusSectorId)?.name ?? focusGap?.label ?? "your sector";

  // ── Q1: current finance ──────────────────────────────────────────────
  const totals = useMemo(() => summariseClimateFinance(), []);
  const financeRows = useMemo<ActiveFinance[]>(
    () => (showAllFinance ? currentClimateFinance : financeForSector(focusSectorId)),
    [showAllFinance, focusSectorId],
  );
  const sectorFinanceTotal = useMemo(
    () => financeForSector(focusSectorId).reduce((s, r) => s + r.amountUSD, 0),
    [focusSectorId],
  );

  // ── Q2: opportunities for the planned intervention ───────────────────
  const estimatedNeedUSD = focusSectorId ? estimateInterventionNeedUSD(focusSectorId, scaleParam) : 0;
  const screening = useMemo(
    () =>
      hasIntervention && focusSectorId
        ? screenFundsForIntervention({
            sectorId: focusSectorId,
            estimatedNeedUSD,
            interventionLabel: interventionParam ?? undefined,
          })
        : null,
    [hasIntervention, focusSectorId, estimatedNeedUSD, interventionParam],
  );

  const proposalContext: ProposalContext = {
    projectName: objectiveParam || (interventionParam ? `${interventionParam}` : `${sectorLabel} climate project`),
    sectorLabel,
    interventionLabel: interventionParam ?? undefined,
    targetFunder: screening?.matches[0]?.window.name,
    estimatedNeedUSD: estimatedNeedUSD || undefined,
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Climate Finance
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] h-6 gap-1">
            {districtName ? <MapPin className="h-3 w-3" /> : null}
            {districtName ? districtName : "National"}
          </Badge>
        </div>

        {/* From Policy Impact context banner */}
        {hasIntervention && (
          <Card className="border-sky-500/30 bg-sky-500/5">
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">Planning for: {proposalContext.projectName}</span>
                  {interventionParam ? <> · {interventionParam}</> : null} · {sectorLabel}
                  {focusGap && focusGap.gapMt > 0 && (
                    <> · still to cut by 2030: <span className="text-off-track font-semibold">+{formatMt(focusGap.gapMt, 1)}</span></>
                  )}
                </span>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
                <Link to="/policy-impact">Change intervention</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ───────────────── Q1: Current climate finance ───────────────── */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" />
              What climate finance is in Uganda now?
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Large active grants and concessional programmes from the major funders.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Total committed" value={formatUSD(totals.totalUSD)} sub={`${totals.count} programmes`} icon={Banknote} />
            <Tile label="Active now" value={formatUSD(totals.activeUSD)} sub="Disbursing" icon={CheckCircle2} tone="text-on-track" />
            <Tile label="In pipeline" value={formatUSD(totals.pipelineUSD)} sub="Approved / proposed" icon={ArrowRight} />
            <Tile
              label={hasIntervention ? `In ${sectorLabel}` : "Top funder"}
              value={hasIntervention ? formatUSD(sectorFinanceTotal) : (totals.byFunderType[0]?.type ?? "—")}
              sub={hasIntervention ? "Your sector" : formatUSD(totals.byFunderType[0]?.amountUSD ?? 0)}
              icon={Landmark}
            />
          </div>

          {/* Funder mix bar */}
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">By funder</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
                {totals.byFunderType.map((f) => (
                  <div
                    key={f.type}
                    className={cn("h-full", FUNDER_TONE[f.type]?.split(" ")[0] ?? "bg-muted")}
                    style={{ width: `${(f.amountUSD / totals.totalUSD) * 100}%` }}
                    title={`${f.type}: ${formatUSD(f.amountUSD)}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {totals.byFunderType.map((f) => (
                  <span key={f.type} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className={cn("inline-block h-2 w-2 rounded-sm", FUNDER_TONE[f.type]?.split(" ")[0] ?? "bg-muted")} />
                    {f.type} · {formatUSD(f.amountUSD)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {showAllFinance ? "All active programmes" : `Programmes in ${sectorLabel}`}
            </p>
            {hasIntervention && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowAllFinance((s) => !s)}>
                {showAllFinance ? "Show only my sector" : "Show all sectors"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {financeRows.map((r) => (
              <FinanceCard key={r.id} f={r} />
            ))}
            {financeRows.length === 0 && (
              <Card><CardContent className="p-4 text-[11px] text-muted-foreground">No major programmes recorded for this sector yet.</CardContent></Card>
            )}
          </div>
        </section>

        {/* ──────────── Q2: Opportunities for your intervention ─────────── */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Funding opportunities for your policy intervention
            </h3>
            <p className="text-[11px] text-muted-foreground">
              We screen the large MDBs and climate funds against your planned intervention, flag the likely
              challenges, and help you start a proposal.
            </p>
          </div>

          {!hasIntervention ? (
            <Card className="border-dashed">
              <CardContent className="p-4 flex flex-col items-start gap-2">
                <p className="text-xs text-foreground font-medium">Plan an intervention first</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
                  Go to the Policy Impact tool, choose your sector and policy intervention, then click
                  <span className="font-medium text-foreground"> “Find funding”</span>. We'll match it to funders here.
                </p>
                <Button asChild size="sm" className="h-7 text-xs gap-1.5 mt-1">
                  <Link to="/policy-impact">Open Policy Impact <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Ask summary + proposal CTA */}
              <Card className="border-primary/25">
                <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px]">
                    <p className="text-foreground">
                      Estimated funding need:{" "}
                      <span className="font-bold tabular-nums">{formatUSD(estimatedNeedUSD)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Rough order-of-magnitude for a {sectorLabel.toLowerCase()} programme at this scale — refine in the proposal.
                    </p>
                  </div>
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setProposalOpen(true)}>
                    <FileText className="h-3.5 w-3.5" />
                    Prepare funding proposal
                  </Button>
                </CardContent>
              </Card>

              {/* Matched funders */}
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-1.5">Funders that could fit</p>
                <div className="space-y-2">
                  {screening?.matches.map((m, i) => (
                    <FundMatchRow key={m.window.id} m={m} primary={i === 0} />
                  ))}
                </div>
              </div>

              {/* Challenges */}
              {screening && screening.challenges.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Potential challenges to flag early
                  </p>
                  <div className="space-y-2">
                    {screening.challenges.map((c) => (
                      <ChallengeCard key={c.id} c={c} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ──────────── MCF policy corpus (sector-matched) ───────────── */}
        {focusSectorId && (
          <section className="space-y-2">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Related fund project documents
              </h3>
              <p className="text-[11px] text-muted-foreground">
                CPR multilateral fund projects with searchable text — open for AI analysis or full-text search.
              </p>
            </div>
            <McfDocumentsPanel sectorId={focusSectorId} />
          </section>
        )}

        {/* ──────────── Article 6 carbon-credit revenue estimate ───────────── */}
        <CarbonCreditEstimate sectorLabel={sectorLabel} gapMt={focusGap?.gapMt ?? null} hasIntervention={hasIntervention} />

        <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          Screening tool for Uganda's climate projects — not investment advice. Current-finance figures are compiled
          from public funder portals (linked per programme) and are approximate; fund sizes are eligibility
          guidelines, not approval decisions. Verify against each funder's portal before use.
        </p>
      </div>

      {hasIntervention && (
        <FundingProposalDialog open={proposalOpen} onOpenChange={setProposalOpen} context={proposalContext} />
      )}
    </ScrollArea>
  );
}

/** Rough indicative carbon-credit revenue under Article 6.2 / 6.4. */
function CarbonCreditEstimate({
  sectorLabel,
  gapMt,
  hasIntervention,
}: {
  sectorLabel: string;
  gapMt: number | null;
  hasIntervention: boolean;
}) {
  // Assume credits could certify ~10% of the sector's remaining 2030 gap per year;
  // fall back to a small standalone project where no gap figure is available.
  const annualMt = gapMt && gapMt > 0 ? Math.max(0.05, gapMt * 0.1) : 0.2;
  const tonnes = annualMt * 1e6;
  const prices: { label: string; usd: number }[] = [
    { label: "Low", usd: 5 },
    { label: "Mid", usd: 12 },
    { label: "High", usd: 25 },
  ];
  return (
    <Card className="border-primary/20">
      <CardContent className="p-3 space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-primary" />
          Carbon-credit revenue (Article 6.2 / 6.4)
        </h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Rough estimate of annual revenue if {hasIntervention ? `${sectorLabel} ` : ""}reductions are certified and
          sold as credits — assuming ~{formatMt(annualMt, 2)}/yr of verified abatement
          {gapMt && gapMt > 0 ? ` (about 10% of the sector's remaining 2030 gap)` : ` (a small standalone project)`}.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {prices.map((p) => (
            <div key={p.label} className="rounded-md border border-border/60 p-2 text-center">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{p.label} · ${p.usd}/t</p>
              <p className="text-sm font-bold tabular-nums text-on-track">{formatUSD(tonnes * p.usd)}</p>
              <p className="text-[8px] text-muted-foreground">per year</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Indicative only. Real revenue depends on Article 6 eligibility, an approved methodology, MRV, buyer demand,
          and corresponding adjustments to avoid double-counting against Uganda's own NDC.
        </p>
      </CardContent>
    </Card>
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

function FinanceCard({ f }: { f: ActiveFinance }) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold text-foreground leading-tight">{f.programme}</p>
          <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{formatUSD(f.amountUSD)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[9px] h-4", FUNDER_TONE[f.funderType] ?? "")}>{f.funder}</Badge>
          <Badge variant="outline" className="text-[9px] h-4">{f.sectorLabel}</Badge>
          <Badge variant="outline" className="text-[9px] h-4">{f.instrument}</Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] h-4",
              f.status === "Active" ? "bg-on-track/10 text-on-track border-on-track/30"
                : f.status === "Pipeline" ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-sky-500/10 text-sky-600 border-sky-500/30",
            )}
          >
            {f.status} · {f.period}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">{f.focus}</p>
        <a
          href={f.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
        >
          Source: {f.sourceLabel}
          <ExternalLink className="h-2.5 w-2.5 opacity-70" aria-hidden />
        </a>
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
  const label: Record<FundFit, string> = { high: "Strong fit", medium: "Possible", low: "Weak fit", ineligible: "N/A" };
  return <Badge variant="outline" className={cn("text-[8px] h-4 shrink-0", style[fit])}>{label[fit]}</Badge>;
}

function FundMatchRow({ m, primary }: { m: FundMatch; primary?: boolean }) {
  return (
    <div className={cn("rounded-md border px-3 py-2 text-[11px]", primary ? "border-primary/40 bg-primary/5" : "border-border/60")}>
      <div className="flex items-center gap-2">
        {primary && <Badge variant="outline" className="text-[8px] h-4 border-primary/40 text-primary shrink-0">Start here</Badge>}
        <span className="font-semibold text-foreground">{m.window.name}</span>
        <FitBadge fit={m.fit} />
      </div>
      <p className="text-muted-foreground mt-1 leading-snug">{FIT_PLAIN_WHY[m.fit]} {m.rationale}</p>
      <p className="text-[10px] text-muted-foreground/80 mt-1">
        <span className="font-medium text-foreground/80">Route: </span>{m.window.proposalPath}
      </p>
    </div>
  );
}

function ChallengeCard({ c }: { c: FinanceChallenge }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-[11px] flex gap-2",
        c.severity === "warn" ? "border-amber-500/40 bg-amber-500/5" : "border-border/60",
      )}
    >
      {c.severity === "warn" ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
      ) : (
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div>
        <p className="font-semibold text-foreground">{c.title}</p>
        <p className="text-muted-foreground leading-snug mt-0.5">{c.detail}</p>
      </div>
    </div>
  );
}
