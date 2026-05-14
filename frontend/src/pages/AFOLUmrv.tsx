import { activities, kpis, dataSources, getActor, computeKPIProgress } from "@/data/uganda-strategy-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const workflowSteps = [
  { step: 1, name: "Activity Data Collection", description: "Collect activity data from district/ministry sources", status: "active" },
  { step: 2, name: "Emission Factor Application", description: "Apply IPCC/national emission factors to activity data", status: "active" },
  { step: 3, name: "QA/QC Review", description: "Automated and manual quality checks on computed values", status: "pending" },
  { step: 4, name: "Approval", description: "Validator sign-off by designated sector MRV authority", status: "pending" },
  { step: 5, name: "Reporting", description: "Export to CRT/BTR format for UNFCCC submission", status: "pending" },
];

const needsAssessment = [
  "Establish baseline diesel consumption data for solar irrigation displacement calculations",
  "Standardize ERW sequestration factors through Uganda-specific field trials",
  "Formalize MAAIF ↔ MWE data sharing protocol for cross-ministry verification",
];

export default function AFOLUmrv() {
  const afoActivities = activities.filter(a => a.sector === "AFOLU");
  const afoKPIs = kpis.filter(k => ["KPI-IRR-HA", "KPI-AFOLU-DISP", "KPI-ERW-CO2", "KPI-YIELD-IX"].includes(k.id));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">AFOLU MRV</h2>
        <p className="text-xs text-muted-foreground">End-to-end AFOLU MRV workflow, integration placeholders, and QA/QC rules.</p>

        {/* Workflow Builder */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">MRV Workflow</h3>
            <div className="space-y-2">
              {workflowSteps.map(ws => (
                <div key={ws.step} className="flex items-start gap-3">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    ws.status === "active" ? "bg-on-track text-accent-foreground" : "bg-muted text-muted-foreground"
                  )}>{ws.step}</div>
                  <div>
                    <p className="text-[10px] font-semibold text-foreground">{ws.name}</p>
                    <p className="text-[9px] text-muted-foreground">{ws.description}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[8px] h-3 ml-auto shrink-0",
                    ws.status === "active" ? "bg-on-track/10 text-on-track" : "bg-muted text-muted-foreground"
                  )}>{ws.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <h4 className="text-xs font-bold text-foreground mb-1">🛰 Planet Insights</h4>
              <p className="text-[10px] text-muted-foreground">Earth observation analytics for AFOLU land-use change, forest cover, and crop monitoring.</p>
              <div className="mt-2 space-y-1">
                <p className="text-[9px] text-muted-foreground"><span className="font-medium text-foreground">Contact:</span> {getActor("ACT-PLANET")?.display_name}</p>
                <p className="text-[9px] text-muted-foreground"><span className="font-medium text-foreground">Access:</span> API (Monthly)</p>
                <Badge variant="outline" className="text-[8px] h-3 bg-at-risk/10 text-at-risk">Placeholder — config needed</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <h4 className="text-xs font-bold text-foreground mb-1">📊 Climate TRACE</h4>
              <p className="text-[10px] text-muted-foreground">MRV & emissions tracing tools for independent verification of sector submissions.</p>
              <div className="mt-2 space-y-1">
                <p className="text-[9px] text-muted-foreground"><span className="font-medium text-foreground">Contact:</span> {getActor("ACT-TRACE-GAVIN")?.display_name}, {getActor("ACT-TRACE-LEKHA")?.display_name}</p>
                <p className="text-[9px] text-muted-foreground"><span className="font-medium text-foreground">Access:</span> API (Quarterly)</p>
                <Badge variant="outline" className="text-[8px] h-3 bg-at-risk/10 text-at-risk">Placeholder — config needed</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AFOLU KPIs */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">AFOLU Proxy Metrics</h3>
            {afoKPIs.map(kpi => {
              const progress = computeKPIProgress(kpi);
              return (
                <div key={kpi.id} className="py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-foreground">{kpi.kpi_name}</span>
                      {kpi.is_proxy && <Badge variant="outline" className="text-[8px] h-3 bg-at-risk/10 text-at-risk">Proxy</Badge>}
                    </div>
                    <span className="text-[10px] font-bold">{progress.pct}%</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Formula: <code className="font-mono bg-muted px-1 rounded">{kpi.formula}</code></p>
                  {kpi.uncertainty_note && <p className="text-[9px] text-at-risk mt-0.5">⚠ {kpi.uncertainty_note}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Needs Assessment */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Needs Assessment</h3>
            <ul className="space-y-1">
              {needsAssessment.map((n, i) => (
                <li key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                  <span className="text-at-risk shrink-0">•</span>{n}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
