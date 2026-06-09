// Cost Effectiveness — USD per tCO2e by intervention.
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataHonestyBadge } from "@/components/DataHonestyBadge";
import { BarChart3, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedActivities } from "@/data/seed-activities";
import { cn } from "@/lib/utils";

type CoBenefit = "Jobs" | "Biodiversity" | "Water security" | "Food security" | "Gender equity";

interface Row {
  id: string;
  name: string;
  sector: string;
  budget: number;
  tco2e: number;
  costPerTco2e: number;
  coBenefits: CoBenefit[];
  ndcLink: string;
}

function buildRows(): Row[] {
  const raw: Omit<Row, "costPerTco2e">[] = [
    {
      id: "ACT-IRR-001",
      name: "Solar irrigation scale-up — smallholder corridor",
      sector: "AFOLU",
      budget: 3_200_000,
      tco2e: 18_000,
      coBenefits: ["Food security", "Jobs", "Water security"],
      ndcLink: "Mitigation-AFOLU",
    },
    {
      id: "ACT-RE-002",
      name: "Utility-scale solar — Karamoja & Soroti",
      sector: "Energy",
      budget: 12_500_000,
      tco2e: 45_000,
      coBenefits: ["Jobs", "Gender equity"],
      ndcLink: "Mitigation-Energy",
    },
    {
      id: "ACT-COOK-003",
      name: "Clean cooking distribution — peri-urban",
      sector: "Energy",
      budget: 2_400_000,
      tco2e: 22_000,
      coBenefits: ["Gender equity", "Biodiversity", "Food security"],
      ndcLink: "Mitigation-Energy",
    },
  ];
  return raw.map(r => ({ ...r, costPerTco2e: Math.round(r.budget / r.tco2e) }));
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function CostEffectiveness() {
  const [sortAsc, setSortAsc] = useState(true);

  const rows: Row[] = useMemo(() => {
    const base = buildRows();
    return [...base].sort((a, b) => sortAsc ? a.costPerTco2e - b.costPerTco2e : b.costPerTco2e - a.costPerTco2e);
  }, [sortAsc]);

  const bestCost = Math.min(...rows.map(r => r.costPerTco2e));
  const totalTco2e = rows.reduce((s, r) => s + r.tco2e, 0);
  const avgCost = Math.round(rows.reduce((s, r) => s + r.costPerTco2e, 0) / rows.length);

  // Determine which 3 are best value (lowest cost/tco2e)
  const sortedByBest = [...rows].sort((a, b) => a.costPerTco2e - b.costPerTco2e);
  const bestIds = new Set(sortedByBest.slice(0, 3).map(r => r.id));

  // Unused warning suppression - seedActivities is referenced for context
  void seedActivities;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Cost Effectiveness
              </h1>
              <p className="text-xs text-muted-foreground">USD per tCO2e by intervention</p>
            </div>
            <DataHonestyBadge kind="illustrative" />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Best Cost / tCO2e</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">${bestCost.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Mitigation Potential</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{totalTco2e.toLocaleString()} tCO2e</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg Cost / tCO2e</p>
                <p className="text-xl font-bold text-foreground mt-0.5">${avgCost.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-[10px]">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-semibold w-8">Rank</th>
                    <th className="text-left py-1.5 px-2 font-semibold">Intervention</th>
                    <th className="text-left py-1.5 px-2 font-semibold">Sector</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Budget</th>
                    <th className="text-right py-1.5 px-2 font-semibold">tCO2e Avoided</th>
                    <th className="py-1.5 px-2 font-semibold">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1 -ml-1 gap-0.5 font-semibold text-muted-foreground hover:text-foreground"
                        onClick={() => setSortAsc(p => !p)}
                      >
                        <ArrowUpDown className="h-2.5 w-2.5" /> Cost / tCO2e
                      </Button>
                    </th>
                    <th className="text-left py-1.5 px-2 font-semibold">Co-benefits</th>
                    <th className="text-left py-1.5 px-2 font-semibold">NDC Link</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isBest = bestIds.has(row.id);
                    return (
                      <tr key={row.id} className={cn("border-b border-border/30 hover:bg-muted/20", isBest && "bg-green-500/5")}>
                        <td className="py-1.5 px-2 text-muted-foreground font-mono">{i + 1}</td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-foreground">{row.name}</span>
                            {isBest && (
                              <Badge className="text-[9px] h-4 bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 border">
                                ⭐ Best value
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <Badge variant="outline" className="text-[9px] h-4">{row.sector}</Badge>
                        </td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{fmt(row.budget)}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{row.tco2e.toLocaleString()}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-foreground">${row.costPerTco2e.toLocaleString()}</td>
                        <td className="py-1.5 px-2">
                          <div className="flex flex-wrap gap-0.5">
                            {row.coBenefits.map(b => (
                              <Badge key={b} variant="outline" className="text-[9px] h-3.5">{b}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">{row.ndcLink}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-[9px] text-muted-foreground italic">
            Mitigation estimates are illustrative. tCO2e values require verified MRV data before use in reporting.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
