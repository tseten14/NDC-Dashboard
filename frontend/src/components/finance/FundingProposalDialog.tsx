import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, FileText } from "lucide-react";
import { toast } from "sonner";

export interface ProposalContext {
  /** Project / intervention name (objective from Policy Impact). */
  projectName: string;
  sectorLabel: string;
  interventionLabel?: string;
  /** Best-fit funder window name. */
  targetFunder?: string;
  estimatedNeedUSD?: number;
}

type FieldType = "text" | "number" | "textarea";

interface Field {
  key: string;
  label: string;
  help: string;
  type: FieldType;
  placeholder?: string;
  prefill?: (ctx: ProposalContext) => string;
}

interface Section {
  id: string;
  title: string;
  guidance: string;
  fields: Field[];
}

const SECTIONS: Section[] = [
  {
    id: "summary",
    title: "1 · Project summary",
    guidance: "A funder reads this first. Be concrete about what will be built or delivered and where.",
    fields: [
      { key: "title", label: "Project title", type: "text", help: "Short, descriptive name.", prefill: (c) => c.projectName },
      { key: "proponent", label: "Lead institution", type: "text", help: "Who will own and deliver this? (ministry, agency, partner)", placeholder: "e.g. Ministry of Water & Environment" },
      { key: "location", label: "Location / coverage", type: "text", help: "Districts or national.", placeholder: "e.g. Greater Kampala; or national" },
      { key: "description", label: "What the project does", type: "textarea", help: "1–2 paragraphs: the problem, the intervention, and the expected change.", prefill: (c) => c.interventionLabel ? `${c.interventionLabel} in the ${c.sectorLabel} sector.` : "" },
    ],
  },
  {
    id: "ndc",
    title: "2 · Alignment with Uganda's NDC",
    guidance: "Funders require a clear line from the project to national climate goals — without double-counting.",
    fields: [
      { key: "ndcTarget", label: "Which NDC target does it support?", type: "text", help: "Name the 2030 target or sector pledge.", prefill: (c) => `${c.sectorLabel} sector mitigation target (NDC 2022)` },
      { key: "theoryOfChange", label: "How it reduces emissions", type: "textarea", help: "The pathway from activity to avoided emissions.", placeholder: "Activity → output → outcome → avoided emissions" },
    ],
  },
  {
    id: "funding",
    title: "3 · Funding ask & co-finance",
    guidance: "State the total, what you ask the funder for, and the matching finance you bring.",
    fields: [
      { key: "totalCost", label: "Total project cost (USD)", type: "number", help: "All-in capital + running costs.", prefill: (c) => c.estimatedNeedUSD ? String(c.estimatedNeedUSD) : "" },
      { key: "fundingAsk", label: "Amount requested from funder (USD)", type: "number", help: "The grant / concessional portion you are asking for.", prefill: (c) => c.estimatedNeedUSD ? String(Math.round(c.estimatedNeedUSD * 0.7)) : "" },
      { key: "coFinance", label: "Co-finance committed (USD)", type: "number", help: "National budget, private, or other partners.", placeholder: "e.g. 0" },
      { key: "instrument", label: "Instrument", type: "text", help: "Grant, concessional loan, or blended.", placeholder: "e.g. Grant + concessional loan" },
      { key: "targetWindow", label: "Target fund window", type: "text", help: "The funder/window you are designing for.", prefill: (c) => c.targetFunder ?? "" },
    ],
  },
  {
    id: "financials",
    title: "4 · Key financial data points",
    guidance: "The numbers funders screen on. Estimates are fine at concept stage — show your basis.",
    fields: [
      { key: "abatement", label: "Expected emissions cut (MtCO₂e/yr)", type: "text", help: "Annual avoided emissions, with basis.", placeholder: "e.g. 0.8 Mt/yr" },
      { key: "costPerT", label: "Cost per tonne abated (USD/tCO₂e)", type: "text", help: "Total cost ÷ lifetime emissions cut.", placeholder: "e.g. 35" },
      { key: "beneficiaries", label: "People benefiting", type: "text", help: "Direct + indirect beneficiaries.", placeholder: "e.g. 250,000" },
      { key: "lifetime", label: "Project lifetime (years)", type: "number", help: "Operating life used for the economics.", placeholder: "e.g. 20" },
    ],
  },
  {
    id: "delivery",
    title: "5 · Delivery, MRV & safeguards",
    guidance: "How results are tracked and risks managed — the part weak proposals skip.",
    fields: [
      { key: "mrv", label: "Monitoring & reporting plan", type: "textarea", help: "Baseline, indicators, who reports and how often.", placeholder: "Baseline source, key indicators, reporting cadence" },
      { key: "risks", label: "Main risks & mitigation", type: "textarea", help: "Technical, financial, social, environmental.", placeholder: "List the top 3 risks and how you manage them" },
      { key: "timeline", label: "Timeline & milestones", type: "text", help: "Start, key milestones, completion.", placeholder: "e.g. 2026 start, 2030 completion" },
    ],
  },
];

function formatUSDshort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n}`;
}

export function FundingProposalDialog({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ProposalContext;
}) {
  const initial = useMemo(() => {
    const v: Record<string, string> = {};
    for (const s of SECTIONS) for (const f of s.fields) v[f.key] = f.prefill ? f.prefill(context) : "";
    return v;
  }, [context]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [copied, setCopied] = useState(false);

  // Reset prefills when the underlying context changes (e.g. new intervention).
  const [ctxKey, setCtxKey] = useState(context.projectName);
  if (ctxKey !== context.projectName) {
    setCtxKey(context.projectName);
    setValues(initial);
  }

  const filledCount = SECTIONS.flatMap((s) => s.fields).filter((f) => values[f.key]?.trim()).length;
  const totalFields = SECTIONS.flatMap((s) => s.fields).length;

  function buildMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# Funding proposal — ${values.title || context.projectName}`);
    lines.push("");
    lines.push(`*Sector: ${context.sectorLabel}${context.targetFunder ? ` · Target window: ${context.targetFunder}` : ""}*`);
    lines.push("");
    for (const s of SECTIONS) {
      lines.push(`## ${s.title}`);
      for (const f of s.fields) {
        const val = values[f.key]?.trim();
        lines.push("");
        lines.push(`**${f.label}**`);
        lines.push("");
        lines.push(val ? val : "_(to be completed)_");
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("_Drafted in the NDC Data Explorer. Planning template — verify all figures and follow the funder's official template before submission._");
    return lines.join("\n");
  }

  function handleDownload() {
    const md = buildMarkdown();
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `funding-proposal-${(values.title || context.projectName || "draft").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Proposal draft downloaded");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Proposal copied to clipboard");
    } catch {
      toast.error("Couldn't copy — try Download instead");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[88vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Prepare funding proposal
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className="text-[10px] h-5">{context.sectorLabel}</Badge>
            {context.targetFunder && <Badge variant="outline" className="text-[10px] h-5">Target: {context.targetFunder}</Badge>}
            {context.estimatedNeedUSD ? (
              <Badge variant="outline" className="text-[10px] h-5">Est. need {formatUSDshort(context.estimatedNeedUSD)}</Badge>
            ) : null}
            <span className="text-[10px] text-muted-foreground ml-auto">{filledCount}/{totalFields} fields</span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            {SECTIONS.map((s) => (
              <section key={s.id} className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-foreground">{s.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-snug">{s.guidance}</p>
                </div>
                {s.fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={`pf-${f.key}`} className="text-[11px] font-medium">{f.label}</Label>
                    <p className="text-[10px] text-muted-foreground">{f.help}</p>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={`pf-${f.key}`}
                        value={values[f.key] ?? ""}
                        placeholder={f.placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        className="text-xs min-h-[70px]"
                      />
                    ) : (
                      <Input
                        id={`pf-${f.key}`}
                        type={f.type === "number" ? "number" : "text"}
                        value={values[f.key] ?? ""}
                        placeholder={f.placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        className="text-xs h-8"
                      />
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t border-border shrink-0 flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground flex-1">
            Planning template — verify figures and use the funder's official format before submission.
          </p>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Download draft
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
