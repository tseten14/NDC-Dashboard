/**
 * Dialog: see the raw source data.
 *
 * Shows the untouched response behind a figure on screen. The strongest form of
 * the app's data-honesty promise — anyone can look at exactly what came back
 * from Climate TRACE.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Database, GitBranch, RefreshCw, Shield, ChevronRight, Activity } from "lucide-react";
import { getLineage } from "@/lib/data-lineage";
import type { ClimatetraceApiSector } from "@/lib/emissions-integration";
import { cn } from "@/lib/utils";

export interface LiveSourceSnapshot {
  sector: string;
  gas?: string;
  gadmId?: string | null;
  geography?: "national" | "district" | string | null;
  districtName?: string | null;
  since?: number | null;
  to?: number | null;
  inventoryYear?: number | null;
  unit?: string;
  dataSource?: string | null;
  reconciliationDeltaMt?: number | null;
  reconciliationReferenceYear?: number | null;
  lastRefreshIso?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector: ClimatetraceApiSector | "economy-wide" | null;
  /** Live request fields from the current dashboard payload */
  liveSnapshot?: LiveSourceSnapshot | null;
}

export function ViewSourceModal({ open, onOpenChange, sector, liveSnapshot }: Props) {
  const lineage = getLineage(sector);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="text-sm font-bold">Data Lineage & Source Audit</DialogTitle>
          </div>
          {lineage && (
            <p className="text-xs text-muted-foreground mt-1">
              Technical provenance for{" "}
              <span className="font-medium text-foreground">{lineage.sectorLabel}</span> — for auditor
              verification
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          {!lineage ? (
            <div className="p-5 text-xs text-muted-foreground">No lineage data available for this sector.</div>
          ) : (
            <div className="p-5 space-y-5">
              {liveSnapshot && (
                <>
                  <Section title="This request (live)" icon={Activity}>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Snapshot of the payload currently driving the dashboard — not methodology notes.
                    </p>
                    <MonoRow label="Sector" value={liveSnapshot.sector} />
                    <MonoRow label="Gas" value={liveSnapshot.gas ?? "co2e_100yr"} />
                    <MonoRow label="GADM" value={liveSnapshot.gadmId ?? "UGA"} />
                    <MonoRow
                      label="Geography"
                      value={
                        liveSnapshot.districtName
                          ? `district (${liveSnapshot.districtName})`
                          : liveSnapshot.geography ?? "national"
                      }
                    />
                    <MonoRow
                      label="Year range"
                      value={
                        liveSnapshot.since != null && liveSnapshot.to != null
                          ? `${liveSnapshot.since}–${liveSnapshot.to}`
                          : "—"
                      }
                    />
                    <MonoRow
                      label="Inventory year"
                      value={
                        liveSnapshot.inventoryYear != null
                          ? String(liveSnapshot.inventoryYear)
                          : "—"
                      }
                    />
                    <MonoRow label="Unit" value={liveSnapshot.unit ?? "MtCO2e"} />
                    <MonoRow label="Data source" value={liveSnapshot.dataSource ?? "—"} />
                    {liveSnapshot.reconciliationDeltaMt != null &&
                      liveSnapshot.reconciliationReferenceYear != null && (
                        <MonoRow
                          label="Recon Δ"
                          value={`${liveSnapshot.reconciliationDeltaMt} Mt (${liveSnapshot.reconciliationReferenceYear})`}
                        />
                      )}
                    {liveSnapshot.lastRefreshIso && (
                      <MonoRow
                        label="Updated"
                        value={new Date(liveSnapshot.lastRefreshIso).toLocaleString("en-UG")}
                      />
                    )}
                  </Section>
                  <Separator />
                </>
              )}

              <Section title="Data references (methodology notes)" icon={Database}>
                <MonoRow label="API endpoint" value={lineage.apiEndpoint} />
                <MonoRow label="Raw table" value={lineage.rawTable} />
                <MonoRow label="Harmonised view" value={lineage.harmonisedView} />
                <MonoRow label="Data version" value={lineage.dataVersion} />
                <MonoRow label="Refresh cadence" value={lineage.refreshCadence} />
              </Section>

              <Separator />

              <Section title="Methodology notes" icon={Shield}>
                <p className="text-xs text-foreground leading-relaxed">{lineage.methodology}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <span className="font-medium">Uncertainty: </span>
                  {lineage.uncertaintyNote}
                </p>
              </Section>

              <Separator />

              <Section title="Data pipeline (methodology notes)" icon={GitBranch}>
                <ol className="space-y-1.5">
                  {lineage.pipelineStages.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold w-4 h-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          {i + 1}
                        </span>
                        {i < lineage.pipelineStages.length - 1 && (
                          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground">{s.stage}: </span>
                        <span className="text-xs text-muted-foreground">{s.description}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>

              <Separator />

              <Section title="Primary sources" icon={RefreshCw}>
                <div className="flex flex-wrap gap-1.5">
                  {lineage.primarySources.map((src) => (
                    <Badge key={src} variant="outline" className="text-[10px] h-5 font-normal">
                      {src}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Separator />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  View publicly accessible dataset on Climate TRACE
                </p>
                <a
                  href={lineage.ctPublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline",
                  )}
                >
                  Open Climate TRACE
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function MonoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0 w-[110px] pt-0.5">{label}</span>
      <code className="text-[10px] font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded break-all">
        {value}
      </code>
    </div>
  );
}
