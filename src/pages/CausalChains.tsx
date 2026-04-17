import { useState } from "react";
import { causalChains, getIndicator, indicatorTypeLabel, mrvMethodLabel, ndcTargetsTouchedByChain } from "@/data/uganda-v2-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Workflow, FileDown } from "lucide-react";
import { exportInvestmentNote } from "@/lib/investment-note";
import { toast } from "sonner";

export default function CausalChains() {
  const [selectedId, setSelectedId] = useState(causalChains[0].causal_chain_id);
  const chain = causalChains.find(c => c.causal_chain_id === selectedId)!;
  const linkedTargets = ndcTargetsTouchedByChain(chain);

  const handleExport = async () => {
    try {
      await exportInvestmentNote(chain);
      toast.success("Investment note exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-1.5"><Workflow className="h-4 w-4" /> Causal Chains</h2>
            <p className="text-xs text-muted-foreground">5-step explainability: how a sector intervention propagates to NDC, NDP-IV and Tenfold outcomes.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[360px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {causalChains.map(c => <SelectItem key={c.causal_chain_id} value={c.causal_chain_id}><span className="text-xs">{c.title}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="text-xs h-8" onClick={handleExport}>
              <FileDown className="h-3 w-3 mr-1" /> Export Investment Note
            </Button>
          </div>
        </div>

        <Card className="bg-accent/5 border-accent/30">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-5 bg-accent/10">Trigger: {chain.trigger_intervention.sector}</Badge>
              <span className="text-[11px] font-semibold text-foreground">{chain.trigger_intervention.intervention_type}</span>
            </div>
            <p className="text-[11px] text-muted-foreground italic">Q: {chain.answers_policy_question}</p>
          </CardContent>
        </Card>

        {/* 5-step horizontal flow */}
        <div className="overflow-x-auto">
          <div className="flex items-stretch gap-2 min-w-max pb-2">
            {chain.steps.map((step, idx) => {
              const ind = getIndicator(step.indicator_id);
              return (
                <div key={idx} className="flex items-center">
                  <Card className="w-[200px] hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] h-4 bg-accent/10 text-accent border-accent/30">Step {step.step}</Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-foreground leading-tight">{step.effect}</p>
                      <div className="border-t border-border pt-1.5 space-y-1">
                        <p className="text-[10px] font-medium text-foreground">{ind?.indicator_name}</p>
                        <Badge variant="outline" className="text-[8px] h-3.5">{indicatorTypeLabel[step.indicator_type]}</Badge>
                        <p className="text-[9px] text-muted-foreground">MRV: {mrvMethodLabel[step.mrv_method]}</p>
                      </div>
                    </CardContent>
                  </Card>
                  {idx < chain.steps.length - 1 && <ChevronRight className="h-4 w-4 text-accent shrink-0 mx-0.5" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NDC targets touched ({linkedTargets.length})</h4>
              {linkedTargets.length === 0 ? <p className="text-[10px] text-muted-foreground italic">No direct NDC links.</p> :
                <ul className="space-y-1">
                  {linkedTargets.map(t => (
                    <li key={t.ndc_target_id} className="text-[11px] text-foreground">
                      <Badge variant="outline" className="text-[9px] h-4 mr-1">{t.sector}</Badge>{t.target_description}
                    </li>
                  ))}
                </ul>}
            </CardContent>
          </Card>

          {chain.article6_hook && (
            <Card className="border-chart-4/30 bg-chart-4/5">
              <CardContent className="p-3 space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-chart-4">Article 6 readiness</h4>
                <p className="text-[11px] text-foreground">{chain.article6_hook}</p>
                <p className="text-[9px] text-muted-foreground italic mt-1">Article 6 framed as upside, not prerequisite.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
