/**
 * Screen: named contacts.
 *
 * The named person or office responsible for each commitment — the answer to
 * "who do I actually call about this?"
 */
import { actors, kpis, dataSources, activities, getDataSource } from "@/data/uganda-strategy-data";
import { useAppContext } from "@/hooks/use-app-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";

const roleColors: Record<string, string> = {
  DataOwner: "bg-chart-4/10 text-chart-4 border-chart-4/30",
  Validator: "bg-on-track/10 text-on-track border-on-track/30",
  DecisionMaker: "bg-chart-5/10 text-chart-5 border-chart-5/30",
  Liaison: "bg-at-risk/10 text-at-risk border-at-risk/30",
  Consulted: "bg-muted text-muted-foreground",
  Responsible: "bg-primary/10 text-primary",
};

export default function OwnershipFocals() {
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const roles = [...new Set(actors.map(a => a.project_role))];

  const filtered = roleFilter ? actors.filter(a => a.project_role === roleFilter) : actors;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-6xl">
        <h2 className="text-lg font-bold text-foreground">Ownership & Focal Points</h2>
        <p className="text-xs text-muted-foreground">Roster of actors with roles, datasets, KPIs, and contact details.</p>

        {/* Role filters */}
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setRoleFilter(null)}
            className={cn("px-2 py-0.5 text-[10px] rounded-md border transition-colors",
              !roleFilter ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-muted"
            )}>All ({actors.length})</button>
          {roles.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn("px-2 py-0.5 text-[10px] rounded-md border transition-colors",
                roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-muted"
              )}>{r} ({actors.filter(a => a.project_role === r).length})</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(actor => {
            const ownedActivities = activities.filter(a => a.data_owner_id === actor.id || a.validator_id === actor.id || a.decision_owner_id === actor.id);
            const contactedSources = dataSources.filter(ds => ds.contact_actor_id === actor.id);

            return (
              <Card key={actor.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{actor.display_name}</h4>
                      <p className="text-[10px] text-muted-foreground">{actor.org_unit}</p>
                      <p className="text-[9px] text-muted-foreground">{actor.title_or_role}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-[9px] h-4", roleColors[actor.project_role])}>{actor.project_role}</Badge>
                      <Badge variant="outline" className="text-[8px] h-3">{actor.type}</Badge>
                    </div>
                  </div>

                  {actor.notes && <p className="text-[9px] text-muted-foreground mt-1 italic">{actor.notes}</p>}

                  {actor.email && <p className="text-[9px] text-foreground mt-1">📧 {actor.email}</p>}
                  {actor.phone && <p className="text-[9px] text-foreground">📞 {actor.phone}</p>}

                  {ownedActivities.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Activities:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ownedActivities.map(a => <Badge key={a.id} variant="outline" className="text-[8px] h-3">{a.title.slice(0, 30)}…</Badge>)}
                      </div>
                    </div>
                  )}

                  {contactedSources.length > 0 && (
                    <div className="mt-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Data Sources:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {contactedSources.map(ds => <Badge key={ds.id} variant="outline" className="text-[8px] h-3">{ds.name}</Badge>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
