import { Link } from "react-router-dom";
import { strategies, programmes, kpis, actors, dataSources } from "@/data/uganda-strategy-data";
import { useCurrentRole } from "@/hooks/use-current-role";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Admin() {
  const { activeRole } = useCurrentRole();

  if (activeRole !== "Admin") {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-3">
        <h2 className="text-lg font-bold">Admin</h2>
        <p className="text-sm text-muted-foreground">
          Admin tools are only available when the Admin role is selected in the top bar.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-4xl">
        <h2 className="text-lg font-bold text-foreground">Admin</h2>
        <p className="text-xs text-muted-foreground">Manage strategy mappings, field dictionaries, validation status codes, and user roles.</p>

        {/* Strategies */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Strategies ({strategies.length})</h3>
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-border">
                <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Owner</th>
                <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Salience</th>
                <th className="text-left py-1 px-1 font-semibold text-muted-foreground">Active</th>
              </tr></thead>
              <tbody>
                {strategies.map(s => (
                  <tr key={s.id} className="border-b border-border/30">
                    <td className="py-1 px-1 font-medium text-foreground">{s.name}</td>
                    <td className="py-1 px-1 text-muted-foreground">{s.owner_org}</td>
                    <td className="py-1 px-1">{s.political_salience_rank}</td>
                    <td className="py-1 px-1">{s.is_active ? "✓" : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-muted-foreground mt-2 italic">Strategies can be updated or new versions uploaded. New strategies (e.g. NDP V) can be added here.</p>
          </CardContent>
        </Card>

        {/* Field dictionaries */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Field Dictionaries</h3>
            <div className="space-y-2 text-[10px]">
              <div>
                <span className="font-semibold text-foreground">Investment Readiness Levels:</span>
                <span className="text-muted-foreground ml-1">NotReady → Emerging → Pipeline → Bankable</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Validation Status:</span>
                <span className="text-muted-foreground ml-1">Preliminary | Verified</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Project Roles:</span>
                <span className="text-muted-foreground ml-1">DataOwner | Validator | DecisionMaker | Liaison | Consulted | Responsible</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">KPI Categories:</span>
                <span className="text-muted-foreground ml-1">NDC | Economic | FoodSecurity | EnergyReliability | ProgrammeDelivery | Adaptation | Budget</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Frequency:</span>
                <span className="text-muted-foreground ml-1">Q (Quarterly) | S (Semi-annual) | A (Annual) | M (Monthly)</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Access Methods:</span>
                <span className="text-muted-foreground ml-1">upload | api | manual</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Export Types:</span>
                <span className="text-muted-foreground ml-1">CRT_BTR_CSV | JSON_API | PDF_SUMMARY</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data summary */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Data Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold text-foreground">{programmes.length}</p>
                <p className="text-muted-foreground">Programmes</p>
              </div>
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold text-foreground">{kpis.length}</p>
                <p className="text-muted-foreground">KPIs</p>
              </div>
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold text-foreground">{actors.length}</p>
                <p className="text-muted-foreground">Actors</p>
              </div>
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold text-foreground">{dataSources.length}</p>
                <p className="text-muted-foreground">Data Sources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
