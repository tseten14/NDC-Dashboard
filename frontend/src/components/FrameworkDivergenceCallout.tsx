/**
 * Warning: the two frameworks do not line up.
 *
 * Uganda's NDC and Climate TRACE define sectors differently, so their numbers
 * are not always comparing the same thing. Where that matters this explains the
 * difference in place, rather than letting a reader assume a like-for-like
 * comparison.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import type { NdcSectorKey } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Absolute Mt gap that triggers an amber framework-mismatch note. */
const DELTA_MT_THRESHOLD = 5;
/** Relative gap vs NDC baseline (%) that also triggers the note. */
const DELTA_PCT_THRESHOLD = 25;

interface FrameworkDivergenceCalloutProps {
  selectedSector: string;
  className?: string;
}

/**
 * Explains TRACE vs NDC inventory frameworks and surfaces large
 * baseline_vs_trace_delta_mt gaps without forcing the series equal.
 */
export function FrameworkDivergenceCallout({
  selectedSector,
  className,
}: FrameworkDivergenceCalloutProps) {
  const [open, setOpen] = useState(false);
  const { progressBySector, isDistrictView } = useEmissionsData();

  const sectorKey = selectedSector as NdcSectorKey;
  const progress = progressBySector[sectorKey];

  const mismatch = useMemo(() => {
    if (isDistrictView || !progress) return null;
    const delta = progress.baseline_vs_trace_delta_mt;
    if (delta == null || !Number.isFinite(delta)) return null;
    const abs = Math.abs(delta);
    const baseline = progress.baseline_value;
    const pct = baseline !== 0 ? (abs / Math.abs(baseline)) * 100 : null;
    const triggered =
      abs >= DELTA_MT_THRESHOLD || (pct != null && pct >= DELTA_PCT_THRESHOLD);
    if (!triggered) return null;
    return {
      delta,
      abs,
      pct,
      baseline,
      latest: progress.latest_value,
      latestYear: progress.latest_year,
      label: progress.label || selectedSector,
    };
  }, [progress, isDistrictView, selectedSector]);

  if (isDistrictView) return null;

  return (
    <div className={cn("border-b border-border bg-muted/15", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        <Info className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          How to read these numbers
        </span>
        {mismatch && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-at-risk font-medium">
            <AlertTriangle className="h-3 w-3" />
            Framework gap
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <ul className="space-y-1.5 pl-3.5 list-disc marker:text-muted-foreground/60">
            <li>
              <span className="font-medium text-foreground">Climate TRACE</span> shows observed
              emissions (<code className="text-[10px]">co2e_100yr</code>) from satellites and models —
              independent of Uganda&apos;s national GHG inventory.
            </li>
            <li>
              <span className="font-medium text-foreground">NDC targets</span> use national inventory
              / BAU-relative ceilings. Progress % measures distance to the{" "}
              <span className="font-medium text-foreground">2030 NDC ceiling</span>, not a cut from
              2015.
            </li>
            <li>
              <span className="font-medium text-foreground">AFOLU</span> on this dashboard maps to
              Climate TRACE <code className="text-[10px]">forestry-and-land-use</code> only;
              agriculture is a separate sector bucket.
            </li>
            <li>
              Large TRACE vs NDC baseline gaps are expected across frameworks — we surface them; we
              do not force the series to match.
            </li>
          </ul>

          {mismatch && (
            <div
              className="rounded-md border border-at-risk/30 bg-at-risk/5 p-2 text-foreground"
              role="status"
            >
              <p className="font-medium text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-at-risk shrink-0" />
                {mismatch.label}: TRACE vs NDC baseline diverge
              </p>
              <p className="text-muted-foreground mt-1">
                NDC baseline {mismatch.baseline} Mt vs Climate TRACE{" "}
                {mismatch.latest != null ? `${mismatch.latest} Mt` : "—"}
                {mismatch.latestYear != null ? ` (${mismatch.latestYear})` : ""}. Δ{" "}
                <span className="font-mono">
                  {mismatch.delta > 0 ? "+" : ""}
                  {mismatch.delta.toFixed(2)} Mt
                </span>
                {mismatch.pct != null ? ` (~${mismatch.pct.toFixed(0)}% of baseline)` : ""}. This is
                a framework mismatch, not a dashboard calculation error.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
