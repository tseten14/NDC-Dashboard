/**
 * Dialog: create or edit a marketplace deal.
 *
 * Covers the core pitch fields (title, sector, ask, problem, intervention).
 * Readiness, evaluation, and milestones can be added/edited as JSON when
 * more granular forms are needed — this keeps the first version usable.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { marketplaceApi } from "@/lib/api";
import { DEAL_STAGES, type DealPitch, type DealStage } from "@/data/mwp-marketplace-data";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const SECTORS = [
  { id: "afolu", label: "AFOLU" },
  { id: "energy", label: "Energy" },
  { id: "transport", label: "Transport" },
  { id: "waste", label: "Waste" },
  { id: "ippu", label: "IPPU" },
  { id: "agriculture", label: "Agriculture" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: DealPitch;
  onSaved?: () => void;
}

export function DealFormDialog({ open, onOpenChange, deal, onSaved }: Props) {
  const isEdit = Boolean(deal);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [ministry, setMinistry] = useState("");
  const [sectorId, setSectorId] = useState("afolu");
  const [geography, setGeography] = useState("");
  const [stage, setStage] = useState<DealStage>("Concept");
  const [problem, setProblem] = useState("");
  const [intervention, setIntervention] = useState("");
  const [askM, setAskM] = useState("");
  const [coFinanceM, setCoFinanceM] = useState("");
  const [annualMt, setAnnualMt] = useState("");
  const [instrument, setInstrument] = useState("");
  const [ndcTarget, setNdcTarget] = useState("");

  useEffect(() => {
    if (open && deal) {
      setTitle(deal.title);
      setMinistry(deal.ministry);
      setSectorId(deal.sectorId);
      setGeography(deal.geography);
      setStage(deal.stage);
      setProblem(deal.problem);
      setIntervention(deal.intervention);
      setAskM(String(deal.askM));
      setCoFinanceM(String(deal.coFinanceM));
      setAnnualMt(String(deal.annualMtCO2e));
      setInstrument(deal.instrument);
      setNdcTarget(deal.ndcTarget);
    } else if (open && !deal) {
      setTitle("");
      setMinistry("");
      setSectorId("afolu");
      setGeography("");
      setStage("Concept");
      setProblem("");
      setIntervention("");
      setAskM("");
      setCoFinanceM("");
      setAnnualMt("");
      setInstrument("");
      setNdcTarget("");
    }
  }, [open, deal]);

  const sectorLabel = SECTORS.find((s) => s.id === sectorId)?.label ?? sectorId;

  async function handleSave() {
    if (!title.trim() || !problem.trim()) {
      toast.error("Title and problem are required");
      return;
    }
    if ([askM, coFinanceM, annualMt].some((value) => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) {
      toast.error("Enter each financial and emissions estimate explicitly. Leave no blanks; use 0 only when your estimate is zero.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        ministry: ministry.trim(),
        sector: sectorLabel,
        sectorId,
        geography: geography.trim(),
        stage,
        problem: problem.trim(),
        intervention: intervention.trim(),
        askM: Number(askM),
        coFinanceM: Number(coFinanceM),
        annualMtCO2e: Number(annualMt),
        instrument: instrument.trim(),
        ndcTarget: ndcTarget.trim(),
        readiness: deal?.readiness ?? [],
        evidence: deal?.evidence ?? {
          dashboardHref: `/dashboard?sector=${sectorId}`,
          policyImpactHref: `/policy-impact?sector=${sectorLabel}`,
          climateFinanceHref: `/climate-finance?sector=${sectorId}`,
        },
        evaluation: deal?.evaluation,
        milestones: deal?.milestones ?? [],
      };

      if (isEdit && deal) {
        await marketplaceApi.updateDeal(deal.id, data);
        toast.success("Deal updated");
      } else {
        await marketplaceApi.createDeal(data);
        toast.success("Deal added to pipeline");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-base">{isEdit ? "Edit deal" : "Add to pipeline"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Project title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cattle Corridor Agroforestry Programme" className="text-sm" />
            </div>

            {/* Ministry + Sector */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Lead ministry</Label>
                <Input value={ministry} onChange={(e) => setMinistry(e.target.value)} placeholder="e.g. Ministry of Water and Environment" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sector</Label>
                <Select value={sectorId} onValueChange={setSectorId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Geography + Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Geography</Label>
                <Input value={geography} onChange={(e) => setGeography(e.target.value)} placeholder="e.g. 12 districts across the cattle corridor" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Problem */}
            <div className="space-y-1.5">
              <Label className="text-xs">Problem</Label>
              <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} placeholder="What gap or challenge does this project address?" className="text-sm" />
            </div>

            {/* Intervention */}
            <div className="space-y-1.5">
              <Label className="text-xs">Intervention</Label>
              <Textarea value={intervention} onChange={(e) => setIntervention(e.target.value)} rows={3} placeholder="What will be built or delivered?" className="text-sm" />
            </div>

            {/* Financials */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deal-ask" className="text-xs">Funding ask (million US dollars)</Label>
                <Input id="deal-ask" type="number" min="0" step="any" value={askM} onChange={(e) => setAskM(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-cofinance" className="text-xs">Co-finance (million US dollars)</Label>
                <Input id="deal-cofinance" type="number" min="0" step="any" value={coFinanceM} onChange={(e) => setCoFinanceM(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-emissions" className="text-xs">Expected annual reduction (million tonnes CO₂e)</Label>
                <Input id="deal-emissions" type="number" min="0" step="any" value={annualMt} onChange={(e) => setAnnualMt(e.target.value)} className="text-sm" />
              </div>
            </div>

            {/* Instrument + NDC target */}
            <p className="text-sm text-muted-foreground">CO₂e expresses different greenhouse gases as an equivalent amount of carbon dioxide. These are your planning estimates, not verified results.</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Instrument</Label>
              <Input value={instrument} onChange={(e) => setInstrument(e.target.value)} placeholder="e.g. GCF grant + concessional debt" className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">NDC target</Label>
              <Textarea value={ndcTarget} onChange={(e) => setNdcTarget(e.target.value)} rows={2} placeholder="Which NDC target does this project support?" className="text-sm" />
            </div>

            {/* Save */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="text-xs gap-1.5">
                {saving && <Loader2 className="h-3 w-3 " />}
                {isEdit ? "Save changes" : "Add deal"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
