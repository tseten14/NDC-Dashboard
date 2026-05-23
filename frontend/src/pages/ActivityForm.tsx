import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useCurrentRole } from "@/hooks/use-current-role";
import { createActivity, updateActivity, getActivityBundle } from "@/lib/activities-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetLinkPicker, type DraftLink } from "@/components/TargetLinkPicker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, Send, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

interface DraftOutput { id: string; metric_name: string; unit: string; value: string; output_date: string; method: string; }
interface DraftEvidence { id: string; evidence_type: string; link_or_file_ref: string; notes: string; }

export default function ActivityForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const [search] = useSearchParams();
  const { user, canCreateActivity, isReadOnly } = useCurrentRole();
  const isEdit = !!id;

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organization, setOrganization] = useState("");
  const [ministry, setMinistry] = useState("");
  const [districts, setDistricts] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState<"planned" | "active" | "completed">("planned");
  const [links, setLinks] = useState<DraftLink[]>([]);
  const [outputs, setOutputs] = useState<DraftOutput[]>([]);
  const [evidence, setEvidence] = useState<DraftEvidence[]>([]);

  // Pre-select target from URL ?targetId=
  useEffect(() => {
    if (!isEdit) {
      const tid = search.get("targetId");
      const strategy = search.get("strategy") as DraftLink["strategy"] | null;
      if (tid && links.length === 0) {
        setLinks([{
          targetId: tid,
          strategy: (strategy ?? "NDC"),
          relationshipType: "Direct",
          expectedContribution: "",
        }]);
      }
    }
    // eslint-disable-next-line
  }, []);

  // Load existing
  useEffect(() => {
    if (!isEdit || !id) return;
    const { activity, links: l, outputs: o, evidence: e } = getActivityBundle(id);
    if (activity) {
      setTitle(activity.title);
      setDescription(activity.description ?? "");
      setOrganization(activity.organization ?? "");
      setMinistry(activity.ministry ?? "");
      setDistricts((activity.districts ?? []).join(", "));
      setStart(activity.timeframe_start ?? "");
      setEnd(activity.timeframe_end ?? "");
      setStatus(activity.status);
    }
    setLinks(
      l.map((r) => ({
        strategy: r.strategy as DraftLink["strategy"],
        targetId: r.target_id,
        relationshipType: r.relationship_type as DraftLink["relationshipType"],
        expectedContribution: r.expected_contribution ?? "",
      })),
    );
    setOutputs(
      o.map((r) => ({
        id: r.id,
        metric_name: r.metric_name,
        unit: r.unit,
        value: String(r.value),
        output_date: r.output_date,
        method: r.method ?? "",
      })),
    );
    setEvidence(
      e.map((r) => ({
        id: r.id,
        evidence_type: r.evidence_type,
        link_or_file_ref: r.link_or_file_ref,
        notes: r.notes ?? "",
      })),
    );
    setLoading(false);
  }, [id, isEdit]);

  const addOutput = () => setOutputs([...outputs, {
    id: `new-${Date.now()}`, metric_name: "", unit: "", value: "", output_date: new Date().toISOString().slice(0, 10), method: "",
  }]);
  const addEvidence = () => setEvidence([...evidence, {
    id: `new-${Date.now()}`, evidence_type: "Link", link_or_file_ref: "", notes: "",
  }]);

  const validate = (forSubmit: boolean) => {
    if (!title.trim()) return "Title is required";
    if (forSubmit && links.length === 0) return "At least one target link is required to submit";
    return null;
  };

  const save = async (submit: boolean) => {
    if (!user) return;
    const err = validate(submit);
    if (err) { toast.error(err); return; }
    setBusy(true);

    const districtArr = districts.split(",").map((d) => d.trim()).filter(Boolean);
    const validOutputs = outputs.filter((o) => o.metric_name && o.unit && o.value);
    const validEv = evidence.filter((e) => e.link_or_file_ref);
    const input = {
      title,
      description: description || null,
      organization: organization || null,
      ministry: ministry || null,
      districts: districtArr,
      timeframe_start: start || null,
      timeframe_end: end || null,
      status,
      workflow_state: submit ? ("Submitted" as const) : ("Draft" as const),
      created_by: user.id,
      links: links.map((l) => ({
        strategy: l.strategy,
        target_id: l.targetId,
        relationship_type: l.relationshipType,
        expected_contribution: l.expectedContribution || null,
      })),
      outputs: validOutputs.map((o) => ({
        metric_name: o.metric_name,
        unit: o.unit,
        value: Number(o.value),
        output_date: o.output_date,
        method: o.method || null,
        created_by: user.id,
      })),
      evidence: validEv.map((e) => ({
        evidence_type: e.evidence_type,
        link_or_file_ref: e.link_or_file_ref,
        notes: e.notes || null,
        submitted_by: user.id,
      })),
    };

    let activityId = id;
    try {
      if (isEdit && id) {
        updateActivity(id, input);
        activityId = id;
      } else {
        activityId = createActivity(input);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
      return;
    }

    await logAudit(user.id, isEdit ? "update_activity" : "create_activity", "activity", activityId!,
      submit ? "Submitted for review" : "Saved as draft");

    setBusy(false);
    toast.success(submit ? "Submitted for review" : "Saved as draft");
    nav(`/activities/${activityId}`);
  };

  if (isReadOnly()) {
    return <div className="p-6 text-center text-sm text-muted-foreground">
      Read-only role cannot create or edit activities. Switch role from the top bar.
    </div>;
  }
  if (!canCreateActivity()) {
    return <div className="p-6 text-center text-sm text-muted-foreground">
      Your current role cannot create activities. Switch to Project Developer, Field Officer, Ministry Delivery Officer, or Admin.
    </div>;
  }
  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="h-7 text-xs gap-1">
            <ArrowLeft className="h-3 w-3" /> Back
          </Button>
          <h1 className="text-sm font-semibold">{isEdit ? "Edit activity" : "Create activity"}</h1>
          <div className="w-16" />
        </div>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-xs uppercase tracking-wide">1. Basics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-xs min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Implementing organization</Label>
                <Input value={organization} onChange={e => setOrganization(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Responsible ministry</Label>
                <Input value={ministry} onChange={e => setMinistry(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Districts (comma-separated)</Label>
              <Input value={districts} onChange={e => setDistricts(e.target.value)} placeholder="e.g. Kampala, Wakiso" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Start</Label>
                <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">End</Label>
                <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-xs uppercase tracking-wide">2. Target linking *</CardTitle></CardHeader>
          <CardContent>
            <TargetLinkPicker links={links} onChange={setLinks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase tracking-wide">3. Delivery outputs</CardTitle>
            <Button variant="outline" size="sm" onClick={addOutput} className="h-6 text-[10px] gap-1"><Plus className="h-3 w-3" />Add output</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {outputs.length === 0 && <p className="text-[11px] text-muted-foreground">No outputs yet. Add metrics like 'hectares restored', 'households served', etc.</p>}
            {outputs.map((o, i) => (
              <div key={o.id} className="border border-border rounded-md p-2 grid grid-cols-12 gap-1.5 items-end">
                <div className="col-span-4 space-y-0.5">
                  <Label className="text-[10px]">Metric</Label>
                  <Input value={o.metric_name} onChange={e => setOutputs(outputs.map((x, idx) => idx === i ? { ...x, metric_name: e.target.value } : x))} className="h-7 text-[11px]" />
                </div>
                <div className="col-span-2 space-y-0.5">
                  <Label className="text-[10px]">Unit</Label>
                  <Input value={o.unit} onChange={e => setOutputs(outputs.map((x, idx) => idx === i ? { ...x, unit: e.target.value } : x))} className="h-7 text-[11px]" />
                </div>
                <div className="col-span-2 space-y-0.5">
                  <Label className="text-[10px]">Value</Label>
                  <Input type="number" value={o.value} onChange={e => setOutputs(outputs.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} className="h-7 text-[11px]" />
                </div>
                <div className="col-span-3 space-y-0.5">
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" value={o.output_date} onChange={e => setOutputs(outputs.map((x, idx) => idx === i ? { ...x, output_date: e.target.value } : x))} className="h-7 text-[11px]" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOutputs(outputs.filter((_, idx) => idx !== i))} className="h-7 w-7 col-span-1"><Trash2 className="h-3 w-3" /></Button>
                <div className="col-span-12 space-y-0.5">
                  <Label className="text-[10px]">Method / source notes</Label>
                  <Input value={o.method} onChange={e => setOutputs(outputs.map((x, idx) => idx === i ? { ...x, method: e.target.value } : x))} className="h-7 text-[11px]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase tracking-wide">4. Evidence</CardTitle>
            <Button variant="outline" size="sm" onClick={addEvidence} className="h-6 text-[10px] gap-1"><Plus className="h-3 w-3" />Add evidence</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {evidence.length === 0 && <p className="text-[11px] text-muted-foreground">No evidence yet. Add links or file references (uploads supported in a follow-up).</p>}
            {evidence.map((e, i) => (
              <div key={e.id} className="border border-border rounded-md p-2 grid grid-cols-12 gap-1.5 items-end">
                <div className="col-span-3 space-y-0.5">
                  <Label className="text-[10px]">Type</Label>
                  <Select value={e.evidence_type} onValueChange={v => setEvidence(evidence.map((x, idx) => idx === i ? { ...x, evidence_type: v } : x))}>
                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Link">Link</SelectItem>
                      <SelectItem value="Document">Document</SelectItem>
                      <SelectItem value="Photo">Photo</SelectItem>
                      <SelectItem value="Report">Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-8 space-y-0.5">
                  <Label className="text-[10px]">URL or file reference</Label>
                  <Input value={e.link_or_file_ref} onChange={ev => setEvidence(evidence.map((x, idx) => idx === i ? { ...x, link_or_file_ref: ev.target.value } : x))} className="h-7 text-[11px]" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEvidence(evidence.filter((_, idx) => idx !== i))} className="h-7 w-7 col-span-1"><Trash2 className="h-3 w-3" /></Button>
                <div className="col-span-12 space-y-0.5">
                  <Label className="text-[10px]">Notes</Label>
                  <Input value={e.notes} onChange={ev => setEvidence(evidence.map((x, idx) => idx === i ? { ...x, notes: ev.target.value } : x))} className="h-7 text-[11px]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-3 border-t border-border">
          <Button variant="outline" disabled={busy} onClick={() => save(false)} className="gap-1 text-xs">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}<Save className="h-3 w-3" /> Save draft
          </Button>
          <Button disabled={busy} onClick={() => save(true)} className="gap-1 text-xs">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}<Send className="h-3 w-3" /> Submit for review
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
