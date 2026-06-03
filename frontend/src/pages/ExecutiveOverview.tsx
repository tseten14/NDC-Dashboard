// Executive Overview — 4 tiles + What-must-change + Quantification backlog.
import { useMemo } from "react";
import { useCockpit } from "@/hooks/use-cockpit";
import {
  applyScope, deliveryConfidence, indicatorRegistry, progressPct, statusColor,
  whatMustChangeNow, quantificationBacklog, getById, confidenceScore,
} from "@/data/indicator-registry";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CockpitBar } from "@/components/CockpitBar";
import { TrendingUp, Factory, Leaf, ShieldCheck, AlertTriangle, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(v: number | null | undefined, unit?: string): string {
  if (v === null || v === undefined) return "—";
  if (unit === "USD" || unit === "UGX") return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (Math.abs(v) >= 1000) return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return String(v);
}

function StatusDot({ p, ind }: { p: number | null; ind?: import("@/data/indicator-registry").Indicator }) {
  const c = statusColor(p, ind);
  const cls = c === "on-track" ? "bg-on-track" : c === "at-risk" ? "bg-at-risk" : c === "off-track" ? "bg-off-track" : "bg-muted";
  return <span className={cn("inline-block h-2 w-2 rounded-full", cls)} />;
}

export default function ExecutiveOverview() {
  const c = useCockpit();
  const scoped = useMemo(() => applyScope({ strategies: c.strategies, atms_only: c.atms_only, verified_only: c.verified_only }), [c.strategies, c.atms_only, c.verified_only]);

  // Tile 1: Wealth Creation — pick income per capita + GDP growth + poverty
  const wealth = [getById("NDPIV-INC-02"), getById("NDPIV-INC-01"), getById("NDPIV-INC-03")].filter(Boolean) as ReturnType<typeof getById>[];

  // Tile 2: Productive Capacity (ATMS) — manufactured exports, energy capacity, FDI
  const productive = [getById("NDPIV-O3-01"), getById("NDPIV-O4-05"), getById("TF-07"), getById("NDPIV-O3-02")].filter(Boolean) as ReturnType<typeof getById>[];

  // Tile 3: Emissions Trajectory — NDC mitigation
  const emHead = getById("NDC-MIT-HEAD");
  const emTgt = getById("NDC-MIT-TGT");
  const emBau = getById("NDC-MIT-BAU");

  // Tile 4: Delivery Confidence — trackability ratio
  const conf = deliveryConfidence(scoped);

  const issues = useMemo(() => whatMustChangeNow(5).filter(i => c.strategies.includes(i.strategy)), [c.strategies]);
  const backlog = useMemo(() => quantificationBacklog().filter(i => c.strategies.includes(i.strategy)).slice(0, 8), [c.strategies]);

  return (
    <div className="flex flex-col h-full">
      <CockpitBar />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          <div>
            <h1 className="text-lg font-bold text-foreground">Executive Overview</h1>
            <p className="text-xs text-muted-foreground">Are we on track? What must change now? Who is responsible — with what evidence?</p>
          </div>

          {/* 4 TILES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              icon={<TrendingUp className="h-4 w-4" />}
              label="Wealth Creation"
              hint="NDP IV headline"
              primary={`USD ${fmt(getById("NDPIV-INC-02")?.target_value_2030)}`}
              sub={`Target FY29/30 income/capita (baseline USD ${fmt(getById("NDPIV-INC-02")?.baseline_value)})`}
              rows={wealth.map(i => ({ label: i!.indicator_name, p: progressPct(i!), val: i!.current_value ?? null, target: i!.target_value_2030 ?? null, unit: i!.unit }))}
            />
            <Tile
              icon={<Factory className="h-4 w-4" />}
              label="Productive Capacity"
              hint="ATMS · NDP IV + Tenfold"
              primary={`${fmt(getById("NDPIV-O4-05")?.target_value_2030)} MW`}
              sub="Energy capacity is the binding constraint for industrialisation"
              rows={productive.map(i => ({ label: i!.indicator_name, p: progressPct(i!), val: i!.current_value ?? null, target: i!.target_value_2030 ?? i!.target_value_2040 ?? null, unit: i!.unit }))}
            />
            <Tile
              icon={<Leaf className="h-4 w-4" />}
              label="Emissions Trajectory"
              hint="Updated NDC · 2030"
              primary={`${emTgt?.target_value_2030} MtCO₂e`}
              sub={`24.7% below BAU 2030 (BAU ${emBau?.baseline_value} MtCO₂e). Unconditional 5.9% · Conditional 18.8%.`}
              rows={[
                { label: "BAU 2030", p: null, val: emBau?.baseline_value ?? null, target: emBau?.target_value_2030 ?? null, unit: "MtCO₂e" },
                { label: "Target 2030", p: null, val: emTgt?.baseline_value ?? null, target: emTgt?.target_value_2030 ?? null, unit: "MtCO₂e" },
                { label: "Mitigation gap", p: null, val: null, target: emHead?.target_value_2030 ?? null, unit: "% below BAU" },
              ]}
            />
            <Tile
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Delivery Confidence"
              hint="Computed trackability"
              primary={`${conf.pct}%`}
              sub={`${conf.trackable} of ${conf.total} indicators in scope are trackable (unit + baseline + target + source + recent update + validated).`}
              rows={[
                { label: "Indicators in scope", p: null, val: conf.total, target: null, unit: "" },
                { label: "Trackable", p: null, val: conf.trackable, target: null, unit: "" },
                { label: "Missing essential metadata", p: null, val: conf.total - conf.trackable, target: null, unit: "" },
              ]}
              big
            />
          </div>

          {/* WHAT MUST CHANGE NOW */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-at-risk" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">What must change now</h2>
                <span className="text-[10px] text-muted-foreground">Top {issues.length} ranked by salience × (off-track ∨ low confidence)</span>
              </div>
              <div className="space-y-1.5">
                {issues.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">No surfaced priorities for current scope.</p>
                ) : issues.map(i => {
                  const p = progressPct(i);
                  const conf = confidenceScore(i);
                  return (
                    <div key={i.id} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                      <StatusDot p={p} ind={i} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate">{i.indicator_name}</p>
                        <p className="text-[9px] text-muted-foreground">{i.sector_or_programme} · {i.strategy}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4">conf {conf}</Badge>
                      <Badge variant="outline" className="text-[9px] h-4">{i.validation_status}</Badge>
                      {i.political_salience === 3 && <Badge className="text-[9px] h-4 bg-primary text-primary-foreground">headline</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* QUANTIFICATION BACKLOG */}
          <Card className="border-at-risk/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileWarning className="h-4 w-4 text-at-risk" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Quantification backlog</h2>
                <span className="text-[10px] text-muted-foreground">Indicators flagged Missing — excluded from progress calculations until quantified.</span>
              </div>
              {backlog.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">No backlog in current scope.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-1 font-semibold">Indicator</th>
                        <th className="text-left py-1 font-semibold">Strategy</th>
                        <th className="text-left py-1 font-semibold">Sector</th>
                        <th className="text-left py-1 font-semibold">Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backlog.map(i => (
                        <tr key={i.id} className="border-b border-border/30">
                          <td className="py-1 font-medium text-foreground">{i.indicator_name}</td>
                          <td className="py-1">{i.strategy}</td>
                          <td className="py-1 text-muted-foreground">{i.sector_or_programme}</td>
                          <td className="py-1 text-muted-foreground">
                            {i.target_value_2030 === null && i.target_value_2025 === null && i.target_value_2040 === null ? "Target" :
                             i.baseline_value === null ? "Baseline" : i.validation_status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function Tile({ icon, label, hint, primary, sub, rows, big }: {
  icon: React.ReactNode; label: string; hint: string; primary: string; sub: string;
  rows: { label: string; p: number | null; val: number | null; target: number | null; unit: string }[];
  big?: boolean;
}) {
  return (
    <Card className={cn(big && "border-primary/30")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{primary}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <p className="text-[10px] text-foreground/80 leading-snug">{sub}</p>
        <div className="space-y-1 pt-1 border-t border-border">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <StatusDot p={r.p} />
              <span className="flex-1 truncate text-foreground/90">{r.label}</span>
              <span className="text-muted-foreground">{r.val !== null ? fmt(r.val, r.unit) : "—"}{r.target !== null ? ` / ${fmt(r.target, r.unit)}` : ""} {r.unit}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
