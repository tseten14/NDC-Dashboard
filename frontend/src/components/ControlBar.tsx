import { type SectorId, type TimeMode, type GeographyLevel, sectorDefinitions, getDataCompleteness, getLastRefreshTimestamp } from "@/data/uganda-ndc-data";
import { ugandaDistricts } from "@/data/uganda-districts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, FileSpreadsheet, FileText, Database, Clock } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ControlBarProps {
  selectedSector: SectorId;
  onSectorChange: (sector: SectorId) => void;
  geographyLevel: GeographyLevel;
  onGeographyChange: (level: GeographyLevel) => void;
  selectedDistrictId: string | null;
  onDistrictChange: (district: string | null) => void;
  timeMode: TimeMode;
  onTimeModeChange: (mode: TimeMode) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function ControlBar({
  selectedSector, onSectorChange,
  geographyLevel, onGeographyChange,
  selectedDistrictId, onDistrictChange,
  timeMode, onTimeModeChange,
  isRefreshing, onRefresh,
}: ControlBarProps) {
  const completeness = getDataCompleteness();
  const lastRefresh = getLastRefreshTimestamp();
  const formattedTime = new Date(lastRefresh).toLocaleDateString("en-UG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
      {/* Title row */}
      <div className="px-4 py-2 border-b border-border bg-primary text-primary-foreground">
        <h1 className="text-base font-bold tracking-tight">🇺🇬 NDC Data Explorer – Uganda</h1>
      </div>

      {/* Controls row */}
      <div className="px-4 py-2 flex flex-wrap items-center gap-3">
        {/* Sector selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sector</span>
          <Select value={selectedSector} onValueChange={(v) => onSectorChange(v as SectorId)}>
            <SelectTrigger className="w-[150px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sectorDefinitions.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="text-xs">{s.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Geography toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Geography</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              onClick={() => onGeographyChange("national")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                geographyLevel === "national"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              National
            </button>
            <button
              onClick={() => onGeographyChange("district")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors border-l border-input",
                geographyLevel === "district"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              District
            </button>
          </div>
          {geographyLevel === "district" && (
            <Select value={selectedDistrictId || ""} onValueChange={(v) => onDistrictChange(v || null)}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {ugandaDistricts.map(d => (
                  <SelectItem key={d} value={d}>
                    <span className="text-xs">{d}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Time mode toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Time</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              onClick={() => onTimeModeChange("historical")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                timeMode === "historical"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Historical
            </button>
            <button
              onClick={() => onTimeModeChange("projection")}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors border-l border-input",
                timeMode === "projection"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Projection
            </button>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="gap-1 text-[10px] h-6">
            <Database className="h-3 w-3" />
            {completeness}% complete
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px] h-6">
            <Clock className="h-3 w-3" />
            {formattedTime}
          </Badge>

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-1 h-7 text-xs">
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                <Download className="h-3 w-3" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { exportToExcel(); toast.success("Excel exported"); }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportToPDF(); toast.success("PDF exported"); }}>
                <FileText className="h-4 w-4 mr-2" />Export Key Stats (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
