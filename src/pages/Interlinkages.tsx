import { useMemo, useState } from "react";
import { interlinkages, getIndicator, type SectorV2, type Confidence } from "@/data/uganda-v2-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

const confidenceColor: Record<Confidence, string> = {
  Low: "bg-off-track/15 text-off-track border-off-track/30",
  Medium: "bg-at-risk/15 text-at-risk border-at-risk/30",
  High: "bg-on-track/15 text-on-track border-on-track/30",
};

export default function Interlinkages() {
  const [sectorFilter, setSectorFilter] = useState<SectorV2 | "All">("All");
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence | "All">("All");

  const filtered = useMemo(() => interlinkages.filter(l =>
    (sectorFilter === "All" || l.relevant_sectors.includes(sectorFilter)) &&
    (confidenceFilter === "All" || l.confidence === confidenceFilter)
  ), [sectorFilter, confidenceFilter]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-5xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5"><GitBranch className="h-4 w-4" /> Interlinkage Explorer</h2>
          <p className="text-xs text-muted-foreground">Indicator-to-indicator transmission mechanisms across sectors. Each link explains how change in one indicator propagates to another.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground">Sector:</span>
            <Select value={sectorFilter} onValueChange={(v: SectorV2 | "All") => setSectorFilter(v)}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All sectors</SelectItem>
                {(["AFOLU","Energy","Water","Transport","Waste","IPPU"] as SectorV2[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground">Confidence:</span>
            <Select value={confidenceFilter} onValueChange={(v: Confidence | "All") => setConfidenceFilter(v)}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-[10px] h-6">{filtered.length} link{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(link => {
            const src = getIndicator(link.source_indicator_id);
            const tgt = getIndicator(link.target_indicator_id);
            return (
              <Card key={link.interlinkage_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{src?.indicator_name}</p>
                      <p className="text-[9px] text-muted-foreground">{src?.sector}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{tgt?.indicator_name}</p>
                      <p className="text-[9px] text-muted-foreground">{tgt?.sector}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-foreground italic border-l-2 border-accent/40 pl-2">{link.transmission_mechanism}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className={cn("text-[9px] h-4", confidenceColor[link.confidence])}>{link.confidence} confidence</Badge>
                    <Badge variant="outline" className="text-[9px] h-4">{link.evidence_type.toLowerCase()}</Badge>
                    {link.relevant_sectors.map(s => <Badge key={s} variant="outline" className="text-[9px] h-4 bg-secondary">{s}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
