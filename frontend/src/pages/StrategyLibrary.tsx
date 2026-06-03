import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { indicatorRegistry } from "@/data/indicator-registry";
import { ndcTargets, ndcActivities } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { isMtco2eEmissionsTarget } from "@/lib/emissions-integration";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Plus, Sparkles, Search, AlertCircle, CheckCircle2, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Indicator, Strategy } from "@/data/indicator-registry";
import type { NDCTarget } from "@/data/uganda-ndc-data";

type RegistryRow = {
  id: string;
  strategy: Strategy;
  goal: string;
  sector: string;
  name: string;
  unit: string;
  baseline: number | null;
  target: number | null;
  targetYear: string;
  owner: string | null;
  activities: number;
  status: "on-track" | "at-risk" | "off-track" | "unknown" | "no-activity";
  evidence: "Seeded" | "Uploaded" | "Verified";
  ndcTargetId?: string;
  sectorId?: string;
};

const STRATEGY_LABEL: Record<Strategy, string> = {
  NDPIV: "NDP IV",
  TENFOLD: "Tenfold Growth",
  NDC: "Updated NDC",
};

function indicatorToRow(
  ind: Indicator,
  getProgressForTarget: ReturnType<typeof useEmissionsData>["getProgressForTarget"],
): RegistryRow {
  // Heuristic: link to NDC target if name overlaps sector keywords (best-effort).
  const matchedNdc = findLinkedNdcTarget(ind);
  const acts = matchedNdc ? ndcActivities.filter(a => a.targetId === matchedNdc.id).length : 0;
  let status: RegistryRow["status"] = "unknown";
  if (matchedNdc) {
    if (acts === 0) {
      status = "no-activity";
    } else {
      const { status: s } = getProgressForTarget(matchedNdc);
      status = s;
    }
  } else if (acts === 0) {
    status = "no-activity";
  }
  const evidence: RegistryRow["evidence"] =
    ind.validation_status === "Verified" ? "Verified" :
    ind.validation_status === "Provisional" ? "Uploaded" : "Seeded";
  return {
    id: ind.id,
    strategy: ind.strategy,
    goal: ind.objective_or_outcome,
    sector: ind.sector_or_programme,
    name: ind.indicator_name,
    unit: ind.unit,
    baseline: ind.baseline_value,
    target: ind.target_value_2030 ?? ind.target_value_2025 ?? ind.target_value_2040,
    targetYear: ind.target_year_primary,
    owner: ind.data_owner,
    activities: acts,
    status,
    evidence,
    ndcTargetId: matchedNdc?.id,
    sectorId: matchedNdc?.sectorId,
  };
}

function findLinkedNdcTarget(ind: Indicator): NDCTarget | undefined {
  const txt = (ind.indicator_name + " " + ind.sector_or_programme).toLowerCase();
  const sectorMap: Array<[string, string]> = [
    ["forest", "afolu"], ["land use", "afolu"], ["wetland", "afolu"],
    ["energy", "energy"], ["electricity", "energy"], ["renewable", "energy"], ["cooking", "energy"],
    ["transport", "transport"], ["freight", "transport"], ["rail", "transport"],
    ["waste", "waste"],
    ["industrial", "ippu"],
    ["agric", "agriculture"], ["irrigation", "agriculture"], ["farmers", "agriculture"],
  ];
  for (const [kw, sectorId] of sectorMap) {
    if (txt.includes(kw)) {
      const bySector = ndcTargets.filter(t => t.sectorId === sectorId);
      const emissionsFirst = bySector.find(t => isMtco2eEmissionsTarget(t));
      return emissionsFirst ?? bySector[0];
    }
  }
  return undefined;
}

export default function StrategyLibrary() {
  const navigate = useNavigate();
  const { getProgressForTarget } = useEmissionsData();
  const [strategy, setStrategy] = useState<Strategy | "ALL">("ALL");
  const [q, setQ] = useState("");

  const rows = useMemo<RegistryRow[]>(
    () => indicatorRegistry.map(ind => indicatorToRow(ind, getProgressForTarget)),
    [getProgressForTarget],
  );
  const filtered = rows.filter(r =>
    (strategy === "ALL" || r.strategy === strategy) &&
    (q === "" || (r.name + " " + r.goal + " " + r.sector).toLowerCase().includes(q.toLowerCase()))
  );

  const grouped = useMemo(() => {
    const out: Record<string, Record<string, RegistryRow[]>> = {};
    for (const r of filtered) {
      const s = STRATEGY_LABEL[r.strategy];
      out[s] ??= {};
      out[s][r.goal] ??= [];
      out[s][r.goal].push(r);
    }
    return out;
  }, [filtered]);

  const implGap = filtered.filter(r => r.activities === 0);
  const mrvGap = filtered.filter(r => r.activities > 0 && r.status === "unknown");
  const deliveryGap = filtered.filter(r => r.status === "off-track" || r.status === "at-risk");

  const openInNDC = (r: RegistryRow) => {
    if (r.ndcTargetId) {
      navigate(`/dashboard?target=${r.ndcTargetId}&sector=${r.sectorId}`);
    } else {
      navigate(`/dashboard`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-base font-bold">Strategy Library</h1>
        <p className="text-xs text-muted-foreground">All goals, targets and indicators across NDC, NDP IV and Tenfold Growth — with coverage and gap visibility.</p>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border border-input overflow-hidden">
          {(["ALL", "NDC", "NDPIV", "TENFOLD"] as const).map(s => (
            <button key={s} onClick={() => setStrategy(s)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium border-r last:border-r-0 border-input",
                strategy === s ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              )}>
              {s === "ALL" ? "All" : STRATEGY_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search indicators…" className="h-7 pl-7 text-xs" />
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} indicators</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="registry" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 h-8 self-start">
          <TabsTrigger value="registry" className="text-xs">Registry</TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs gap-1">
            Coverage & Gaps
            <Badge variant="outline" className="text-[9px] h-4 px-1">{implGap.length + mrvGap.length + deliveryGap.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="flex-1 overflow-auto px-4 py-2 mt-0">
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(grouped).map(([strat, goals]) => (
              <AccordionItem key={strat} value={strat} className="border border-border rounded-md bg-card">
                <AccordionTrigger className="px-3 py-2 text-xs font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{strat}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {Object.values(goals).reduce((a, g) => a + g.length, 0)} indicators
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-2">
                  <Accordion type="multiple" className="space-y-1">
                    {Object.entries(goals).map(([goal, indicators]) => (
                      <AccordionItem key={goal} value={goal} className="border-b border-border last:border-b-0">
                        <AccordionTrigger className="text-[11px] py-1.5 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{goal}</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{indicators.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          <div className="space-y-1">
                            {indicators.map(r => <IndicatorRow key={r.id} row={r} onOpen={() => openInNDC(r)} />)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="gaps" className="flex-1 overflow-auto px-4 py-2 mt-0 space-y-3">
          <GapQueue title="Implementation gap" subtitle="Targets with 0 mapped activities" rows={implGap} icon={<AlertCircle className="h-3.5 w-3.5 text-at-risk" />} onOpen={openInNDC} emptyText="All filtered targets have at least one mapped activity." />
          <GapQueue title="MRV gap" subtitle="Activities exist but observed data is missing" rows={mrvGap} icon={<Database className="h-3.5 w-3.5 text-muted-foreground" />} onOpen={openInNDC} emptyText="No targets with missing data." />
          <GapQueue title="Delivery gap" subtitle="Data exists but progress is off-track or at risk" rows={deliveryGap} icon={<AlertCircle className="h-3.5 w-3.5 text-off-track" />} onOpen={openInNDC} emptyText="No targets are currently off-track." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IndicatorRow({ row, onOpen }: { row: RegistryRow; onOpen: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-[10px] py-1 px-2 rounded hover:bg-muted/40 border border-transparent hover:border-border">
      <div className="col-span-4 min-w-0">
        <p className="font-medium truncate" title={row.name}>{row.name}</p>
        <p className="text-muted-foreground truncate">{row.sector} · {row.unit}</p>
      </div>
      <div className="col-span-2 tabular-nums">
        <span className="text-muted-foreground">{row.baseline ?? "—"}</span>
        <span className="mx-1">→</span>
        <span className="font-semibold">{row.target ?? "—"}</span>
        <span className="text-muted-foreground ml-1">({row.targetYear})</span>
      </div>
      <div className="col-span-1">
        <Badge variant="outline" className="text-[9px] h-4 px-1">{row.activities} act</Badge>
      </div>
      <div className="col-span-2">
        <StatusBadge status={row.status} />
      </div>
      <div className="col-span-1">
        <EvidenceBadge ev={row.evidence} />
      </div>
      <div className="col-span-2 flex items-center justify-end gap-1">
        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] gap-1" onClick={onOpen} title="Open in Dashboard">
          Open <ArrowRight className="h-2.5 w-2.5" />
        </Button>
        {row.activities === 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-[9px] gap-1"
            title="Add / map an activity to this target"
            onClick={() => {
              if (row.ndcTargetId) {
                navigate(`/activities/new?targetId=${row.ndcTargetId}`);
              } else {
                navigate("/activities/new");
                toast.info("No linked NDC target — pick one on the activity form.");
              }
            }}
          >
            <Plus className="h-2.5 w-2.5" />
          </Button>
        )}
        {(row.activities === 0 || row.status === "off-track" || row.status === "at-risk") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-[9px] gap-1"
            title="Explore mitigation options in the Dashboard"
            onClick={() => {
              if (row.ndcTargetId) {
                navigate(`/dashboard?target=${row.ndcTargetId}&sector=${row.sectorId}`);
              } else {
                toast.info('Open this indicator in the Dashboard first ("Open" button).');
              }
            }}
          >
            <Sparkles className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function GapQueue({ title, subtitle, rows, icon, onOpen, emptyText }: {
  title: string; subtitle: string; rows: RegistryRow[]; icon: React.ReactNode;
  onOpen: (r: RegistryRow) => void; emptyText: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div>
          <h3 className="text-xs font-semibold">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">{rows.length}</Badge>
      </div>
      {rows.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic py-2">{emptyText}</p>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-auto">
          {rows.slice(0, 25).map(r => <IndicatorRow key={r.id} row={r} onOpen={() => onOpen(r)} />)}
          {rows.length > 25 && <p className="text-[10px] text-muted-foreground italic py-1 px-2">+{rows.length - 25} more</p>}
        </div>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: RegistryRow["status"] }) {
  const map: Record<RegistryRow["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    "on-track": { label: "On track", cls: "bg-on-track/15 text-on-track border-on-track/30", icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
    "at-risk": { label: "At risk", cls: "bg-at-risk/15 text-at-risk border-at-risk/30", icon: <AlertCircle className="h-2.5 w-2.5" /> },
    "off-track": { label: "Off track", cls: "bg-off-track/15 text-off-track border-off-track/30", icon: <AlertCircle className="h-2.5 w-2.5" /> },
    "unknown": { label: "Missing data", cls: "bg-muted text-muted-foreground border-border", icon: <Database className="h-2.5 w-2.5" /> },
    "no-activity": { label: "No activity", cls: "bg-at-risk/15 text-at-risk border-at-risk/30", icon: <AlertCircle className="h-2.5 w-2.5" /> },
  };
  const m = map[status];
  return <Badge variant="outline" className={cn("text-[9px] h-4 px-1 gap-0.5", m.cls)}>{m.icon}{m.label}</Badge>;
}

function EvidenceBadge({ ev }: { ev: RegistryRow["evidence"] }) {
  const cls =
    ev === "Verified" ? "bg-on-track/15 text-on-track border-on-track/30" :
    ev === "Uploaded" ? "bg-at-risk/15 text-at-risk border-at-risk/30" :
    "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={cn("text-[9px] h-4 px-1", cls)}>{ev}</Badge>;
}
