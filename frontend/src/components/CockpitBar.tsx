// Cockpit-wide context bar: scope toggles affecting all primary pages.
import { useCockpit } from "@/hooks/use-cockpit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ugandaDistricts } from "@/data/uganda-districts";

export function CockpitBar() {
  const c = useCockpit();
  return (
    <div className="border-b border-border bg-card px-3 py-2 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Geography</span>
        <Select value={c.geography} onValueChange={(v: "National" | "District") => c.setGeography(v)}>
          <SelectTrigger className="h-6 w-24 text-[10px]" aria-label="Select geography scope"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="National">National</SelectItem>
            <SelectItem value="District">District</SelectItem>
          </SelectContent>
        </Select>
        {c.geography === "District" && (
          <Select value={c.district} onValueChange={c.setDistrict}>
            <SelectTrigger className="h-6 w-32 text-[10px]" aria-label="Select district"><SelectValue placeholder="Pick district" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {ugandaDistricts.map(d => <SelectItem key={d} value={d} className="text-[10px]">{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
