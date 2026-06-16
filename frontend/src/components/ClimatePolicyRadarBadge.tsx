import { BookOpen, ExternalLink } from "lucide-react";
import { CLIMATE_POLICY_RADAR_URL, CPR_PASSAGE_ATTRIBUTION } from "@/lib/policy-lineage";

export function ClimatePolicyRadarBadge({ className }: { className?: string }) {
  return (
    <a
      href={CLIMATE_POLICY_RADAR_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={CPR_PASSAGE_ATTRIBUTION}
      className={
        className ??
        "inline-flex items-center gap-1.5 shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm hover:bg-primary/15 hover:border-primary/50 transition-colors"
      }
    >
      <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Climate Policy Radar
      <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
    </a>
  );
}
