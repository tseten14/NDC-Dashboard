// Institutional Map — who owns what across government.
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataHonestyBadge } from "@/components/DataHonestyBadge";
import { Building2, AlertCircle } from "lucide-react";
import { actors, activities } from "@/data/uganda-strategy-data";
import type { Actor } from "@/data/uganda-strategy-data";

type InstitutionCategory = "Government Ministries" | "Regulatory Bodies" | "Development Partners" | "UN Agencies";

// Classify actors into institution categories based on org_unit / display_name
function categorise(actor: Actor): InstitutionCategory {
  const s = `${actor.org_unit} ${actor.display_name}`.toLowerCase();
  if (s.includes("unfccc") || s.includes("itu") || s.includes("un ")) return "UN Agencies";
  if (s.includes("planet") || s.includes("climate trace") || s.includes("qlik") || s.includes("climate analytics") || s.includes("climate policy radar") || s.includes("carbon access")) return "Development Partners";
  if (s.includes("mwe") || s.includes("maaif") || s.includes("memd") || s.includes("mofped") || s.includes("npa") || s.includes("ubos") || s.includes("sti")) return "Government Ministries";
  // default
  return "Government Ministries";
}

// Synthesize 2-3 responsible NDC actions per actor
function ndcActions(actor: Actor): string[] {
  const map: Record<string, string[]> = {
    "ACT-ISAAC": ["GHG Inventory lead", "Sector emissions submissions", "NDC baseline reporting"],
    "ACT-EDWARD": ["Spatial AFOLU datasets", "QA/QC for land-use MRV", "GIS monitoring"],
    "ACT-MOFPED-FOCAL": ["NDC finance gap tracking", "Budget alignment (CCBT)", "Investment coordination"],
    "ACT-NPA-FOCAL": ["NDP IV–NDC alignment", "Programme M&E", "Strategy integration"],
    "ACT-UBOS-FOCAL": ["Official statistics feed", "Data stewardship", "Proxy KPI validation"],
    "ACT-MARK": ["National stakeholder liaison", "Working group coordination", "Reporting facilitation"],
    "ACT-NICOLAS": ["Product architecture", "International coordination", "Standards oversight"],
    "ACT-JOAQUIM": ["Data quality assurance", "Indicator validation", "QA/QC protocols"],
    "ACT-PAU": ["Governance standards", "Interoperability rules", "Compliance oversight"],
    "ACT-PETER": ["Strategy alignment advisory", "Proxy indicator design", "Energy sector liaison"],
    "ACT-DAVID": ["Stakeholder scheduling", "Introductions", "Coordination support"],
    "ACT-PLANET": ["AFOLU remote sensing MRV", "EO analytics", "Land-cover change"],
    "ACT-TRACE-GAVIN": ["Emissions tracing", "MRV methodology", "Sector attribution"],
    "ACT-TRACE-LEKHA": ["MRV data pipelines", "Verification support", "Sector tracking"],
    "ACT-QLIK": ["Platform development", "Feasibility specs", "Product delivery"],
    "ACT-CA": ["Policy KPI methods", "Uncertainty analysis", "Technical review"],
    "ACT-CPR": ["Legal obligations tracking", "Policy data", "Best-practice repository"],
    "ACT-ITU": ["Interoperability standards", "Digital governance", "MoU fast-track"],
  };
  return map[actor.id] ?? [actor.title_or_role ?? "—"];
}

// Find actors owning >1 activity
function findMandateOverlaps(): { activity: string; owners: string[] }[] {
  const overlaps: { activity: string; owners: string[] }[] = [];
  for (const act of activities) {
    const owners = [
      actors.find(a => a.id === act.data_owner_id)?.display_name,
      actors.find(a => a.id === act.validator_id)?.display_name,
      actors.find(a => a.id === act.decision_owner_id)?.display_name,
    ].filter(Boolean) as string[];
    // Deduplicate
    const unique = [...new Set(owners)];
    if (unique.length > 1) {
      overlaps.push({ activity: act.title, owners: unique });
    }
  }
  return overlaps;
}

const CATEGORY_ORDER: InstitutionCategory[] = [
  "Government Ministries",
  "Regulatory Bodies",
  "Development Partners",
  "UN Agencies",
];

export default function InstitutionalMap() {
  const grouped = useMemo(() => {
    const map: Record<InstitutionCategory, Actor[]> = {
      "Government Ministries": [],
      "Regulatory Bodies": [],
      "Development Partners": [],
      "UN Agencies": [],
    };
    for (const actor of actors) {
      map[categorise(actor)].push(actor);
    }
    return map;
  }, []);

  const overlaps = useMemo(() => findMandateOverlaps(), []);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Institutional Alignment
              </h1>
              <p className="text-xs text-muted-foreground">Who owns what across government</p>
            </div>
            <DataHonestyBadge kind="illustrative" />
          </div>

          {/* Mandate Overlaps Alert */}
          {overlaps.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Mandate Overlaps — activities with multiple ownership roles
              </p>
              {overlaps.map((o, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-foreground font-medium">{o.activity}:</span>
                  {o.owners.map(name => (
                    <Badge key={name} variant="outline" className="text-[9px] h-3.5">{name}</Badge>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 4-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORY_ORDER.map(category => (
              <div key={category} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80 px-1">{category}</p>
                {grouped[category].length === 0 ? (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[10px] text-muted-foreground italic">No actors classified here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  grouped[category].map(actor => (
                    <Card key={actor.id} className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-3 space-y-1.5">
                        <div>
                          <p className="text-[11px] font-semibold text-foreground leading-tight">{actor.display_name}</p>
                          <p className="text-[9px] text-muted-foreground leading-snug">{actor.org_unit}</p>
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {ndcActions(actor).slice(0, 3).map(action => (
                            <Badge key={action} variant="outline" className="text-[9px] h-3.5 leading-tight">{action}</Badge>
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          <span className="font-semibold">Role:</span> {actor.project_role}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ))}
          </div>

          <p className="text-[9px] text-muted-foreground italic">
            Institution categories and NDC action assignments are illustrative. Update with verified focal point data from MWE-CCD.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
