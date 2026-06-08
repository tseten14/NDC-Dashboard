import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataProvenanceBadgeProps {
  count?: number;
  source?: string;
  className?: string;
}

/** Marks observed values that came from mapped file ingest (postgres observations). */
export function DataProvenanceBadge({ count, source, className }: DataProvenanceBadgeProps) {
  const label = count != null && count > 0 ? `Ingested (${count})` : "Ingested";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "text-[8px] h-4 gap-0.5 shrink-0 cursor-help border-primary/40 bg-primary/5 text-primary",
            className,
          )}
        >
          <Upload className="h-2.5 w-2.5" />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">
        <p className="text-xs">
          {source
            ? `These points were imported from a file (${source}) and stored in the observations database. They are not yet validated MRV data.`
            : "These points were imported via Data Ingestion and stored in the observations database. They are not yet validated MRV data."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
