/**
 * Diagram: how a policy leads to an outcome.
 *
 * Draws the chain from action to emissions effect as a diagram, so the reasoning
 * can be followed step by step rather than accepted as a single figure.
 */
import { Link } from "react-router-dom";
import {
  URBAN_TRANSPORT_PATHWAY,
  type PathwayNode,
  type PathwayNodeKind,
  type TransportPathwayModel,
} from "@/data/transport-theory-of-change";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Car,
  Bike,
  Users,
  Target,
  Workflow,
  LayoutDashboard,
  Search,
} from "lucide-react";

const COLUMN_META: { kind: PathwayNodeKind | "aggregate"; title: string; sub: string }[] = [
  { kind: "intervention", title: "Interventions", sub: "Policy & programme instruments" },
  { kind: "attribute", title: "Attributes", sub: "Immediate system changes" },
  { kind: "behaviour", title: "Behavioural changes", sub: "How people perceive choices" },
  { kind: "aggregate", title: "People", sub: "Aggregate decision-making" },
  { kind: "shift", title: "Activity shift", sub: "Modal change" },
  { kind: "outcome", title: "Outcomes", sub: "Intended results (NDC-relevant)" },
];

function nodesByKind(model: TransportPathwayModel, kind: PathwayNodeKind | "aggregate") {
  if (kind === "aggregate") return model.nodes.filter((n) => n.kind === "aggregate");
  return model.nodes.filter((n) => n.kind === kind);
}

function NodeCard({
  node,
  onFindDocuments,
}: {
  node: PathwayNode;
  onFindDocuments?: (hints: string[]) => void;
}) {
  const isShift = node.kind === "shift";
  const isPeople = node.kind === "aggregate";

  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-[10px] font-medium leading-snug",
        node.kind === "intervention" && "border-primary/40 bg-primary/5 text-foreground",
        node.kind === "attribute" && "border-border bg-muted/40",
        node.kind === "behaviour" && "border-border bg-card",
        isPeople && "border-accent/50 bg-accent/10 text-center py-3",
        isShift && "border-sky-500/40 bg-sky-500/10 text-center py-2",
        node.kind === "outcome" && "border-on-track/40 bg-on-track/5 text-foreground",
      )}
    >
      {isPeople && (
        <Users className="h-4 w-4 mx-auto mb-1 text-accent" aria-hidden />
      )}
      {isShift && (
        <div className="flex items-center justify-center gap-2 mb-1">
          <Car className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <ArrowRight className="h-3 w-3 text-sky-600" aria-hidden />
          <Bike className="h-3.5 w-3.5 text-sky-600" aria-hidden />
        </div>
      )}
      <span>{node.label}</span>
      {node.kind === "intervention" && node.documentHints && onFindDocuments && (
        <button
          type="button"
          className="mt-1 flex items-center gap-0.5 text-[9px] text-primary hover:underline font-normal"
          onClick={() => onFindDocuments(node.documentHints!)}
        >
          <Search className="h-2.5 w-2.5" />
          Related documents
        </button>
      )}
    </div>
  );
}

interface PolicyPathwayDiagramProps {
  model?: TransportPathwayModel;
  onFindDocuments?: (hints: string[]) => void;
  compact?: boolean;
  showFooter?: boolean;
}

export function PolicyPathwayDiagram({
  model: modelProp,
  onFindDocuments,
  compact = false,
  showFooter = true,
}: PolicyPathwayDiagramProps) {
  const model = modelProp ?? URBAN_TRANSPORT_PATHWAY;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Workflow className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-foreground">{model.title}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{model.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[9px]">
              Sector: {model.sector}
            </Badge>
            <Badge variant="outline" className="text-[9px]">
              <Target className="h-2.5 w-2.5 mr-1 inline" />
              {model.ndcTargetHint}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground border-l-2 border-amber-500/50 pl-2">
            <span className="font-medium text-foreground">Intended vs measured:</span>{" "}
            {model.measuredOutcomeNote}
          </p>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" asChild>
            <Link to="/dashboard?sector=Transport">
              <LayoutDashboard className="h-3 w-3 mr-1" />
              Open Transport on Dashboard (measured)
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-1 min-w-[920px]">
          {COLUMN_META.map((col, colIdx) => {
            const nodes = nodesByKind(model, col.kind);
            return (
              <div key={col.title} className="flex items-stretch flex-1 min-w-[130px]">
                <div className="flex-1 flex flex-col">
                  <div className="mb-2 px-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {col.title}
                    </p>
                    <p className="text-[8px] text-muted-foreground leading-tight">{col.sub}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {nodes.map((node) => (
                      <NodeCard key={node.id} node={node} onFindDocuments={onFindDocuments} />
                    ))}
                  </div>
                </div>
                {colIdx < COLUMN_META.length - 1 && (
                  <div className="flex items-center px-0.5 shrink-0 self-center pt-8">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showFooter && !compact && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] font-semibold text-foreground mb-1">How this relates to documents</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Interventions (left) are the kinds of measures described in national plans, laws, and fund
              proposals in the document library. Outcomes (right) connect to NDC targets; confirming
              achievement uses observed data, not this diagram alone. Click{" "}
              <span className="font-medium">Related documents</span> on an intervention to search the corpus.
            </p>
            <p className="text-[9px] text-muted-foreground mt-2 italic">
              Model adapted from NDC Align / data-driven transitions stakeholder materials (illustrative
              urban transport example).
            </p>
          </CardContent>
        </Card>
      )}

      {!compact && (
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Show link map ({model.edges.length} connections)</summary>
          <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto font-mono text-[9px]">
            {model.edges.slice(0, 24).map((e, i) => {
              const from = model.nodes.find((n) => n.id === e.from)?.label ?? e.from;
              const to = model.nodes.find((n) => n.id === e.to)?.label ?? e.to;
              return (
                <li key={i}>
                  {from} → {to}
                </li>
              );
            })}
            {model.edges.length > 24 && <li>…and {model.edges.length - 24} more</li>}
          </ul>
        </details>
      )}
    </div>
  );
}
