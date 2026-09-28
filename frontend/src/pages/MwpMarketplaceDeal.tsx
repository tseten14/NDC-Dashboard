/**
 * Screen: MWP Marketplace deal room for a single project.
 *
 * Three sections on one page:
 *  - Pitch — the investment brief
 *  - Evaluation — funder diligence scorecard
 *  - Delivery — milestone board
 */
import { useState } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { marketplaceApi } from "@/lib/api";
import { stageTone, fmtUSD } from "@/data/mwp-marketplace-data";
import type { EvalCriterion, Milestone, DealPitch } from "@/data/mwp-marketplace-data";
import { useOperatorSession } from "@/hooks/use-operator-session";
import { DealFormDialog } from "@/components/marketplace/DealFormDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Target, MapPin, Building2, Banknote, Leaf, FileText,
  CheckCircle2, Circle, AlertCircle, ExternalLink, BarChart3,
  Pencil, Trash2,
} from "lucide-react";

/* ── Score styling ───────────────────────────────────────────────────── */

const SCORE_STYLE: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  strong:   { icon: CheckCircle2, color: "text-on-track", label: "Strong" },
  adequate: { icon: Circle,       color: "text-at-risk",   label: "Adequate" },
  weak:     { icon: AlertCircle,  color: "text-off-track",     label: "Weak" },
};

const DECISION_STYLE: Record<string, { bg: string; label: string }> = {
  interest:  { bg: "bg-muted text-on-track border-border", label: "Funder interest expressed" },
  questions: { bg: "bg-muted text-at-risk border-border",       label: "Questions pending" },
  pass:      { bg: "bg-muted text-off-track border-border",           label: "Not ready — needs more work" },
};

/* ── Sub-components ──────────────────────────────────────────────────── */

function EvidenceLink({ href, label }: { href: string; label: string }) {
  return (
    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" asChild>
      <Link to={href}>
        <ExternalLink className="h-3 w-3" />
        {label}
      </Link>
    </Button>
  );
}

function CriterionRow({ c }: { c: EvalCriterion }) {
  const s = SCORE_STYLE[c.score] ?? SCORE_STYLE.adequate;
  const Icon = s.icon;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0">
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", s.color)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{c.criterion}</span>
          <Badge variant="outline" className={cn("text-[9px] h-4 px-1", s.color, "border-current/30")}>
            {s.label}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{c.rationale}</p>
      </div>
    </div>
  );
}

function MilestoneRow({ m }: { m: Milestone }) {
  const isDone = m.status === "done";
  const isCurrent = m.status === "current";
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0 w-5">
        <div className={cn(
          "h-3 w-3 rounded-full border-2 mt-1",
          isDone    && "bg-on-track border-border",
          isCurrent && "bg-primary border-primary ring-2 ring-primary/20",
          !isDone && !isCurrent && "bg-background border-muted-foreground/40",
        )} />
        <div className="w-0.5 flex-1 bg-border/60 mt-1" />
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <p className={cn(
          "text-xs font-medium",
          isDone    && "text-muted-foreground line-through",
          isCurrent && "text-foreground",
          !isDone && !isCurrent && "text-muted-foreground",
        )}>
          {m.label}
        </p>
        {m.date && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{m.date}</p>
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

type DealTab = "pitch" | "evaluate" | "deliver";

export default function MwpMarketplaceDeal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DealTab>("pitch");
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { authenticated } = useOperatorSession();
  const queryClient = useQueryClient();

  const dealQuery = useQuery({
    queryKey: ["marketplace", "deal", id],
    queryFn: () => marketplaceApi.getDeal(id!),
    enabled: !!id,
  });

  if (dealQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading deal…
      </div>
    );
  }

  const deal: DealPitch | undefined = dealQuery.data?.deal;
  if (!deal) return <Navigate to="/mwp-marketplace" replace />;

  const ev = deal.evaluation;
  const ds = DECISION_STYLE[ev?.decision] ?? DECISION_STYLE.questions;

  async function handleDelete() {
    if (!confirm("Remove this deal from the pipeline? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await marketplaceApi.deleteDeal(deal!.id);
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      toast.success("Deal removed from pipeline");
      navigate("/mwp-marketplace");
    } catch (err) {
      toast.error((err as Error).message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5 max-w-4xl">
        {/* Back + header */}
        <div>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 -ml-2 mb-2 text-muted-foreground" asChild>
            <Link to="/mwp-marketplace">
              <ArrowLeft className="h-3 w-3" /> Back to pipeline
            </Link>
          </Button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-foreground">{deal.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{deal.ministry}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", stageTone(deal.stage))}>
                {deal.stage}
              </Badge>
              {authenticated && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1 text-destructive border-destructive/30 "
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">Project information is supplied by contributors. Funding, review outcomes and expected emissions reductions require independent verification.</p>
        {/* Tab switcher */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as DealTab)}>
          <TabsList className="h-9">
            <TabsTrigger value="pitch" className="text-xs gap-1 h-7">
              <FileText className="h-3 w-3" /> Pitch
            </TabsTrigger>
            <TabsTrigger value="evaluate" className="text-xs gap-1 h-7">
              <BarChart3 className="h-3 w-3" /> Evaluation
            </TabsTrigger>
            <TabsTrigger value="deliver" className="text-xs gap-1 h-7">
              <CheckCircle2 className="h-3 w-3" /> Delivery
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── PITCH TAB ──────────────────────────────────────────── */}
        {tab === "pitch" && (
          <div className="space-y-5">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Problem</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{deal.problem}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Intervention</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{deal.intervention}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                    <Banknote className="h-3 w-3" /> Funding ask
                  </div>
                  <p className="text-base font-bold text-foreground">{fmtUSD(deal.askM)}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtUSD(deal.coFinanceM)} co-finance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                    <Leaf className="h-3 w-3" /> Expected annual reduction
                  </div>
                  <p className="text-base font-bold text-foreground" title="Million tonnes of greenhouse gases expressed as carbon dioxide equivalent, per year">{deal.annualMtCO2e} million tonnes CO₂e/year</p>
                  <p className="text-[10px] text-muted-foreground">{deal.instrument}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3" /> Geography
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug">{deal.geography}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                    <Building2 className="h-3 w-3" /> Sector
                  </div>
                  <p className="text-xs font-medium text-foreground">{deal.sector}</p>
                  <p className="text-[10px] text-muted-foreground">{deal.ministry}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-start gap-2">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-medium text-primary uppercase tracking-wide">NDC target</p>
                  <p className="text-sm text-foreground mt-0.5">{deal.ndcTarget}</p>
                </div>
              </CardContent>
            </Card>

            {deal.readiness?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Funder readiness</h3>
                  <div className="grid gap-1.5">
                    {deal.readiness.map((r) => (
                      <div key={r.label} className="flex items-center gap-2 text-xs">
                        {r.met ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-on-track shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={r.met ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {deal.evidence && (
              <div className="flex flex-wrap gap-2">
                {deal.evidence.dashboardHref && <EvidenceLink href={deal.evidence.dashboardHref} label="Dashboard evidence" />}
                {deal.evidence.policyImpactHref && <EvidenceLink href={deal.evidence.policyImpactHref} label="Policy Impact" />}
                {deal.evidence.climateFinanceHref && <EvidenceLink href={deal.evidence.climateFinanceHref} label="Climate Finance screening" />}
              </div>
            )}
          </div>
        )}

        {/* ── EVALUATE TAB ───────────────────────────────────────── */}
        {tab === "evaluate" && ev && (
          <div className="space-y-5">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Evaluating funder</p>
                    <p className="text-sm font-semibold text-foreground">{ev.funder}</p>
                    <p className="text-xs text-muted-foreground">{ev.window}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] h-5 px-2", ds.bg)}>
                    {ds.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{ev.summary}</p>
              </CardContent>
            </Card>

            {ev.criteria?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Diligence scorecard</h3>
                  <div>
                    {ev.criteria.map((c) => (
                      <CriterionRow key={c.criterion} c={c} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border bg-muted">
              <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">What this means for you</p>
                <p>
                  This scorecard reflects how a funder evaluates your pitch. Items scored
                  "weak" need work before you can advance. Items scored "adequate" can
                  proceed but expect follow-up questions. Work on the weakest criteria first.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── DELIVER TAB ────────────────────────────────────────── */}
        {tab === "deliver" && (
          <div className="space-y-5">
            {deal.milestones?.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Delivery milestones</h3>
                  <div>
                    {deal.milestones.map((m) => (
                      <MilestoneRow key={m.label} m={m} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No milestones defined yet.
                </CardContent>
              </Card>
            )}

            {(() => {
              const current = deal.milestones?.find((m) => m.status === "current");
              if (!current) return null;
              return (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-3 text-xs">
                    <p className="font-semibold text-foreground mb-0.5">Current step</p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">{current.label}</span>
                      {current.date && <> — target {current.date}</>}
                    </p>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </div>

      {authenticated && (
        <DealFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          deal={deal}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["marketplace"] });
          }}
        />
      )}
    </ScrollArea>
  );
}
