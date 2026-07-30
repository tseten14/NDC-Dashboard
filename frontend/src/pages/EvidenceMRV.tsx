/**
 * Screen: evidence behind each indicator.
 *
 * Lists the indicators being tracked with their verification status and when
 * they were last updated — so it is obvious which figures have been checked and
 * which are still unverified.
 */
// Evidence & MRV — provenance, qa_flags, confidence, Evidence Pack export.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CockpitBar } from "@/components/CockpitBar";
import { useCockpit } from "@/hooks/use-cockpit";
import { applyScope } from "@/data/indicator-registry";
import { runAllRules } from "@/data/qa-rulebook";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Download, AlertTriangle, FileText } from "lucide-react";
// Export helpers load on demand — they pull in the PDF/spreadsheet libraries
// (~235 kB), which no visitor should download unless they actually export.
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EvidenceMRV() {
  const c = useCockpit();
  const all = useMemo(() => applyScope({ strategies: c.strategies, atms_only: c.atms_only, verified_only: c.verified_only }), [c.strategies, c.atms_only, c.verified_only]);
  const [q, setQ] = useState("");
  const filtered = q ? all.filter(i => i.indicator_name.toLowerCase().includes(q.toLowerCase()) || i.sector_or_programme.toLowerCase().includes(q.toLowerCase())) : all;

  return (
    <div className="flex flex-col h-full">
      <CockpitBar />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Evidence & MRV</h1>
              <p className="text-xs text-muted-foreground">Every number shows source, owner, last update, validation status and QA/QC flags. Export for parliament/funders.</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={async () => { await (await import("@/lib/evidence-pack")).exportEvidencePackCSV(filtered); toast.success("Evidence Pack CSV exported"); }}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
              <Button size="sm" className="h-7 text-[10px]" onClick={async () => { await (await import("@/lib/evidence-pack")).exportEvidencePackPDF(filtered); toast.success("Evidence Pack PDF exported"); }}>
                <FileText className="h-3 w-3 mr-1" /> PDF pack
              </Button>
            </div>
          </div>

          <Input placeholder="Search indicator or sector…" value={q} onChange={e => setQ(e.target.value)} className="h-7 text-xs max-w-sm" />

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted/30">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 px-2 font-semibold">Indicator</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Strategy</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Source</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Owner</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Last update</th>
                      <th className="text-center py-1.5 px-2 font-semibold">Validation</th>
                      <th className="text-center py-1.5 px-2 font-semibold">QA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(i => {
                      const flags = runAllRules(i);
                      const errCount = flags.filter(f => f.severity === "error").length;
                      const warnCount = flags.filter(f => f.severity === "warn").length;
                      return (
                        <tr key={i.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-1 px-2 font-medium text-foreground">{i.indicator_name}</td>
                          <td className="py-1 px-2">{i.strategy}</td>
                          <td className="py-1 px-2 text-muted-foreground">{i.data_source ?? "—"}</td>
                          <td className="py-1 px-2 text-muted-foreground">{i.data_owner ?? "—"}</td>
                          <td className="py-1 px-2 text-muted-foreground">{i.last_update_date ?? "—"}</td>
                          <td className="py-1 px-2 text-center">
                            <Badge variant="outline" className={cn("text-[9px] h-4",
                              i.validation_status === "Verified" && "bg-on-track/10 text-on-track border-on-track/30",
                              i.validation_status === "Provisional" && "bg-at-risk/10 text-at-risk border-at-risk/30",
                              i.validation_status === "Modelled" && "bg-chart-4/10 text-chart-4 border-chart-4/30",
                              i.validation_status === "Missing" && "bg-off-track/10 text-off-track border-off-track/30",
                            )}>{i.validation_status}</Badge>
                          </td>
                          <td className="py-1 px-2 text-center">
                            {flags.length === 0 ? <span className="text-muted-foreground">—</span> : (
                              <span title={flags.map(f => f.message).join(" | ")} className="inline-flex items-center gap-0.5">
                                {errCount > 0 && <Badge className="text-[9px] h-4 bg-off-track text-white">{errCount}E</Badge>}
                                {warnCount > 0 && <Badge className="text-[9px] h-4 bg-at-risk text-white">{warnCount}W</Badge>}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-at-risk/30">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-at-risk font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Trust principle</p>
              <p className="text-[10px] text-foreground/80 leading-snug">No indicator with status <strong>Missing</strong> contributes to progress calculations. Sources, owners and update dates must be visible at all times.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-3">
              <p className="text-[10px] text-foreground/80">
                Need to investigate a bottleneck?{" "}
                <Link to="/delivery" className="text-primary font-medium hover:underline">
                  → View Delivery &amp; Accountability
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
