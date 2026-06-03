import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentRole, ALL_ROLES } from "@/hooks/use-current-role";
import {
  listActivitiesByCreator,
  listActivitiesByWorkflow,
  listOutputsWithActivityTitle,
} from "@/lib/activities-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowBadge, ValidationBadge } from "@/components/WorkflowBadge";
import { Plus, ShieldCheck, ClipboardList, Network, Eye, Loader2 } from "lucide-react";

export default function MyWork() {
  const { user, activeRole } = useCurrentRole();
  const nav = useNavigate();
  const [activities, setActivities] = useState<ReturnType<typeof listActivitiesByCreator>>([]);
  const [submittedForReview, setSubmittedForReview] = useState<ReturnType<typeof listActivitiesByWorkflow>>([]);
  const [outputsAwaiting, setOutputsAwaiting] = useState<ReturnType<typeof listOutputsWithActivityTitle>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeRole) return;
    setLoading(true);
    setActivities(listActivitiesByCreator(user.id));

    if (activeRole === "MinistryDeliveryOfficer" || activeRole === "Admin") {
      setSubmittedForReview(listActivitiesByWorkflow("Submitted"));
    } else {
      setSubmittedForReview([]);
    }

    if (activeRole === "MRVOfficer" || activeRole === "Admin") {
      setOutputsAwaiting(listOutputsWithActivityTitle());
    } else {
      setOutputsAwaiting([]);
    }
    setLoading(false);
  }, [user, activeRole]);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const roleMeta = ALL_ROLES.find((r) => r.id === activeRole);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto p-4 space-y-3">
        <div>
          <h1 className="text-base font-semibold">My Work</h1>
          <p className="text-[11px] text-muted-foreground">
            Acting as <strong>{roleMeta?.label ?? "—"}</strong>. {roleMeta?.description}
          </p>
        </div>

        {(activeRole === "ProjectDeveloper" || activeRole === "FieldOfficer" || activeRole === "MinistryDeliveryOfficer" || activeRole === "Admin") && (
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xs uppercase tracking-wide">My activities</CardTitle>
                <CardDescription className="text-[10px]">Stored locally in this browser.</CardDescription>
              </div>
              <Button size="sm" onClick={() => nav("/activities/new")} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Create activity
              </Button>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {activities.length === 0 && <p className="text-[11px] text-muted-foreground">No activities yet.</p>}
              {activities.map((a) => (
                <Link key={a.id} to={`/activities/${a.id}`} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/50">
                  <span className="text-[11px] flex-1 truncate">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground">{a.ministry || "—"}</span>
                  <WorkflowBadge state={a.workflow_state} />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {(activeRole === "MinistryDeliveryOfficer" || activeRole === "Admin") && (
          <Card>
            <CardHeader className="py-3 flex flex-row items-center gap-2 space-y-0">
              <ClipboardList className="h-4 w-4 text-chart-4" />
              <div>
                <CardTitle className="text-xs uppercase tracking-wide">Approvals queue</CardTitle>
                <CardDescription className="text-[10px]">Activities submitted for review.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {submittedForReview.length === 0 && <p className="text-[11px] text-muted-foreground">Nothing waiting.</p>}
              {submittedForReview.map((a) => (
                <Link key={a.id} to={`/activities/${a.id}`} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/50">
                  <span className="text-[11px] flex-1 truncate">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground">{a.organization || "—"}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {(activeRole === "MRVOfficer" || activeRole === "Admin") && (
          <Card>
            <CardHeader className="py-3 flex flex-row items-center gap-2 space-y-0">
              <ShieldCheck className="h-4 w-4 text-on-track" />
              <div>
                <CardTitle className="text-xs uppercase tracking-wide">Validation & QA queue</CardTitle>
                <CardDescription className="text-[10px]">Outputs awaiting MRV validation.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {outputsAwaiting.length === 0 && <p className="text-[11px] text-muted-foreground">No outputs to review.</p>}
              {outputsAwaiting.slice(0, 15).map((o) => (
                <Link key={o.id} to={`/activities/${o.activity_id}`} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/50">
                  <span className="text-[11px] flex-1 truncate"><strong>{o.metric_name}</strong>: {o.value} {o.unit}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{o.activities?.title}</span>
                  <ValidationBadge status="Uploaded" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {activeRole === "SeniorDecisionMaker" && (
          <Card>
            <CardHeader className="py-3 flex flex-row items-center gap-2 space-y-0">
              <Eye className="h-4 w-4" />
              <CardTitle className="text-xs uppercase tracking-wide">Briefing view</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="h-7 text-xs"><Link to="/dashboard">Open Dashboard</Link></Button>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs ml-2"><Link to="/library">Strategy Library</Link></Button>
            </CardContent>
          </Card>
        )}

        {activeRole === "Admin" && (
          <Card>
            <CardHeader className="py-3 flex flex-row items-center gap-2 space-y-0">
              <Network className="h-4 w-4" />
              <CardTitle className="text-xs uppercase tracking-wide">Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs"><Link to="/admin">Open admin tools</Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
