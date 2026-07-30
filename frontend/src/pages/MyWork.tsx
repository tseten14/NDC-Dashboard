/**
 * Screen: your personal work queue.
 *
 * Gathers everything waiting on the signed-in person — their draft activities,
 * their uploads, and anything sitting in their approvals queue. The contents
 * change with the selected role.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  listActivitiesByCreator,
  listActivitiesByWorkflow,
} from "@/lib/activities-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { listUploads, type UploadedFile } from "@/lib/uploaded-files-store";
import { Plus, ClipboardList, Network, Eye, Loader2, FileText } from "lucide-react";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function MyWork() {
  const { user, activeRole } = useCurrentRole();
  const nav = useNavigate();
  const [activities, setActivities] = useState<ReturnType<typeof listActivitiesByCreator>>([]);
  const [submittedForReview, setSubmittedForReview] = useState<ReturnType<typeof listActivitiesByWorkflow>>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () => setUploads(listUploads());
    refresh();
    window.addEventListener("uploads-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("uploads-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!user || !activeRole) return;
    setLoading(true);
    setActivities(listActivitiesByCreator(user.id));

    if (activeRole === "SeniorDecisionMaker" || activeRole === "Admin") {
      setSubmittedForReview(listActivitiesByWorkflow("Submitted"));
    } else {
      setSubmittedForReview([]);
    }

    setLoading(false);
  }, [user, activeRole]);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto p-4 space-y-3">
        <div>
          <h1 className="text-base font-semibold">Database</h1>
        </div>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-xs uppercase tracking-wide">Uploaded documents</CardTitle>
                <CardDescription className="text-[10px]">Files added through Data Ingestion (saved in this browser).</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => nav("/ingest")} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Add files
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {uploads.length === 0 && <p className="text-[11px] text-muted-foreground">No files uploaded yet.</p>}
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-2 p-2 rounded border border-border">
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{u.ext || "file"}</span>
                <span className="text-[11px] flex-1 truncate">{u.name}</span>
                {u.rows != null && <span className="text-[10px] text-muted-foreground hidden sm:inline">{u.rows.toLocaleString()} rows</span>}
                <span className="text-[10px] text-muted-foreground">{fmtBytes(u.size)}</span>
                <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline">{u.status}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(u.uploadedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {(activeRole === "ProjectDeveloper" || activeRole === "FieldOfficer" || activeRole === "MinistryDeliveryOfficer" || activeRole === "SeniorDecisionMaker" || activeRole === "Admin") && (
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

        {(activeRole === "SeniorDecisionMaker" || activeRole === "Admin") && (
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
