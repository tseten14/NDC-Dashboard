import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DataHonestyKind = "live" | "indicative" | "illustrative";

const STYLES: Record<DataHonestyKind, string> = {
  live: "bg-on-track/10 text-on-track border-on-track/30",
  indicative: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  illustrative: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<DataHonestyKind, string> = {
  live: "Live",
  indicative: "Indicative",
  illustrative: "Illustrative",
};

interface DataHonestyBadgeProps {
  kind: DataHonestyKind;
  className?: string;
}

export function DataHonestyBadge({ kind, className }: DataHonestyBadgeProps) {
  return (
    <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 font-medium", STYLES[kind], className)}>
      {LABELS[kind]}
    </Badge>
  );
}
