import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Info } from "lucide-react";
import { useEmissionsData } from "@/context/EmissionsDataContext";

export function DataCoveragePanel() {
  const [open, setOpen] = useState(false);
  const { coverage, dashboard, isApiReachable } = useEmissionsData();

  if (!isApiReachable && !coverage) return null;

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
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 text-xs text-muted-foreground leading-relaxed">
          <p className="text-foreground/90">
            This dashboard compares Uganda&apos;s latest observed greenhouse gas emissions from Climate TRACE
            (satellite and model-based estimates) with the country&apos;s NDC climate pledges. It shows measured
            trends and progress toward 2030 targets — not forecasts. Figures are indicative and do not replace
            official national MRV reporting.
          </p>
          <p>
            <span className="font-medium text-foreground">AFOLU</span> covers forests, farms, wetlands, and land
            use. <span className="font-medium text-foreground">Energy</span> covers power, buildings, and
            stationary fossil fuel use (not transport). <span className="font-medium text-foreground">Transport</span>{" "}
            covers road, aviation, and shipping. <span className="font-medium text-foreground">Waste</span> covers
            landfill and wastewater. <span className="font-medium text-foreground">IPPU</span> covers industrial
            processes and refrigerants. <span className="font-medium text-foreground">Agriculture</span> is tracked
            separately but contributes to the broader land-sector goal.
          </p>

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
                Climate TRACE API docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
