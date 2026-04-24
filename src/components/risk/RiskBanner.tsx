// Persistent banner reminding users that prototype risk data is illustrative only.
import { AlertTriangle } from "lucide-react";

export function RiskBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-900 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>Illustrative prototype</strong> — not official risk results. All values, geometries and
        provenance fields shown here are placeholders for UI testing only.
      </span>
    </div>
  );
}