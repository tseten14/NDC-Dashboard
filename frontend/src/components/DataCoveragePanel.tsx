import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Info } from "lucide-react";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { ndcTargets } from "@/data/uganda-ndc-data";
import { getClimateTraceSectorForTarget } from "@/lib/emissions-integration";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SECTOR_LABEL: Record<string, string> = {
  afolu: "AFOLU",
  energy: "ENERGY",
  ippu: "IPPU",
  agriculture: "AGRICULTURE",
  waste: "WASTE",
};

export function DataCoveragePanel() {
  const [open, setOpen] = useState(false);
  const { reconciliation, coverage, progressBySector, dashboard, isApiReachable } = useEmissionsData();

  if (!isApiReachable && !coverage) return null;

  const mtTargets = ndcTargets.filter((t) => getClimateTraceSectorForTarget(t));

  return (
    <div className="border-b border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <Info className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">Data coverage & methodology</span>
        {reconciliation?.delta_mt != null && Math.abs(reconciliation.delta_mt) > 0.05 && (
          <Badge variant="outline" className="text-[10px] h-5 ml-1">
            Reconciliation Δ {reconciliation.delta_mt} Mt
          </Badge>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs text-muted-foreground">
          {coverage?.methodology && <p className="text-foreground/90 leading-relaxed">{coverage.methodology}</p>}

          {reconciliation && (
            <div className="rounded-md border border-border bg-card p-2 space-y-1 font-mono text-[11px]">
              <p className="font-sans font-semibold text-foreground text-xs mb-1">
                Country reconciliation ({reconciliation.reference_year})
              </p>
              <p>
                Climate TRACE country total:{" "}
                <span className="text-foreground">{reconciliation.country_total_mt ?? "—"} Mt</span>
              </p>
              <p>
                Sum of all TRACE slugs (incl. mineral-extraction):{" "}
                <span className="text-foreground">{reconciliation.sector_sum_mt ?? "—"} Mt</span>
              </p>
              <p>
                Sum of 5 NDC UI sectors:{" "}
                <span className="text-foreground">{reconciliation.ui_sector_sum_mt ?? "—"} Mt</span>
              </p>
              {reconciliation.unmapped_slugs?.length > 0 && (
                <p className="font-sans">
                  Unmapped slugs (national total only): {reconciliation.unmapped_slugs.join(", ")}
                </p>
              )}
            </div>
          )}

          {mtTargets.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
              {mtTargets.map((t) => {
                const sector = getClimateTraceSectorForTarget(t);
                const pr = sector ? progressBySector[sector] : undefined;
                const delta = pr?.baseline_vs_trace_delta_mt;
                return (
                  <div key={t.id} className="rounded-md border border-border bg-card p-2 space-y-1 text-[11px]">
                    <p className="font-semibold text-foreground text-xs line-clamp-2">{t.targetText}</p>
                    <p>
                      <span className="text-muted-foreground">NDC baseline: </span>
                      <span className="font-mono text-foreground">
                        {pr?.baseline_value ?? t.baselineValue} Mt ({pr?.baseline_year ?? t.baselineYear})
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">TRACE latest: </span>
                      <span className="font-mono text-foreground">
                        {pr?.latest_value != null ? `${pr.latest_value} Mt (${pr.latest_year})` : "—"}
                      </span>
                    </p>
                    <p className={cn(delta != null && Math.abs(delta) > 5 && "text-at-risk font-medium")}>
                      <span className="text-muted-foreground">Δ (obs − policy): </span>
                      <span className="font-mono">
                        {delta != null ? `${delta >= 0 ? "+" : ""}${delta} Mt` : "—"}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {coverage?.sector_scope_notes && (
            <ul className="list-disc pl-4 space-y-0.5">
              {Object.entries(coverage.sector_scope_notes).map(([key, note]) => (
                <li key={key}>
                  <span className="font-semibold text-foreground">{SECTOR_LABEL[key] ?? key}:</span> {note}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="/api/v1/provenance"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              API provenance <ExternalLink className="h-3 w-3" />
            </a>
            {dashboard?.api_docs_url && (
              <a
                href={dashboard.api_docs_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Climate TRACE v7 docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
