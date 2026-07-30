/**
 * Screen: one delivery activity in full.
 *
 * Shows a single piece of work on the ground — what it is meant to achieve,
 * which NDC targets it contributes to, what it has produced, and the evidence
 * backing that. Reviewers use the buttons here to move it through approval
 * (submit, approve, return, decline) and to record verification.
 *
 * What a person can do here depends on their role: a field officer records
 * progress, a reviewer approves, and a read-only viewer sees but cannot change.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  getActivityBundle,
  getValidationsForOutputIds,
  setActivityWorkflow,
  approveTargetLink,
  addValidation,
  type WorkflowState,
  type StoredActivity,
  type ActivityTargetLink,
  type OutputRecord,
  type EvidenceItem,
  type ValidationRecord,
  type AuditEntry,
} from "@/lib/activities-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowBadge, ValidationBadge } from "@/components/WorkflowBadge";
import { Textarea } from "@/components/ui/textarea";
import { findTargetById } from "@/data/strategy-targets-flat";
import { ArrowLeft, Edit, Send, Check, X, Clock, ShieldCheck, Loader2, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ActivityDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, canApproveMapping, canVerify, isReadOnly } = useCurrentRole();
  const [activity, setActivity] = useState<StoredActivity | null>(null);
  const [links, setLinks] = useState<ActivityTargetLink[]>([]);
  const [outputs, setOutputs] = useState<OutputRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<
    { state: WorkflowState; title: string; cta: string; requireNote?: boolean } | null
  >(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [validateOpen, setValidateOpen] = useState<{ entity: string; entityId: string } | null>(null);
  const [vStatus, setVStatus] = useState("Verified");
  const [vNotes, setVNotes] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    const bundle = getActivityBundle(id);
    setActivity(bundle.activity);
    setLinks(bundle.links);
    setOutputs(bundle.outputs);
    setEvidence(bundle.evidence);
    setAudit(bundle.audit);
    if (bundle.outputs.length > 0) {
      setValidations(getValidationsForOutputIds(bundle.outputs.map((x) => x.id)));
    } else {
      setValidations([]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const transition = async (next: WorkflowState, note?: string) => {
    if (!user || !id) return;
    try {
      setActivityWorkflow(id, next);
      await logAudit(user.id, `transition_to_${next}`, "activity", id, note);
      toast.success(`Activity → ${next}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const approveLinkHandler = async (linkId: string) => {
    if (!user) return;
    try {
      approveTargetLink(linkId, user.id);
      await logAudit(user.id, "approve_link", "activity_target_link", linkId);
      toast.success("Link approved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const submitValidation = async () => {
    if (!user || !validateOpen) return;
    addValidation(validateOpen.entity, validateOpen.entityId, vStatus, vNotes || null, user.id);
    await logAudit(user.id, "validate", validateOpen.entity, validateOpen.entityId, `Status: ${vStatus}`);
    toast.success("Validation recorded");
    setValidateOpen(null);
    setVNotes("");
    load();
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!activity) return <div className="p-6 text-center text-sm">Activity not found.</div>;

  const isOwner = user?.id === activity.created_by;
  const canEditDraft = isOwner && (activity.workflow_state === "Draft" || activity.workflow_state === "Returned");
  const canSubmit = isOwner && activity.workflow_state === "Draft";
  const canApprove =
    canApproveMapping() &&
    (activity.workflow_state === "Submitted" || activity.workflow_state === "Pending");

  const validationFor = (outputId: string) => validations.filter(v => v.entity_id === outputId);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="h-7 text-xs gap-1">
            <ArrowLeft className="h-3 w-3" /> Back
          </Button>
          <div className="flex gap-1.5">
            {canEditDraft && <Button size="sm" variant="outline" onClick={() => nav(`/activities/${id}/edit`)} className="h-7 text-xs gap-1"><Edit className="h-3 w-3" /> Edit</Button>}
            {canSubmit && <Button size="sm" onClick={() => transition("Submitted")} className="h-7 text-xs gap-1"><Send className="h-3 w-3" /> Submit for review</Button>}
            {canApprove && <>
              <Button size="sm" onClick={() => { setDecision({ state: "Approved", title: "Approve activity", cta: "Approve" }); setDecisionNote(""); }} className="h-7 text-xs gap-1"><Check className="h-3 w-3" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => { setDecision({ state: "Declined", title: "Decline activity", cta: "Decline", requireNote: true }); setDecisionNote(""); }} className="h-7 text-xs gap-1"><X className="h-3 w-3" /> Decline</Button>
              <Button size="sm" variant="outline" onClick={() => { setDecision({ state: "Pending", title: "Mark as pending", cta: "Set pending", requireNote: true }); setDecisionNote(""); }} className="h-7 text-xs gap-1"><Clock className="h-3 w-3" /> Pending</Button>
            </>}
          </div>
        </div>

        <Card>
          <CardHeader className="py-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm leading-tight">{activity.title}</CardTitle>
              <WorkflowBadge state={activity.workflow_state} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {activity.description && <p className="text-muted-foreground">{activity.description}</p>}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Field label="Organization" value={activity.organization} />
              <Field label="Ministry" value={activity.ministry} />
              <Field label="Districts" value={(activity.districts ?? []).join(", ") || "—"} />
              <Field label="Status" value={activity.status} />
              <Field label="Timeframe" value={`${activity.timeframe_start ?? "—"} → ${activity.timeframe_end ?? "—"}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2"><CardTitle className="text-xs uppercase tracking-wide">Linked targets</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {links.length === 0 && <p className="text-[11px] text-muted-foreground">No target links.</p>}
            {links.map(l => {
              const t = findTargetById(l.target_id);
              return (
                <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <Badge variant="outline" className="text-[9px]">{l.strategy}</Badge>
                  <Badge variant="outline" className="text-[9px]">{l.relationship_type}</Badge>
                  <span className="text-[11px] flex-1">{t?.title ?? l.target_id}</span>
                  <Badge variant="outline" className={`text-[9px] ${l.approval_status === "Approved" ? "bg-on-track/15 text-on-track" : "bg-muted"}`}>{l.approval_status}</Badge>
                  {canApproveMapping() && l.approval_status === "Pending" && (
                    <Button size="sm" variant="outline" onClick={() => approveLinkHandler(l.id)} className="h-6 text-[10px]">Approve</Button>
                  )}
                  {l.strategy === "NDC" && (
                    <Button size="sm" variant="ghost" asChild className="h-6 text-[10px]">
                      <Link to={`/dashboard?target=${l.target_id}`}>Open in Dashboard</Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2"><CardTitle className="text-xs uppercase tracking-wide">Outputs</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {outputs.length === 0 && <p className="text-[11px] text-muted-foreground">No outputs reported.</p>}
            {outputs.map(o => {
              const vs = validationFor(o.id);
              const latest = vs[vs.length - 1];
              return (
                <div key={o.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <span className="text-[11px] flex-1"><strong>{o.metric_name}</strong>: {o.value} {o.unit} <span className="text-muted-foreground">({o.output_date})</span></span>
                  <ValidationBadge status={latest?.status ?? "Uploaded"} />
                  {canVerify() && (
                    <Button size="sm" variant="outline" onClick={() => setValidateOpen({ entity: "output", entityId: o.id })} className="h-6 text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> Validate
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2"><CardTitle className="text-xs uppercase tracking-wide">Evidence</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {evidence.length === 0 && <p className="text-[11px] text-muted-foreground">No evidence attached.</p>}
            {evidence.map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 text-[11px]">
                <Badge variant="outline" className="text-[9px]">{e.evidence_type}</Badge>
                <a href={e.link_or_file_ref} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary hover:underline">{e.link_or_file_ref}</a>
                <span className="text-[10px] text-muted-foreground">{e.notes}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 flex flex-row items-center gap-2 space-y-0">
            <MessagesSquare className="h-3 w-3" />
            <CardTitle className="text-xs uppercase tracking-wide">Audit log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {audit.length === 0 && <p className="text-[11px] text-muted-foreground">No history yet.</p>}
            {audit.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-[10px] text-muted-foreground border-b border-border last:border-0 py-1">
                <span className="font-mono">{new Date(a.created_at).toLocaleString()}</span>
                <Badge variant="outline" className="text-[9px]">{a.action}</Badge>
                {a.diff_summary && <span className="flex-1">{a.diff_summary}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!decision} onOpenChange={(o) => { if (!o) { setDecision(null); setDecisionNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{decision?.title}</DialogTitle></DialogHeader>
          <Textarea
            value={decisionNote}
            onChange={e => setDecisionNote(e.target.value)}
            placeholder={decision?.requireNote ? "Add a comment (required)" : "Add a comment (optional)"}
            className="text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDecision(null); setDecisionNote(""); }}>Cancel</Button>
            <Button
              size="sm"
              disabled={!!decision?.requireNote && !decisionNote.trim()}
              onClick={() => {
                if (!decision) return;
                transition(decision.state, decisionNote.trim() || undefined);
                setDecision(null);
                setDecisionNote("");
              }}
            >
              {decision?.cta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!validateOpen} onOpenChange={(o) => !o && setValidateOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Record validation (MRV)</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Select value={vStatus} onValueChange={setVStatus}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Uploaded">Uploaded (unverified)</SelectItem>
                <SelectItem value="Verified">Verified by MRV authority</SelectItem>
                <SelectItem value="Modelled">Modelled / Estimated</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={vNotes} onChange={e => setVNotes(e.target.value)} placeholder="QA notes" className="text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setValidateOpen(null)}>Cancel</Button>
            <Button size="sm" onClick={submitValidation}>Save validation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-[11px]">{value || "—"}</p>
    </div>
  );
}
