import { useMemo, useState } from "react";
import { indicatorsV2, indicatorTypeLabel, mrvMethodLabel, type IndicatorType, type SectorV2, getNDCTarget, interlinkages, getIndicator } from "@/data/uganda-v2-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Database, Satellite, Calculator, FileSpreadsheet, Layers } from "lucide-react";

const typeIcon: Record<IndicatorType, React.ComponentType<{ className?: string }>> = {
  BIOPHYSICAL_STATE: Satellite,
  ACTIVITY_BEHAVIOUR: Layers,
  ECONOMIC_OUTPUT: FileSpreadsheet,
  MODELLED_DERIVED: Calculator,
};

const typeColor: Record<IndicatorType, string> = {
  BIOPHYSICAL_STATE: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  ACTIVITY_BEHAVIOUR: "bg-on-track/15 text-on-track border-on-track/30",
  ECONOMIC_OUTPUT: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  MODELLED_DERIVED: "bg-at-risk/15 text-at-risk border-at-risk/30",
};

export default function Indicators() {
  const [typeFilter, setTypeFilter] = useState<IndicatorType | "All">("All");
  const [sectorFilter, setSectorFilter] = useState<SectorV2 | "All">("All");
  const [selectedId, setSelectedId] = useState<string>(indicatorsV2[0].indicator_id);

  const filtered = useMemo(() => indicatorsV2.filter(i =>
    (typeFilter === "All" || i.indicator_type === typeFilter) &&
    (sectorFilter === "All" || i.sector === sectorFilter)
  ), [typeFilter, sectorFilter]);

  const selected = getIndicator(selectedId) ?? filtered[0];
  const incomingLinks = interlinkages.filter(l => l.target_indicator_id === selected?.indicator_id);
  const outgoingLinks = interlinkages.filter(l => l.source_indicator_id === selected?.indicator_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] h-full divide-x divide-border">
      <div className="flex flex-col min-h-0">
        <div className="p-3 border-b border-border bg-muted/30 space-y-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Indicators</h2>
          <div className="flex gap-1.5">
            <Select value={typeFilter} onValueChange={(v: IndicatorType | "All") => setTypeFilter(v)}>
              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All types</SelectItem>
                {(Object.keys(indicatorTypeLabel) as IndicatorType[]).map(t => <SelectItem key={t} value={t}>{indicatorTypeLabel[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={(v: SectorV2 | "All") => setSectorFilter(v)}>
              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All sectors</SelectItem>
                {(["AFOLU","Energy","Water","Transport","Waste","IPPU"] as SectorV2[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-muted-foreground">{filtered.length} indicator{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1.5">
            {filtered.map(ind => {
              const Icon = typeIcon[ind.indicator_type];
              const active = ind.indicator_id === selected?.indicator_id;
              return (
                <button key={ind.indicator_id} onClick={() => setSelectedId(ind.indicator_id)}
                  className={cn("w-full text-left p-2 rounded border transition-colors",
                    active ? "bg-accent/10 border-accent" : "border-border hover:bg-muted/40")}>
                  <div className="flex items-start gap-1.5">
                    <Icon className="h-3 w-3 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-foreground truncate">{ind.indicator_name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{ind.sector} · {ind.unit}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {selected && (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3 max-w-3xl">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">{selected.indicator_name}</h2>
                <Badge variant="outline" className={cn("text-[9px] h-5", typeColor[selected.indicator_type])}>
                  {indicatorTypeLabel[selected.indicator_type]}
                </Badge>
                <Badge variant="outline" className="text-[9px] h-5">{selected.sector}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Unit: <span className="font-mono">{selected.unit}</span></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Card><CardContent className="p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">NDP-IV alignment</h4>
                <p className="text-[11px] font-semibold text-foreground">{selected.ndp_alignment.programme_id}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{selected.ndp_alignment.programme_result}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tenfold alignment</h4>
                <p className="text-[11px] font-semibold text-foreground">{selected.tenfold_alignment.anchor_area}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{selected.tenfold_alignment.economic_relevance}</p>
              </CardContent></Card>
            </div>

            <Card className="border-chart-2/30 bg-chart-2/5"><CardContent className="p-3 space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-chart-2 flex items-center gap-1"><Satellite className="h-3 w-3" />MRV</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-muted-foreground">Method:</span> <span className="font-medium text-foreground">{mrvMethodLabel[selected.mrv.mrv_method]}</span></div>
                <div><span className="text-muted-foreground">Frequency:</span> <span className="font-medium text-foreground">{selected.mrv.update_frequency}</span></div>
                <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium text-foreground">{selected.mrv.data_owner}</span></div>
              </div>
              <div className="text-[10px] text-muted-foreground">Sources: {selected.mrv.primary_data_sources.join(", ")}</div>
            </CardContent></Card>

            <Card><CardContent className="p-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Used in NDC targets</h4>
              {selected.used_in_targets.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No direct NDC target links.</p>
              ) : (
                <ul className="space-y-1">
                  {selected.used_in_targets.map(tid => {
                    const t = getNDCTarget(tid);
                    return <li key={tid} className="text-[11px] text-foreground">• {t?.target_description ?? tid}</li>;
                  })}
                </ul>
              )}
            </CardContent></Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Card><CardContent className="p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Drives → ({outgoingLinks.length})</h4>
                <div className="space-y-1">
                  {outgoingLinks.length === 0 && <p className="text-[10px] text-muted-foreground italic">None.</p>}
                  {outgoingLinks.map(l => {
                    const t = getIndicator(l.target_indicator_id);
                    return (
                      <button key={l.interlinkage_id} onClick={() => setSelectedId(l.target_indicator_id)} className="w-full text-left p-1.5 rounded border border-border hover:bg-muted/40">
                        <p className="text-[10px] font-semibold text-foreground">→ {t?.indicator_name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{l.transmission_mechanism}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Driven by ← ({incomingLinks.length})</h4>
                <div className="space-y-1">
                  {incomingLinks.length === 0 && <p className="text-[10px] text-muted-foreground italic">None.</p>}
                  {incomingLinks.map(l => {
                    const s = getIndicator(l.source_indicator_id);
                    return (
                      <button key={l.interlinkage_id} onClick={() => setSelectedId(l.source_indicator_id)} className="w-full text-left p-1.5 rounded border border-border hover:bg-muted/40">
                        <p className="text-[10px] font-semibold text-foreground">← {s?.indicator_name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{l.transmission_mechanism}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent></Card>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
