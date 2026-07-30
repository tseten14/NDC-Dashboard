/**
 * Card: where a risk layer came from.
 *
 * Names the source and maturity of a hazard layer, so an illustrative layer is
 * not mistaken for a validated one.
 */
// Data Provenance Card for a hazard layer.
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HazardLayer } from "@/hooks/use-risk-data";

interface Props { hazard: HazardLayer | undefined; }

export function ProvenanceCard({ hazard }: Props) {
  if (!hazard) return null;
  const rows: Array<[string, string | null | undefined]> = [
    ["Source provider", hazard.source_provider],
    ["Source URL", hazard.source_url],
    ["License", hazard.license],
    ["Vintage", hazard.vintage_date],
    ["Scenario", hazard.scenario_name],
    ["Time horizon", hazard.time_horizon],
    ["Spatial resolution", hazard.spatial_resolution],
    ["Coverage", hazard.geography_coverage],
    ["Access mode", hazard.data_access_mode],
  ];
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data provenance</p>
            <p className="text-xs font-semibold text-foreground">{hazard.name}</p>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[9px]">{hazard.data_status}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-foreground truncate">{v || "—"}</span>
            </div>
          ))}
        </div>
        {hazard.methodology_notes && (
          <div className="text-[10px]">
            <p className="text-muted-foreground">Methodology</p>
            <p className="text-foreground">{hazard.methodology_notes}</p>
          </div>
        )}
        {hazard.uncertainty_notes && (
          <div className="text-[10px]">
            <p className="text-muted-foreground">Uncertainty notes</p>
            <p className="text-foreground">{hazard.uncertainty_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}