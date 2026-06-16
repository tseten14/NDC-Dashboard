import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Info } from "lucide-react";
import { useEmissionsData } from "@/context/EmissionsDataContext";

export function DataCoveragePanel() {
  const [open, setOpen] = useState(false);
  const { coverage, isApiReachable } = useEmissionsData();

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

          <div className="space-y-1.5">
            <p className="font-medium text-foreground">What&apos;s being analysed</p>
            <ul className="space-y-1 pl-3.5 list-disc marker:text-muted-foreground/60">
              <li>
                <span className="font-medium text-foreground">Source:</span> Climate TRACE API v7 — satellite
                earth observation, facility-level data, and sector models, refreshed monthly. National series
                from 2015; district-level (56 districts) from 2021.
              </li>
              <li>
                <span className="font-medium text-foreground">Targets:</span> Uganda&apos;s Updated NDC (2022) —
                economy-wide and per-sector pledges, plus physical indicators (forest cover, renewable capacity,
                access). All emissions are shown in MtCO₂e.
              </li>
              <li>
                <span className="font-medium text-foreground">Three columns:</span> Targets (NDC pledges),
                Observed (live Climate TRACE emissions), and Progress (on-track scoring against the 2030 goal).
              </li>
              <li>
                <span className="font-medium text-foreground">Progress method:</span> ceiling/BAU-cap targets are
                scored against the no-new-policy trend and the 2030 limit; reduction and increase targets are
                scored against their baseline. District views show local emissions only — national NDC progress
                is not scored at district level.
              </li>
            </ul>
          </div>

          <p>
            <span className="font-medium text-foreground">AFOLU</span> (Agriculture, Forestry &amp; Other Land Use)
            covers forests, farms, wetlands, and land use. <span className="font-medium text-foreground">Energy</span>{" "}
            covers power, buildings, and stationary fossil fuel use (not transport).{" "}
            <span className="font-medium text-foreground">Transport</span> covers road, aviation, and shipping.{" "}
            <span className="font-medium text-foreground">Waste</span> covers landfill and wastewater.{" "}
            <span className="font-medium text-foreground">IPPU</span> (Industrial Processes &amp; Product Use) covers
            industrial processes and refrigerants. <span className="font-medium text-foreground">Agriculture</span> is
            tracked separately but contributes to the broader land-sector goal.
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
          </div>
        </div>
      )}
    </div>
  );
}
