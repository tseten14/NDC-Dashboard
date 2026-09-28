/**
 * Screen: MWP Marketplace — Uganda deal room workspace.
 *
 * Shows Uganda's implementation pipeline: projects that have been packaged as
 * pitches for funders, with their current stage and readiness status. Each card
 * links into the deal room for that project.
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { marketplaceApi } from "@/lib/api";
import { stageTone, fmtUSD, type DealPitch } from "@/data/mwp-marketplace-data";
import { useOperatorSession } from "@/hooks/use-operator-session";
import { DealFormDialog } from "@/components/marketplace/DealFormDialog";
import {
  Store, ArrowRight, CheckCircle2, Circle, MapPin, Banknote, Leaf, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ReadinessBar({ pitch }: { pitch: DealPitch }) {
  const met = pitch.readiness.filter((r) => r.met).length;
  const total = pitch.readiness.length;
  const pct = total > 0 ? Math.round((met / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 "
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground tabular-nums shrink-0">{met}/{total} ready</span>
    </div>
  );
}

function PipelineCard({ pitch }: { pitch: DealPitch }) {
  return (
    <Link
      to={`/mwp-marketplace/${pitch.id}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="h-full     ">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground leading-snug  ">
                {pitch.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{pitch.ministry}</p>
            </div>
            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 shrink-0", stageTone(pitch.stage))}>
              {pitch.stage}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {pitch.sector}
            </span>
            <span className="flex items-center gap-1">
              <Banknote className="h-3 w-3" /> {fmtUSD(pitch.askM)} ask
            </span>
            <span className="flex items-center gap-1">
              <Leaf className="h-3 w-3" /> <span title="Expected annual reduction, in million tonnes of carbon dioxide equivalent">{pitch.annualMtCO2e} million tonnes CO₂e/year (estimate)</span>
            </span>
          </div>

          <ReadinessBar pitch={pitch} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {pitch.evaluation?.decision === "interest" && (
                <><CheckCircle2 className="h-3 w-3 text-on-track" /> Funder interest</>
              )}
              {pitch.evaluation?.decision === "questions" && (
                <><Circle className="h-3 w-3 text-at-risk" /> Questions pending</>
              )}
              {pitch.evaluation?.decision === "pass" && (
                <><Circle className="h-3 w-3 text-muted-foreground" /> Not ready</>
              )}
            </div>
            <span className="text-[10px] text-primary opacity-0   flex items-center gap-0.5">
              Open deal room <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MwpMarketplace() {
  const [searchParams] = useSearchParams();
  const fromClimateFinance = searchParams.get("from") === "climate-finance";
  const sectorParam = searchParams.get("sector");
  const { authenticated } = useOperatorSession();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const dealsQuery = useQuery({
    queryKey: ["marketplace", "deals"],
    queryFn: () => marketplaceApi.listDeals(),
    staleTime: 60_000,
  });

  const deals = useMemo<DealPitch[]>(() => dealsQuery.data?.deals ?? [], [dealsQuery.data]);

  const highlighted = useMemo(() => {
    if (!fromClimateFinance || !sectorParam || deals.length === 0) return null;
    const s = sectorParam.toLowerCase();
    return deals.find((d) => d.sectorId.toLowerCase() === s) ?? null;
  }, [fromClimateFinance, sectorParam, deals]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Marketplace
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Submitted project pipeline. Package projects as investment pitches,
              track funder evaluation, and follow delivery milestones — from NDC gap to
              first disbursement. Funding requests, expected emissions savings and review outcomes
              are supplied by contributors and require independent verification.
            </p>
          </div>
          {authenticated && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add to pipeline
            </Button>
          )}
        </div>

        {/* Handoff banner */}
        {highlighted && fromClimateFinance && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                <span className="font-semibold text-foreground">From Climate Finance screening</span>
                {" → "}best match: <span className="font-medium">{highlighted.title}</span>
              </span>
              <Button size="sm" variant="default" className="h-7 text-[11px] gap-1" asChild>
                <Link to={`/mwp-marketplace/${highlighted.id}`}>
                  Open deal room <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pipeline */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Your pipeline</h3>

          {dealsQuery.isLoading && (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading pipeline…</p>
          )}

          {dealsQuery.isError && (
            <Card>
              <CardContent className="p-4 text-xs text-muted-foreground text-center">
                Could not load the pipeline. {(dealsQuery.error as Error)?.message}
              </CardContent>
            </Card>
          )}

          {!dealsQuery.isLoading && !dealsQuery.isError && deals.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No deals in the pipeline yet.</p>
                {authenticated && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3 w-3" /> Create the first deal
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {deals.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((d) => (
                <PipelineCard key={d.id} pitch={d} />
              ))}
            </div>
          )}
        </section>
      </div>

      {authenticated && (
        <DealFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["marketplace", "deals"] })}
        />
      )}
    </ScrollArea>
  );
}
