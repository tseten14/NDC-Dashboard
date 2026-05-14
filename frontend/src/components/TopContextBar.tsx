import { strategies } from "@/data/uganda-strategy-data";
import { ugandaDistricts } from "@/data/uganda-districts";
import { useAppContext } from "@/hooks/use-app-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TopContextBar() {
  const { activeStrategy, setActiveStrategy, viewMode, setViewMode, validationFilter, setValidationFilter, districtFilter, setDistrictFilter } = useAppContext();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="px-4 py-1.5 border-b border-border bg-primary text-primary-foreground flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-tight">🇺🇬 Uganda — NDC & Strategy Explorer</h1>
        <Badge variant="outline" className="text-[9px] h-5 border-primary-foreground/30 text-primary-foreground/80">v1.0 Prototype</Badge>
      </div>
      <div className="px-4 py-1.5 flex flex-wrap items-center gap-3">
        {/* Strategy Toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Strategy</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            {[{ id: "all" as const, label: "All" }, ...strategies.filter(s => s.is_active).map(s => ({ id: s.id, label: s.name }))].map(s => (
              <button key={s.id} onClick={() => setActiveStrategy(s.id)}
                className={cn("px-2 py-1 text-[10px] font-medium transition-colors border-r border-input last:border-r-0",
                  activeStrategy === s.id ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">View</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["policy", "economic"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn("px-2.5 py-1 text-[10px] font-medium transition-colors border-r border-input last:border-r-0",
                  viewMode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                )}>
                {m === "policy" ? "Policy" : "Economic"}
              </button>
            ))}
          </div>
        </div>

        {/* Validation Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Validation</span>
          <Select value={validationFilter} onValueChange={(v) => setValidationFilter(v as any)}>
            <SelectTrigger className="w-[110px] h-6 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><span className="text-xs">All</span></SelectItem>
              <SelectItem value="verified"><span className="text-xs">Verified only</span></SelectItem>
              <SelectItem value="preliminary"><span className="text-xs">Preliminary only</span></SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* District filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">District</span>
          <Select value={districtFilter || "national"} onValueChange={(v) => setDistrictFilter(v === "national" ? null : v)}>
            <SelectTrigger className="w-[130px] h-6 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="national"><span className="text-xs">National</span></SelectItem>
              {ugandaDistricts.map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
