/**
 * Bar showing progress toward a sector's target.
 *
 * Coloured by status so on track and off track are distinguishable without
 * reading the number.
 */
import { memo } from "react";
import { type Sector, getProgressPercent, getSectorStatus } from "@/data/climate-data";
import { cn } from "@/lib/utils";

export const SectorProgressBar = memo(function SectorProgressBar({ sector }: { sector: Sector }) {
  const progress = getProgressPercent(sector);
  const status = getSectorStatus(sector);
  const Icon = sector.icon;

  const statusColors = {
    "on-track": "bg-on-track",
    "at-risk": "bg-at-risk",
    "off-track": "bg-off-track",
  };

  const statusLabels = {
    "on-track": "On Track",
    "at-risk": "At Risk",
    "off-track": "Off Track",
  };

  const statusTextColors = {
    "on-track": "status-on-track",
    "at-risk": "status-at-risk",
    "off-track": "status-off-track",
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{sector.name}</span>
      </div>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full progress-fill-animate", statusColors[status])}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold w-12 text-right">{progress}%</span>
      <span className={cn("text-xs font-medium w-16 text-right", statusTextColors[status])}>
        {statusLabels[status]}
      </span>
    </div>
  );
});
