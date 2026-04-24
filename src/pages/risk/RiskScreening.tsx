// Operational risk screening: pick an NDC target/activity → see hazards, risk level, and adaptation options.
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { allFlatTargets } from "@/data/strategy-targets-flat";
import { useAdaptationOptions, useHazardLayers, useRiskCells, useRiskDistricts, riskColor, riskLevelFromScore } from "@/hooks/use-risk-data";
import { Download, FileText } from "lucide-react";

export default function RiskScreening() {
  const { data: hazards } = useHazardLayers();
  const { data: cells } = useRiskCells();
  const { data: districts } = useRiskDistricts();
  const { data: options } = useAdaptationOptions();

  const [targetId, setTargetId] = useState<string>(allFlatTargets[0]?.id || "");
  const [districtId, setDistrictId] = useState<string>("ALL");

  const target = allFlatTargets.find(t => t.id === targetId);

  // Aggregate risk: average intensity by hazard for either selected district or all.
  const screening = useMemo(() => {
    return hazards.map(h => {
      const relevant = cells.filter(c =>
        c.hazard_layer_id === h.id &&
        (districtId === "ALL" || c.district_id === districtId)
      );
      const avg = relevant.length > 0
        ? Math.round(relevant.reduce((s, c) => s + c.intensity_score_0_100, 0) / relevant.length)
        : 0;
      const conf = relevant[0]?.confidence || h.confidence_rating;
      return {
        hazard: h,
        score: avg,
        level: riskLevelFromScore(avg),
        confidence: conf,
        coverage: relevant.length,
      };
    }).sort((a, b) => b.score - a.score);
  }, [hazards, cells, districtId]);

  const topHazardTypes = screening.filter(s => s.score > 0).slice(0, 3).map(s => s.hazard.hazard_type);
  const recommended = options.filter(o => o.hazard_types.some(t => topHazardTypes.includes(t)));

  const exportBrief = () => {
    const lines = [
      `RISK BRIEF — illustrative prototype`,
      `Generated: ${new Date().toISOString().split("T")[0]}`,
      ``,
      `Target: ${target?.title || targetId}`,
      `Strategy: ${target?.strategy || "—"}`,
      `Geography: ${districtId === "ALL" ? "National (all placeholder districts)" : districts.find(d => d.id === districtId)?.name}`,
      ``,
      `RISK SCREENING`,
      ...screening.map(s => `- ${s.hazard.hazard_type}: score ${s.score}/100 (${s.level}), confidence ${s.confidence}`),
      ``,
      `RECOMMENDED ADAPTATION OPTIONS`,
      ...recommended.map(o => `- ${o.name}\n    ${o.description}\n    Risk reduction: ${o.expected_risk_reduction}`),
      ``,
      `DATA STATUS: All values are illustrative placeholders for prototype testing.`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-brief-${targetId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">NDC target / activity</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allFlatTargets.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    [{t.strategy}] {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Geography</Label>
            <Select value={districtId} onValueChange={setDistrictId}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">National (all districts)</SelectItem>
                {districts.map(d => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Screening results */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Risk screening result</p>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={exportBrief}>
              <Download className="h-3 w-3 mr-1" /> Export Risk Brief
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {screening.map(s => (
              <div key={s.hazard.id} className="rounded border border-border p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.hazard.hazard_type}</span>
                  <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: riskColor(s.score) }} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-foreground">{s.score}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[9px]">{s.level}</Badge>
                  <Badge variant="outline" className="text-[9px]">Conf: {s.confidence}</Badge>
                  <Badge variant="outline" className="text-[9px]">{s.hazard.data_status}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{s.hazard.methodology_notes}</p>
              </div>
            ))}
          </div>
          <div className="rounded border border-border bg-muted/40 p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Interpretive narrative</p>
            <p className="text-[11px] text-foreground">
              For <strong>{target?.title || "—"}</strong>{districtId !== "ALL" && <> in <strong>{districts.find(d => d.id === districtId)?.name}</strong></>},
              the dominant illustrative hazards are
              {" "}
              <strong>{topHazardTypes.join(", ") || "—"}</strong>.
              Risk values are derived from prototype indices; treat as directional only and validate with sectoral MRV before decisions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Adaptation options */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Recommended adaptation options
          </p>
          {recommended.length === 0 && <p className="text-[11px] text-muted-foreground">No matched options.</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {recommended.map(o => (
              <div key={o.id} className="rounded border border-border p-2 space-y-1">
                <p className="text-xs font-semibold text-foreground">{o.name}</p>
                <p className="text-[10px] text-muted-foreground">{o.description}</p>
                <div className="flex flex-wrap gap-1">
                  {o.hazard_types.map(t => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Risk reduction: <span className="text-foreground">{o.expected_risk_reduction}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Co-benefits: <span className="text-foreground">{o.co_benefits}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}