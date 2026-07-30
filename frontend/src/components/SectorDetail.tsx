/**
 * Panel: one sector in detail.
 *
 * The full picture for a single sector — its figures, its targets and its
 * progress.
 */
import { useState } from "react";
import { type Sector, getProgressPercent, getSectorStatus, decisionOptions } from "@/data/climate-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectorProgressBar } from "./SectorProgressBar";
import { SectorChart } from "./SectorChart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SectorDetailProps {
  sector: Sector;
  dataView: "historical" | "projected" | "both";
}

export function SectorDetail({ sector, dataView }: SectorDetailProps) {
  const progress = getProgressPercent(sector);
  const status = getSectorStatus(sector);
  const Icon = sector.icon;
  const targetEmissions = Math.round(sector.baselineEmissions * (1 - sector.targetReduction / 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-muted">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{sector.name}</h2>
            <p className="text-sm text-muted-foreground">{sector.description}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-3 py-1",
            status === "on-track" && "border-on-track status-on-track",
            status === "at-risk" && "border-at-risk status-at-risk",
            status === "off-track" && "border-off-track status-off-track"
          )}
        >
          {status === "on-track" ? "On Track" : status === "at-risk" ? "At Risk" : "Off Track"}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Baseline" value={`${sector.baselineEmissions}`} unit="MtCO₂e" year={sector.baselineYear} />
        <StatCard label="Current" value={`${sector.currentEmissions}`} unit="MtCO₂e" year={2024} />
        <StatCard label="Target" value={`${targetEmissions}`} unit="MtCO₂e" year={sector.targetYear} />
        <StatCard label="Progress" value={`${progress}%`} unit={`of ${sector.targetReduction}% goal`} />
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-5">
          <SectorProgressBar sector={sector} />
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Emissions Trend & Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <SectorChart sector={sector} dataView={dataView} />
        </CardContent>
      </Card>

      {/* Activities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activities & Measures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sector.activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{activity.name}</span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] h-5",
                      activity.status === "on-track" && "border-on-track status-on-track",
                      activity.status === "at-risk" && "border-at-risk status-at-risk",
                      activity.status === "off-track" && "border-off-track status-off-track"
                    )}>
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-sm font-mono font-semibold">{activity.emissionsReduced} MtCO₂e</div>
                  <div className="text-xs text-muted-foreground">${activity.investment}M invested</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decision Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Decision Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {decisionOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => toast.success(`Decision "${opt.label}" recorded for ${sector.name}`)}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors text-left"
              >
                <div className="mt-0.5">
                  {opt.type === "terminate" && <ArrowDownRight className="h-4 w-4 status-off-track" />}
                  {opt.type === "increase" && <ArrowUpRight className="h-4 w-4 status-on-track" />}
                  {opt.type === "reduce" && <Minus className="h-4 w-4 status-at-risk" />}
                  {opt.type === "maintain" && <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, unit, year }: { label: string; value: string; unit: string; year?: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
        <p className="text-xs text-muted-foreground">{unit}{year ? ` (${year})` : ""}</p>
      </CardContent>
    </Card>
  );
}
