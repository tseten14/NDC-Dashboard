/**
 * Screen: risk detail.
 *
 * Breaks a district's risk score into its parts — exposure and vulnerability —
 * and shows the underlying sources side by side, so a headline score can be
 * traced back to what produced it.
 */
// Technical drill-down: Hazard × Exposure × Vulnerability components, assumptions, side-by-side sources.
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHazardLayers, useRiskCells, useRiskDistricts } from "@/hooks/use-risk-data";
import { ProvenanceCard } from "@/components/risk/ProvenanceCard";
import { AlertCircle, Loader2 } from "lucide-react";

export default function RiskDrilldown() {
  const { data: hazards, loading: hL, error: hErr } = useHazardLayers();
  const { data: cells, loading: cL } = useRiskCells();
  const { data: districts, loading: dL } = useRiskDistricts();
  const [tab, setTab] = useState("hazard");
  const [selectedHazardId, setSelectedHazardId] = useState<string>(hazards[0]?.id || "");

  const selected = hazards.find(h => h.id === selectedHazardId) || hazards[0];
  const cellsForHazard = cells.filter(c => c.hazard_layer_id === selected?.id);

  if (hErr) {
    return (
      <div className="flex items-center gap-2 p-4 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs">Failed to load risk data: {hErr.message}</span>
      </div>
    );
  }

  if (hL || cL || dL) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span className="text-xs">Loading drill-down data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="hazard" className="text-[11px]">Hazard</TabsTrigger>
          <TabsTrigger value="exposure" className="text-[11px]">Exposure</TabsTrigger>
          <TabsTrigger value="vulnerability" className="text-[11px]">Vulnerability</TabsTrigger>
          <TabsTrigger value="compare" className="text-[11px]">Side-by-side sources</TabsTrigger>
        </TabsList>

        <TabsContent value="hazard" className="mt-3 space-y-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground mb-2">Registered hazard layers</p>
              <div className="space-y-1">
                {hazards.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHazardId(h.id)}
                    className={`w-full text-left rounded border p-2 transition-colors ${
                      selected?.id === h.id ? "border-foreground bg-accent" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{h.name}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[9px]">{h.hazard_type}</Badge>
                        <Badge variant="outline" className="text-[9px]">{h.acute_or_chronic}</Badge>
                        <Badge variant="outline" className="text-[9px]">{h.data_status}</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{h.methodology_notes}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <ProvenanceCard hazard={selected} />

          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground mb-2">Cell-level values</p>
              <table className="w-full text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left font-normal pb-1">District</th>
                    <th className="text-right font-normal pb-1">Score</th>
                    <th className="text-left font-normal pb-1 pl-3">Level</th>
                    <th className="text-left font-normal pb-1">Vintage</th>
                    <th className="text-left font-normal pb-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cellsForHazard.map(c => {
                    const d = districts.find(x => x.id === c.district_id);
                    return (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-1 text-foreground">{d?.name}</td>
                        <td className="py-1 text-right text-foreground">{c.intensity_score_0_100}</td>
                        <td className="py-1 pl-3"><Badge variant="outline" className="text-[9px]">{c.risk_level}</Badge></td>
                        <td className="py-1 text-muted-foreground">{c.vintage}</td>
                        <td className="py-1 text-muted-foreground">{c.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exposure" className="mt-3">
          <Card><CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Exposure layers</p>
            <p className="text-[11px] text-muted-foreground">
              No exposure layers are seeded in this prototype. The data model supports population, cropland, roads,
              schools, health facilities and forests — register layers via the ingestion module to populate this view.
            </p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="vulnerability" className="mt-3">
          <Card><CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Vulnerability models</p>
            <p className="text-[11px] text-muted-foreground">
              No vulnerability models are seeded. Models in this registry document assumptions, methodology references
              and uncertainty notes that translate hazard × exposure into vulnerability scores.
            </p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="compare" className="mt-3">
          <Card><CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Side-by-side source comparison</p>
            <p className="text-[11px] text-muted-foreground">
              When multiple providers register hazard layers for the same hazard type, this view will display them
              side-by-side with provenance and vintage — without forcing a single canonical truth.
              Currently only the prototype seed source is registered.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {hazards.map(h => (
                <div key={h.id} className="rounded border border-border p-2 space-y-1">
                  <p className="text-xs font-semibold text-foreground">{h.hazard_type}</p>
                  <p className="text-[10px] text-muted-foreground">{h.source_provider}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px]">{h.data_status}</Badge>
                    <Badge variant="outline" className="text-[9px]">{h.vintage_date}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}