// Finance & Investment — conditionality, finance gap, Investment Note + Minister brief.
import { useMemo, useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { useCockpit } from "@/hooks/use-cockpit";
import { applyScope, type Indicator } from "@/data/indicator-registry";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, FileText, Briefcase } from "lucide-react";
import { exportInvestmentNoteFromIndicator, exportMinisterBrief } from "@/lib/finance-exports";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FinanceInvestment() {
  const c = useCockpit();
  const all = useMemo(() => applyScope({ strategies: c.strategies, atms_only: c.atms_only, verified_only: c.verified_only }), [c.strategies, c.atms_only, c.verified_only]);
  const investable = all.filter(i => i.conditionality || i.potential_instruments?.length || (i.political_salience ?? 0) >= 2);
  const [picked, setPicked] = useState<Indicator | null>(investable[0] ?? null);

  return (
    <div className="flex flex-col h-full">
      <CockpitBar />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Finance & Investment</h1>
              <p className="text-xs text-muted-foreground">Each target's conditionality, finance gap and bankability — generate Investment Note + Minister one-pager.</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={async () => { await exportMinisterBrief(all); toast.success("Minister one-pager exported"); }}>
              <Briefcase className="h-3 w-3 mr-1" /> Minister one-pager
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted/30">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 px-2 font-semibold">Target / Indicator</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Strategy</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Conditionality</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Instruments</th>
                      <th className="text-right py-1.5 px-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investable.map(i => (
                      <tr key={i.id} className={cn("border-b border-border/30 hover:bg-muted/20 cursor-pointer", picked?.id === i.id && "bg-primary/5")}
                        onClick={() => setPicked(i)}>
                        <td className="py-1 px-2 font-medium text-foreground">{i.indicator_name}</td>
                        <td className="py-1 px-2">{i.strategy}</td>
                        <td className="py-1 px-2">
                          {i.conditionality ? <Badge variant="outline" className="text-[9px] h-4">{i.conditionality}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1 px-2">
                          <div className="flex flex-wrap gap-0.5">
                            {(i.potential_instruments ?? []).map(p => <Badge key={p} variant="outline" className="text-[9px] h-3.5">{p}</Badge>)}
                          </div>
                        </td>
                        <td className="py-1 px-2 text-right">
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5"
                            onClick={async (e) => { e.stopPropagation(); await exportInvestmentNoteFromIndicator(i); toast.success("Investment Note exported"); }}>
                            <FileText className="h-2.5 w-2.5 mr-0.5" /> Note
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {picked && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bankability snapshot</p>
                  <p className="text-xs font-bold text-foreground">{picked.indicator_name}</p>
                  <p className="text-[10px] text-muted-foreground">{picked.sector_or_programme} · {picked.strategy}</p>
                  <div className="space-y-1 pt-1 border-t border-border text-[10px]">
                    <Row label="Baseline" value={`${picked.baseline_value ?? "—"} ${picked.unit}`} />
                    <Row label="Target 2025" value={picked.target_value_2025 !== null ? `${picked.target_value_2025} ${picked.unit}` : "—"} />
                    <Row label="Target 2030" value={picked.target_value_2030 !== null ? `${picked.target_value_2030} ${picked.unit}` : "—"} />
                    <Row label="Target 2040" value={picked.target_value_2040 !== null ? `${picked.target_value_2040} ${picked.unit}` : "—"} />
                    <Row label="Conditionality" value={picked.conditionality ?? "—"} />
                    <Row label="Finance gap (USD)" value={picked.finance_gap_estimate_usd ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(picked.finance_gap_estimate_usd) : "—"} />
                    <Row label="Validation" value={picked.validation_status} />
                  </div>
                  <Button size="sm" className="w-full h-7 text-[10px] mt-2" onClick={async () => { await exportInvestmentNoteFromIndicator(picked); toast.success("Investment Note exported"); }}>
                    <FileText className="h-3 w-3 mr-1" /> Generate Investment Note
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
