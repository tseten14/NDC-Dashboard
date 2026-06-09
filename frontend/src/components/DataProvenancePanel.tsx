import { ExternalLink, X, Database, Cpu, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLineage } from "@/lib/data-lineage";
import type { ClimatetraceApiSector } from "@/lib/emissions-integration";

interface Props {
  year: number;
  value: number;
  unit: string;
  sector: ClimatetraceApiSector | "economy-wide" | null;
  sectorLabel: string;
  onDismiss: () => void;
  className?: string;
}

export function DataProvenancePanel({ year, value, unit, sector, sectorLabel, onDismiss, className }: Props) {
  const lineage = getLineage(sector);

  return (
    <div
      className={cn(
        "relative rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs",
        className,
      )}
      role="status"
      aria-label="Data provenance for selected point"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close provenance panel"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Header row */}
      <div className="flex items-start gap-2 pr-6">
        <Database className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-foreground">
            {year} · {value} {unit}
          </p>
          <p className="text-muted-foreground">
            {sectorLabel} emissions — Climate TRACE satellite model
          </p>
        </div>
      </div>

      {lineage ? (
        <>
          <div className="mt-2.5 pl-5 space-y-1.5">
            <Row label="Data version" value={lineage.dataVersion} />
            <Row label="Methodology" value={lineage.methodology} />
            <Row label="Refresh" value={lineage.refreshCadence} />
            <Row label="Uncertainty" value={lineage.uncertaintyNote} />
            <div className="flex items-start gap-2 pt-0.5">
              <span className="text-muted-foreground shrink-0 w-[80px]">Primary sources</span>
              <span className="text-foreground font-medium leading-relaxed">
                {lineage.primarySources.join(" · ")}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pl-5 flex items-center gap-3 flex-wrap">
            <a
              href={lineage.ctPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              View on Climate TRACE
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground font-mono">{lineage.apiEndpoint.split("?")[0]}</span>
          </div>
        </>
      ) : (
        <div className="mt-2 pl-5 flex items-center gap-1.5 text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>No detailed lineage available for this series.</span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground shrink-0 w-[80px]">{label}</span>
      <span className="text-foreground font-medium leading-relaxed">{value}</span>
    </div>
  );
}
