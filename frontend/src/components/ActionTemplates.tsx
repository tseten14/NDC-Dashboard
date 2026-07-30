/**
 * Ready-made action suggestions.
 *
 * Offers standard next steps for a selected target, so a user is not left
 * staring at a problem with no suggested response.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, TrendingUp, Wrench, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { findTargetById } from "@/data/strategy-targets-flat";

interface Props {
  targetId: string;
  reason: "no-activities" | "off-track";
}

const templates = [
  { id: "new-activity", icon: Plus, title: "Propose a new activity", body: "Draft a new implementation activity that contributes to this target. Define metric outputs, owner, and timeframe.", cta: "Create activity" },
  { id: "scale-up", icon: TrendingUp, title: "Scale-up an existing activity", body: "Identify an existing activity that could expand its scope or geography to close the gap.", cta: "Browse activities" },
  { id: "blocker", icon: Wrench, title: "Remove a blocker / enabling action", body: "Document a procurement, regulatory, finance, or coordination blocker. Assign an owner.", cta: "Log blocker" },
  { id: "mrv", icon: Database, title: "MRV / data improvement action", body: "Improve data collection, methodology, or validation cadence so progress can be measured credibly.", cta: "Plan MRV action" },
];

export function ActionTemplates({ targetId, reason }: Props) {
  const t = findTargetById(targetId);
  const strategy = t?.strategy ?? "NDC";

  return (
    <Card className="border-at-risk/40 bg-at-risk/5">
      <CardHeader className="py-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-at-risk" />
          <CardTitle className="text-xs uppercase tracking-wide text-at-risk">
            {reason === "no-activities" ? "Implementation gap — no mapped activity" : "Off-track — recommended actions"}
          </CardTitle>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Templates only. These are not factual claims.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.map(tpl => {
          const Icon = tpl.icon;
          const isCreate = tpl.id === "new-activity";
          return (
            <div key={tpl.id} className="flex gap-2 items-start p-2 rounded border border-border bg-background">
              <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold">{tpl.title}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{tpl.body}</p>
              </div>
              {isCreate ? (
                <Button asChild size="sm" variant="outline" className="h-6 text-[10px] shrink-0">
                  <Link to={`/activities/new?targetId=${targetId}&strategy=${strategy}`}>{tpl.cta}</Link>
                </Button>
              ) : (
                <Badge variant="outline" className="text-[9px] shrink-0">Template</Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
