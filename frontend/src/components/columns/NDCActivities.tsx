import { type NDCActivity, type GeographyLevel, getActivitiesForTarget } from "@/data/uganda-ndc-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, MapPin, Send, User, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useCapturedActivities } from "@/hooks/use-captured-activities";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { ActionTemplates } from "@/components/ActionTemplates";
import { useCurrentRole } from "@/hooks/use-current-role";

interface NDCActivitiesProps {
  selectedTargetId: string | null;
  geographyLevel: GeographyLevel;
  selectedDistrictId: string | null;
}

export function NDCActivitiesColumn({ selectedTargetId, geographyLevel, selectedDistrictId }: NDCActivitiesProps) {
  const { canCreateActivity } = useCurrentRole();
  const { activities: captured } = useCapturedActivities(selectedTargetId);
  const emissions = useEmissionsData();

  if (!selectedTargetId) {
    return <EmptyState />;
  }

  let activities = getActivitiesForTarget(selectedTargetId);
  const fromCatalog = emissions.getActivitiesFromCatalog(selectedTargetId);
  if (fromCatalog.length > 0) {
    activities = fromCatalog;
  }

  // Filter by district if applicable
  if (geographyLevel === "district" && selectedDistrictId) {
    activities = activities.filter(a =>
      a.implementationLevel === "national" ||
      a.implementationLevel === "both" ||
      (a.districts && a.districts.includes(selectedDistrictId))
    );
  }

  const totalCount = activities.length + captured.length;
  const showGapTemplates = totalCount === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Activities / Measures</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totalCount} activit{totalCount !== 1 ? "ies" : "y"}
            {captured.length > 0 && <span className="ml-1 text-on-track">({captured.length} captured)</span>}
          </p>
        </div>
        {canCreateActivity() && (
          <Button asChild size="sm" variant="outline" className="h-6 text-[10px] gap-1 shrink-0">
            <Link to={`/activities/new?targetId=${selectedTargetId}`}>
              <Plus className="h-3 w-3" /> Add
            </Link>
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Captured (real DB) activities */}
          {captured.map(a => (
            <Card key={a.id} className="border-on-track/40">
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-foreground leading-tight flex-1">{a.title}</h4>
                  <WorkflowBadge state={a.workflow_state} />
                </div>
                {a.description && <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{a.description}</p>}
                {a.ministry && (
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground truncate">{a.ministry}</span>
                  </div>
                )}
                <Button asChild size="sm" variant="outline" className="h-6 text-[10px] gap-1 w-full">
                  <Link to={`/activities/${a.id}`}><ExternalLink className="h-3 w-3" /> Open activity</Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Seeded activities (existing) */}
          {activities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              geographyLevel={geographyLevel}
              selectedDistrictId={selectedDistrictId}
            />
          ))}

          {showGapTemplates && (
            <ActionTemplates targetId={selectedTargetId} reason="no-activities" />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ActivityCard({ activity, geographyLevel, selectedDistrictId }: {
  activity: NDCActivity; geographyLevel: GeographyLevel; selectedDistrictId: string | null;
}) {
  const isNationalOnly = activity.implementationLevel === "national";
  const showMuted = geographyLevel === "district" && isNationalOnly;

  return (
    <Card className={cn("transition-all", showMuted && "opacity-60")}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-semibold text-foreground leading-tight">{activity.name}</h4>
          <ImplLevelBadge level={activity.implementationLevel} />
        </div>

        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{activity.description}</p>

        {showMuted && (
          <p className="text-[10px] text-muted-foreground italic mt-1">National-level activity</p>
        )}

        {/* Ministry */}
        <div className="flex items-center gap-1 mt-2">
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground truncate">{activity.responsibleMinistry}</span>
        </div>

        {activity.responsibleDepartment && (
          <div className="flex items-center gap-1 mt-0.5 ml-4">
            <span className="text-[9px] text-muted-foreground">{activity.responsibleDepartment}</span>
          </div>
        )}

        {/* Focal point */}
        <div className="flex items-center gap-1 mt-1.5">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-foreground font-medium">{activity.focalPoint.name}</span>
          <span className="text-[9px] text-muted-foreground">({activity.focalPoint.role})</span>
        </div>

        {/* Notify button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2 h-6 text-[10px] gap-1 w-full">
              <Send className="h-3 w-3" />
              Notify focal point
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-sm">Notify Focal Point</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs font-medium text-foreground">{activity.focalPoint.name}</p>
                <p className="text-xs text-muted-foreground">{activity.focalPoint.role}</p>
                <a
                  href={`mailto:${activity.focalPoint.email}`}
                  className="text-xs text-primary underline underline-offset-2"
                >
                  {activity.focalPoint.email}
                </a>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{activity.responsibleMinistry}</p>
                {activity.responsibleDepartment && (
                  <p className="text-xs text-muted-foreground">{activity.responsibleDepartment}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium">Re: {activity.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  Opens a pre-filled email to the focal point in your mail client.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  const subject = `NDC activity follow-up: ${activity.name}`;
                  const body = `Dear ${activity.focalPoint.name},\n\nThis message concerns the NDC activity "${activity.name}" under ${activity.responsibleMinistry}.\n\n[Add your message here]\n\nSent via the Uganda NDC Data Explorer.`;
                  window.location.href = `mailto:${activity.focalPoint.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                Compose email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ImplLevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    national: "bg-chart-4/15 text-chart-4",
    district: "bg-at-risk/15 text-at-risk",
    both: "bg-on-track/15 text-on-track",
  };
  return (
    <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 shrink-0", styles[level])}>
      <MapPin className="h-2.5 w-2.5 mr-0.5" />
      {level === "both" ? "Nat + Dist" : level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Activities / Measures</h3>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">Select a target to view linked activities</p>
      </div>
    </div>
  );
}
