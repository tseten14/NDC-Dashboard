// Interactive risk map: choropleth of districts colored by selected hazard layer.
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useHazardLayers, useRiskCells, useRiskDistricts } from "@/hooks/use-risk-data";
import { ChoroplethMap, RiskLegend } from "@/components/risk/ChoroplethMap";
import { ProvenanceCard } from "@/components/risk/ProvenanceCard";

export default function RiskMap() {
  const { data: hazards, loading: hL } = useHazardLayers();
  const { data: districts, loading: dL } = useRiskDistricts();
  const { data: cells, loading: cL } = useRiskCells();

  const [hazardId, setHazardId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [confFilter, setConfFilter] = useState<string>("All");
  const [scenarioFilter, setScenarioFilter] = useState<string>("All");

  // Default-select first hazard once loaded
  useEffect(() => {
    if (!hazardId && hazards.length > 0) setHazardId(hazards[0].id);
  }, [hazards, hazardId]);

  const scenarios = useMemo(
    () => Array.from(new Set(hazards.map(h => h.scenario_name).filter(Boolean) as string[])),
    [hazards]
  );

  // Apply filters to the visible hazard list
  const filteredHazards = useMemo(() => hazards.filter(h =>
    (statusFilter === "All" || h.data_status === statusFilter) &&
    (confFilter === "All" || h.confidence_rating === confFilter) &&
    (scenarioFilter === "All" || h.scenario_name === scenarioFilter)
  ), [hazards, statusFilter, confFilter, scenarioFilter]);

  const selected = hazards.find(h => h.id === hazardId);

  if (hL || dL || cL) {
    return <p className="text-[11px] text-muted-foreground">Loading risk layers…</p>;
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Category (hazard)</Label>
            <Select value={hazardId || ""} onValueChange={v => setHazardId(v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select hazard…" /></SelectTrigger>
              <SelectContent>
                {filteredHazards.map(h => (
                  <SelectItem key={h.id} value={h.id} className="text-xs">
                    {h.hazard_type} — {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Scenario</Label>
            <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All</SelectItem>
                {scenarios.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</Label>
            <Select value={confFilter} onValueChange={setConfFilter}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All</SelectItem>
                <SelectItem value="Low" className="text-xs">Low</SelectItem>
                <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
                <SelectItem value="High" className="text-xs">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">All</SelectItem>
                <SelectItem value="Illustrative" className="text-xs">Illustrative</SelectItem>
                <SelectItem value="Preliminary" className="text-xs">Preliminary</SelectItem>
                <SelectItem value="Validated" className="text-xs">Validated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Map + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-2">
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  {selected ? `${selected.hazard_type} — ${selected.scenario_name || "—"}` : "Select a hazard"}
                </p>
                <RiskLegend />
              </div>
              <ChoroplethMap
                districts={districts}
                cells={cells}
                selectedHazardId={hazardId}
              />
              <p className="text-[10px] text-muted-foreground">
                Hover a district for score details. Geometries are placeholders for prototype use only.
              </p>
            </CardContent>
          </Card>

          {/* District table */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground mb-2">District scores</p>
              <table className="w-full text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left font-normal pb-1">District</th>
                    <th className="text-left font-normal pb-1">Region</th>
                    <th className="text-right font-normal pb-1">Score</th>
                    <th className="text-left font-normal pb-1 pl-3">Level</th>
                    <th className="text-left font-normal pb-1">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map(d => {
                    const cell = cells.find(c => c.district_id === d.id && c.hazard_layer_id === hazardId);
                    return (
                      <tr key={d.id} className="border-t border-border">
                        <td className="py-1 text-foreground">{d.name}</td>
                        <td className="py-1 text-muted-foreground">{d.region}</td>
                        <td className="py-1 text-right text-foreground">{cell?.intensity_score_0_100 ?? "—"}</td>
                        <td className="py-1 pl-3">
                          {cell ? <Badge variant="outline" className="text-[9px]">{cell.risk_level}</Badge> : "—"}
                        </td>
                        <td className="py-1 text-muted-foreground">{cell?.confidence ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <ProvenanceCard hazard={selected} />
        </div>
      </div>
    </div>
  );
}