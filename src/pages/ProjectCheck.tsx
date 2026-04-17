import { useMemo, useState } from "react";
import { chainsForSectorAndIntervention, getIndicator, indicatorsTouchedByChain, ndcTargetsTouchedByChain, mrvMethodLabel, type SectorV2 } from "@/data/uganda-v2-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Target, Database, Building2, FileDown } from "lucide-react";
import { exportInvestmentNote } from "@/lib/investment-note";
import { toast } from "sonner";

export default function ProjectCheck() {
  const [sector, setSector] = useState<SectorV2 | "All">("All");
  const [intervention, setIntervention] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const matches = useMemo(() => submitted ? chainsForSectorAndIntervention(sector, intervention) : [], [sector, intervention, submitted]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-5xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5"><Search className="h-4 w-4" /> Project Check Tool</h2>
          <p className="text-xs text-muted-foreground">Describe a planned intervention. The tool surfaces the causal chains it activates, the NDC targets it contributes to, and the MRV stack required to prove it.</p>
        </div>

        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2">
              <Select value={sector} onValueChange={(v: SectorV2 | "All") => setSector(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All sectors</SelectItem>
                  {(["AFOLU","Energy","Water","Transport","Waste","IPPU"] as SectorV2[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={intervention} onChange={e => setIntervention(e.target.value)} placeholder="e.g. clean cooking, solar, watershed restoration" className="h-8 text-xs" onKeyDown={e => { if (e.key === "Enter") setSubmitted(true); }} />
              <Button size="sm" className="h-8 text-xs" onClick={() => setSubmitted(true)}>Check</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Tip: leave the text empty to see all chains for the chosen sector.</p>
          </CardContent>
        </Card>

        {submitted && (
          <div className="space-y-3">
            {matches.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No matching causal chains. Try broadening the sector or term.</CardContent></Card>
            ) : matches.map(chain => {
              const indicators = indicatorsTouchedByChain(chain);
              const targets = ndcTargetsTouchedByChain(chain);
              const mrvStack = Array.from(new Set(chain.steps.map(s => s.mrv_method)));
              const owners = Array.from(new Set(indicators.map(i => i.mrv.data_owner)));
              return (
                <Card key={chain.causal_chain_id} className="border-accent/30">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-foreground">{chain.title}</p>
                        <p className="text-[10px] text-muted-foreground italic">{chain.answers_policy_question}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={async () => { await exportInvestmentNote(chain); toast.success("Investment note exported"); }}>
                        <FileDown className="h-3 w-3 mr-1" /> Export memo
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="p-2 bg-muted/30 rounded">
                        <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1"><Target className="h-2.5 w-2.5" />What this contributes to</h5>
                        {targets.length === 0 ? <p className="text-[10px] text-muted-foreground italic">No NDC targets directly touched.</p> :
                          <ul className="space-y-0.5">{targets.map(t => <li key={t.ndc_target_id} className="text-[10px] text-foreground leading-tight">• {t.target_description}</li>)}</ul>}
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1"><Database className="h-2.5 w-2.5" />How we prove it (MRV stack)</h5>
                        <div className="flex flex-wrap gap-1 mb-1">{mrvStack.map(m => <Badge key={m} variant="outline" className="text-[9px] h-4 bg-chart-2/10 text-chart-2 border-chart-2/30">{mrvMethodLabel[m]}</Badge>)}</div>
                        <p className="text-[9px] text-muted-foreground">{indicators.length} indicator{indicators.length !== 1 ? "s" : ""} across {chain.steps.length} steps.</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1"><Building2 className="h-2.5 w-2.5" />Who owns the data</h5>
                        <ul className="space-y-0.5">{owners.map(o => <li key={o} className="text-[10px] text-foreground leading-tight">• {o}</li>)}</ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
