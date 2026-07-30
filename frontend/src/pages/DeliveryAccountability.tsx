/**
 * Screen: who is delivering what.
 *
 * A tracking view of activities in progress — what has been produced, what
 * evidence supports it, and what the next action is for each. Written for the
 * people chasing delivery rather than for analysts.
 */
// Delivery & Accountability — indicator → activity → district chain.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CockpitBar } from "@/components/CockpitBar";
import { useCockpit } from "@/hooks/use-cockpit";
import { applyScope, getById, progressPct, statusColor } from "@/data/indicator-registry";
import { seedActivities } from "@/data/seed-activities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Network, MapPin, Users, AlertCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DeliveryAccountability() {
  const navigate = useNavigate();
  const c = useCockpit();
  const inds = useMemo(() => applyScope({ strategies: c.strategies, atms_only: c.atms_only, verified_only: c.verified_only }), [c.strategies, c.atms_only, c.verified_only]);
  const [selectedAct, setSelectedAct] = useState<string | null>(seedActivities[0]?.id ?? null);
  const activeActivities = c.geography === "District" && c.district
    ? seedActivities.filter(a => a.district === c.district)
    : seedActivities;

  const selected = activeActivities.find(a => a.id === selectedAct) ?? activeActivities[0];

  return (
    <div className="flex flex-col h-full">
      <CockpitBar />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Network className="h-4 w-4" /> Delivery & Accountability</h1>
            <p className="text-xs text-muted-foreground">Indicator → Measure → Activity → District outputs → Decisions. Filter by geography in the bar above.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
            {/* Activity list */}
            <Card>
              <CardContent className="p-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Activities ({activeActivities.length})</p>
                <div className="space-y-1">
                  {activeActivities.map(a => (
                    <button key={a.id} onClick={() => setSelectedAct(a.id)}
                      className={cn("w-full text-left px-2 py-1.5 rounded text-[10px] border transition", selected?.id === a.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/40")}>
                      <p className="font-medium text-foreground">{a.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[9px] h-3.5">{a.status}</Badge>
                        <span className="text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{a.district}</span>
                      </div>
                    </button>
                  ))}
                  {activeActivities.length === 0 && <p className="text-[10px] text-muted-foreground italic px-2 py-3">No activities for selected district.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Selected activity detail */}
            {selected && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{selected.name}</p>
                        <p className="text-[10px] text-muted-foreground">{selected.implementing_entity}</p>
                      </div>
                      <Badge className="text-[9px] h-4">{selected.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                      <Field label="District" value={selected.district} icon={<MapPin className="h-2.5 w-2.5" />} />
                      <Field label="Ministry" value={selected.ministry_or_agency} icon={<Users className="h-2.5 w-2.5" />} />
                      <Field label="Period" value={`${selected.start_date} → ${selected.end_date}`} />
                      <Field label="Budget line" value={selected.budget_line_reference ?? "—"} />
                    </div>

                    {/* Outputs */}
                    <div className="pt-1 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Outputs</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.outputs.map((o, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] h-5 bg-muted/30">
                            {o.description}: <span className="font-bold ml-1">{o.quantity?.toLocaleString()} {o.unit}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-end">
                      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => navigate("/finance")}>
                        → Check finance
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Indicator chain */}
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Indicator chain (this activity → strategy targets)</p>
                    <div className="space-y-1.5">
                      {selected.contribution_mapping.map((m, i) => {
                        const ind = getById(m.indicator_id);
                        if (!ind) return null;
                        const p = progressPct(ind);
                        const sc = statusColor(p, ind);
                        const dot = sc === "on-track" ? "bg-on-track" : sc === "at-risk" ? "bg-at-risk" : sc === "off-track" ? "bg-off-track" : "bg-muted";
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                            <span className={cn("inline-block h-2 w-2 rounded-full mt-1", dot)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-medium text-foreground">{ind.indicator_name}</span>
                                <Badge variant="outline" className="text-[9px] h-3.5">{ind.strategy}</Badge>
                                <Badge variant="outline" className="text-[9px] h-3.5">{m.contribution_type}</Badge>
                              </div>
                              <p className="text-[9.5px] text-muted-foreground mt-0.5">{m.contribution_logic}{m.coefficient ? ` (coeff ${m.coefficient})` : ""}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                Baseline {ind.baseline_value} {ind.unit} · Target {ind.target_value_2030 ?? ind.target_value_2025 ?? ind.target_value_2040} {ind.unit}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Blockers */}
                {selected.blockers && selected.blockers.length > 0 && (
                  <Card className="border-at-risk/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] uppercase tracking-wider text-at-risk font-semibold mb-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Blockers</p>
                      <ul className="space-y-0.5">
                        {selected.blockers.map((b, i) => <li key={i} className="text-[10px] text-foreground">• {b}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Decision log */}
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1"><History className="h-3 w-3" /> Decision log</p>
                    {selected.decision_log.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">No decisions logged.</p>
                    ) : (
                      <table className="w-full text-[10px]">
                        <thead><tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-1 font-semibold">Date</th>
                          <th className="text-left py-1 font-semibold">Who</th>
                          <th className="text-left py-1 font-semibold">Evidence</th>
                          <th className="text-left py-1 font-semibold">Change</th>
                          <th className="text-left py-1 font-semibold">Next action</th>
                        </tr></thead>
                        <tbody>
                          {selected.decision_log.map(d => (
                            <tr key={d.id} className="border-b border-border/30">
                              <td className="py-1">{d.date}</td>
                              <td className="py-1">{d.who}</td>
                              <td className="py-1 text-muted-foreground">{d.evidence}</td>
                              <td className="py-1">{d.what_changed}</td>
                              <td className="py-1 text-foreground">{d.next_action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[10px] text-foreground flex items-center gap-1">{icon}{value}</p>
    </div>
  );
}
