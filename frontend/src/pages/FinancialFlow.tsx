// Financial Flow — committed → disbursed → spent per project.
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataHonestyBadge } from "@/components/DataHonestyBadge";
import { Coins } from "lucide-react";
import { seedActivities } from "@/data/seed-activities";
import { cn } from "@/lib/utils";

// Synthesize financial numbers per activity
function synth(activity: (typeof seedActivities)[number]) {
  // Committed: generate plausible USD amounts based on activity name / status
  const committed = (() => {
    if (activity.id === "ACT-IRR-001") return 3_200_000;
    if (activity.id === "ACT-RE-002") return 12_500_000;
    if (activity.id === "ACT-COOK-003") return 2_400_000;
    return 1_800_000;
  })();

  // Disbursed rate by status
  const disbRate = activity.status === "Completed" ? 0.95
    : activity.status === "Active" ? 0.70
    : activity.status === "Delayed" ? 0.40
    : activity.status === "Planned" ? 0.25
    : 0.60;

  const disbursed = Math.round(committed * disbRate);
  // Spent = 80–90% of disbursed (use 85%)
  const spent = Math.round(disbursed * 0.85);

  return { committed, disbursed, spent, disbRate };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 0.7 ? "bg-green-500" : pct >= 0.4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct * 100).toFixed(0)}%` }} />
      </div>
      <span className={cn("text-[10px] font-semibold", pct >= 0.7 ? "text-green-600 dark:text-green-400" : pct >= 0.4 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
        {(pct * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function FinancialFlow() {
  const rows = useMemo(() => seedActivities.map(a => ({ activity: a, ...synth(a) })), []);

  const totalCommitted = rows.reduce((s, r) => s + r.committed, 0);
  const totalDisbursed = rows.reduce((s, r) => s + r.disbursed, 0);
  const avgDisbRate = totalCommitted > 0 ? totalDisbursed / totalCommitted : 0;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" /> Financial Flows
              </h1>
              <p className="text-xs text-muted-foreground">Committed → Disbursed → Spent by project</p>
            </div>
            <DataHonestyBadge kind="illustrative" />
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Committed</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{fmt(totalCommitted)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Disbursed</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{fmt(totalDisbursed)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg Disbursement Rate</p>
                <p className={cn("text-xl font-bold mt-0.5", avgDisbRate >= 0.7 ? "text-green-600 dark:text-green-400" : avgDisbRate >= 0.4 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                  {(avgDisbRate * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-semibold">Project</th>
                    <th className="text-left py-1.5 px-2 font-semibold">District</th>
                    <th className="text-left py-1.5 px-2 font-semibold">Status</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Committed (USD)</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Disbursed</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Spent</th>
                    <th className="py-1.5 px-2 font-semibold">Disbursement %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ activity, committed, disbursed, spent, disbRate }) => (
                    <tr key={activity.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-1.5 px-2 font-medium text-foreground max-w-[200px]">
                        <p className="truncate">{activity.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{activity.implementing_entity}</p>
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground">{activity.district}</td>
                      <td className="py-1.5 px-2">
                        <Badge variant="outline" className="text-[9px] h-4">{activity.status}</Badge>
                      </td>
                      <td className="py-1.5 px-2 text-right font-medium text-foreground">{fmt(committed)}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{fmt(disbursed)}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{fmt(spent)}</td>
                      <td className="py-1.5 px-2"><PctBar pct={disbRate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-[9px] text-muted-foreground italic">
            Financial figures are illustrative placeholders synthesized from activity metadata. Replace with actual IFMIS/disbursement data.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
