import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DataLineage {
  source: string;
  asOf: string | null;
  isEstimated: boolean;
  isValidated: boolean;
}

interface DataLineageChipProps {
  lineage: DataLineage;
  className?: string;
}

export const DataLineageChip = memo(function DataLineageChip({ lineage, className }: DataLineageChipProps) {
  const asOfLabel = lineage.asOf
    ? new Date(lineage.asOf).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <Badge variant="outline" className="text-[8px] h-4 px-1 font-normal">
        {lineage.source}
      </Badge>
      <Badge variant="outline" className="text-[8px] h-4 px-1 font-normal text-muted-foreground">
        as of {asOfLabel}
      </Badge>
      {lineage.isEstimated && (
        <Badge variant="outline" className="text-[8px] h-4 px-1 font-normal text-muted-foreground border-border">
          estimated
        </Badge>
      )}
      {lineage.isValidated ? (
        <Badge variant="outline" className="text-[8px] h-4 px-1 font-normal text-on-track border-on-track/30">
          validated
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[8px] h-4 px-1 font-normal text-muted-foreground border-border">
          unverified
        </Badge>
      )}
    </span>
  );
});
