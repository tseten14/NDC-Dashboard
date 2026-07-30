/**
 * Picker: link an activity to targets.
 *
 * Search across all strategies and attach the targets an activity contributes
 * to, recording whether the contribution is direct, enabling or a proxy.
 */
import { useState } from "react";
import { allFlatTargets, type FlatTarget } from "@/data/strategy-targets-flat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraftLink {
  strategy: "NDC" | "NDPIV" | "Tenfold";
  targetId: string;
  relationshipType: "Direct" | "Enabling" | "Proxy";
  expectedContribution: string;
}

interface Props {
  links: DraftLink[];
  onChange: (next: DraftLink[]) => void;
}

const strategyColor: Record<string, string> = {
  NDC: "bg-on-track/15 text-on-track border-on-track/40",
  NDPIV: "bg-chart-4/15 text-chart-4 border-chart-4/40",
  Tenfold: "bg-chart-3/15 text-chart-3 border-chart-3/40",
};

export function TargetLinkPicker({ links, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [strategy, setStrategy] = useState<"all" | "NDC" | "NDPIV" | "Tenfold">("all");

  const filtered = allFlatTargets
    .filter(t => strategy === "all" || t.strategy === strategy)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 30);

  const linkedIds = new Set(links.map(l => l.targetId));

  const addLink = (t: FlatTarget) => {
    if (linkedIds.has(t.id)) return;
    onChange([...links, {
      strategy: t.strategy, targetId: t.id, relationshipType: "Direct", expectedContribution: "",
    }]);
  };

  const updateLink = (i: number, patch: Partial<DraftLink>) => {
    onChange(links.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };

  const removeLink = (i: number) => onChange(links.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {/* Selected links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Linked targets ({links.length})</span>
          {links.length === 0 && <span className="text-[10px] text-at-risk">At least one link required</span>}
        </div>
        {links.map((l, i) => {
          const t = allFlatTargets.find(x => x.id === l.targetId);
          return (
            <div key={i} className="border border-border rounded-md p-2 bg-muted/30 space-y-1.5">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className={cn("text-[9px] shrink-0 mt-0.5", strategyColor[l.strategy])}>{l.strategy}</Badge>
                <span className="text-[11px] flex-1 leading-snug">{t?.title ?? l.targetId}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeLink(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-1.5">
                <Select value={l.relationshipType} onValueChange={(v) => updateLink(i, { relationshipType: v as DraftLink["relationshipType"] })}>
                  <SelectTrigger className="h-6 text-[10px] w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct</SelectItem>
                    <SelectItem value="Enabling">Enabling</SelectItem>
                    <SelectItem value="Proxy">Proxy</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Expected contribution (optional)"
                  value={l.expectedContribution}
                  onChange={e => updateLink(i, { expectedContribution: e.target.value })}
                  className="h-6 text-[10px] flex-1"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search to add */}
      <div className="border border-dashed border-border rounded-md p-2 space-y-2">
        <div className="flex gap-1.5">
          <Select value={strategy} onValueChange={(v) => setStrategy(v as "all" | DraftLink["strategy"])}>
            <SelectTrigger className="h-7 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All strategies</SelectItem>
              <SelectItem value="NDC">NDC</SelectItem>
              <SelectItem value="NDPIV">NDP IV</SelectItem>
              <SelectItem value="Tenfold">Tenfold</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search targets…" value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-[11px]" />
        </div>
        <div className="max-h-[180px] overflow-y-auto space-y-1">
          {filtered.map(t => {
            const already = linkedIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => addLink(t)}
                disabled={already}
                className={cn(
                  "w-full text-left flex items-start gap-2 p-1.5 rounded text-[11px] transition-colors",
                  already ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
                )}
              >
                <Plus className="h-3 w-3 mt-0.5 shrink-0" />
                <Badge variant="outline" className={cn("text-[9px] shrink-0", strategyColor[t.strategy])}>{t.strategy}</Badge>
                <span className="flex-1 leading-snug">{t.title}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-[10px] text-muted-foreground p-2">No targets match.</p>}
        </div>
      </div>
    </div>
  );
}
