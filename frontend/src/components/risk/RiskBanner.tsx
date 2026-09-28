/**
 * Banner across the risk screens.
 *
 * States the status of the risk data being shown.
 */
// A missing hazard feed must not look like a low-risk assessment.
import { AlertTriangle } from "lucide-react";

export function RiskBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-1.5 text-[11px] text-foreground">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>Risk data unavailable.</strong> No verified hazard, exposure or vulnerability dataset
        is connected. This application cannot yet assess district risk or recommend adaptation spending.
      </span>
    </div>
  );
}
