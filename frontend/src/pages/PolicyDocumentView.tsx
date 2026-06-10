import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PolicyDocument } from "@/lib/policy-documents";
import {
  QUICK_ACTIONS,
  type AiAnalysisResponse, type QuickActionType,
} from "@/data/policy-ai-mock";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, FileText, List, Target, Zap, ExternalLink,
  Loader2, Send, ChevronDown, ChevronUp, AlertCircle,
  BookOpen, Scale, Info,
} from "lucide-react";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, List, Target, Zap,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "long" }); }
  catch { return iso; }
}

// ── Mock PDF viewer ───────────────────────────────────────────────────────────

function DocumentPanel({ doc }: { doc: PolicyDocument }) {
  const pages = [1, 2, 3]; // Mock page indicators

  return (
    <div className="flex flex-col h-full">
      {/* Document header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-snug">{doc.title}</h2>
            {doc.familyName && doc.familyName !== doc.title && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{doc.familyName}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {doc.documentType && <Badge variant="secondary" className="text-[9px] h-4 font-normal">{doc.documentType}</Badge>}
              <span className="text-[9px] text-muted-foreground self-center">{formatDate(doc.familyDate)}</span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {doc.documentUrl && (
              <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />CPR
                </a>
              </Button>
            )}
            {doc.contentUrl && (
              <Button size="sm" variant="default" className="h-7 text-[10px]" asChild>
                <a href={doc.contentUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3 w-3 mr-1" />PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mock page viewer */}
      <ScrollArea className="flex-1 bg-muted/30">
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Page 1 — cover */}
          <MockPage page={1}>
            <div className="flex flex-col items-center justify-center min-h-[220px] text-center space-y-3 p-6">
              <Scale className="h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-base font-bold text-foreground leading-snug max-w-sm">{doc.title}</h3>
              <div className="flex flex-wrap gap-1 justify-center">
                <Badge variant="outline" className="text-[9px]">{doc.category}</Badge>
                {doc.source && <Badge variant="secondary" className="text-[9px]">{doc.source}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(doc.familyDate)}</p>
              <p className="text-[10px] text-muted-foreground/60">
                Climate Policy Radar · Republic of Uganda
              </p>
            </div>
          </MockPage>

          {/* Page 2 — summary */}
          {doc.familySummary && (
            <MockPage page={2}>
              <div className="p-6 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Summary</p>
                <p className="text-xs text-foreground leading-relaxed">{doc.familySummary}</p>
              </div>
            </MockPage>
          )}

          {/* Page 3 — context info */}
          <MockPage page={3}>
            <div className="p-6 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Details</p>
              <div className="space-y-2">
                <MetaRow label="Source" value={doc.source ?? "—"} />
                <MetaRow label="Type" value={doc.documentType ?? "—"} />
                <MetaRow label="Category" value={doc.category} />
                <MetaRow label="Date" value={formatDate(doc.familyDate)} />
                <MetaRow label="Geographies" value={doc.geographies?.join(", ") ?? "UGA"} />
                <MetaRow label="Language" value={doc.languages ?? "English"} />
              </div>
            </div>
          </MockPage>

          <div className="flex items-center gap-2 py-2 px-1">
            <Info className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
              This is a metadata preview. Use the PDF or CPR buttons above to view the full document text.
              The AI panel analyses available metadata and document context.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function MockPage({ page, children }: { page: number; children: React.ReactNode }) {
  return (
    <div className="relative bg-card border border-border rounded shadow-sm overflow-hidden">
      <div className="absolute top-2 right-2.5 text-[9px] text-muted-foreground/40 font-mono tabular-nums">
        {page}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-[10px] text-foreground font-medium">{value}</span>
    </div>
  );
}

// ── AI response renderer ──────────────────────────────────────────────────────

function AnalysisCard({ response, onFollowUp, doc }: { response: AiAnalysisResponse; onFollowUp: (q: string) => void; doc?: PolicyDocument }) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  const toggleSection = (i: number) => {
    setOpenSections((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4 space-y-3">
        {/* Title + confidence */}
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-foreground">{response.title}</h4>
          <Badge
            variant="outline"
            className={cn("text-[9px] h-4 shrink-0",
              response.confidence === "high" ? "text-on-track border-on-track/30 bg-on-track/5" :
              response.confidence === "medium" ? "text-amber-600 border-amber-500/30 bg-amber-500/5" :
              "text-muted-foreground",
            )}
          >
            {response.confidence} confidence
          </Badge>
        </div>

        {/* Sections */}
        {response.sections.map((section, si) => (
          <div key={si} className="space-y-1.5">
            {section.heading && (
              <button
                type="button"
                onClick={() => toggleSection(si)}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                {openSections.has(si) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {section.heading}
              </button>
            )}
            {(!section.heading || openSections.has(si)) && (
              <ul className="space-y-1.5">
                {section.lines.map((line, li) => (
                  <li key={li} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    <RichLine line={line} documentUrl={doc?.documentUrl} />
                  </li>
                ))}
              </ul>
            )}
            {section.page_refs.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-3">
                {section.page_refs.filter((ref) => /p\.?\s*\d+/i.test(ref) && !/^§/.test(ref)).map((ref) => {
                  const pageNum = ref.match(/p\.?\s*(\d+)/i)?.[1];
                  const href = pageNum && doc?.documentUrl ? `${doc.documentUrl}#page=${pageNum}` : null;
                  const label = pageNum ? `page ${pageNum} ↗` : ref;
                  return href ? (
                    <a
                      key={ref}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded hover:bg-primary/15 hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      {label}
                    </a>
                  ) : (
                    <span key={ref} className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Verified source */}
        {doc && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold shrink-0">Source</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {doc.documentUrl ? (
                <a
                  href={doc.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline truncate font-medium"
                >
                  {doc.title ?? doc.id}
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground truncate">{doc.title ?? doc.id}</span>
              )}
              {doc.contentUrl && (
                <a
                  href={doc.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-muted-foreground hover:text-foreground shrink-0 underline"
                >
                  CPR ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 border-t border-border pt-1">
          <AlertCircle className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">{response.disclaimer}</p>
        </div>

        {/* Suggested follow-ups */}
        {response.suggested_follow_ups.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Follow-up questions</p>
            <div className="flex flex-wrap gap-1.5">
              {response.suggested_follow_ups.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onFollowUp(q)}
                  className="text-[10px] px-2 py-1 rounded border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RichLine({ line, documentUrl }: { line: string; documentUrl?: string }) {
  const parts = line.split(/(\[(?:p\.?\s*\d+|§[\w.]+)\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (/^\[(?:p\.?\s*\d+|§[\w.]+)\]$/.test(part)) {
          const pageNum = part.match(/p\.?\s*(\d+)/i)?.[1];
          // Section refs (§) have no linkable target — drop them silently.
          if (!pageNum) return null;
          const href = documentUrl ? `${documentUrl}#page=${pageNum}` : null;
          if (href) {
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline text-[9px] text-primary bg-primary/10 px-1 py-0.5 rounded ml-0.5 hover:bg-primary/20 underline underline-offset-2"
              >
                {`page ${pageNum} ↗`}
              </a>
            );
          }
          return (
            <span key={i} className="inline text-[9px] text-primary/80 bg-primary/8 px-1 py-0.5 rounded ml-0.5">
              {`page ${pageNum}`}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── AI panel ──────────────────────────────────────────────────────────────────

type PanelEntry =
  | { kind: "action"; type: QuickActionType; response: AiAnalysisResponse }
  | { kind: "chat"; question: string; response: AiAnalysisResponse }
  | { kind: "loading"; label: string };

function AiPanel({ doc }: { doc: PolicyDocument }) {
  const [entries, setEntries] = useState<PanelEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const callAnalyzeApi = useCallback(async (action?: QuickActionType, question?: string): Promise<AiAnalysisResponse> => {
    const res = await fetch("/api/v1/policy/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentUrl: doc.contentUrl,
        documentUrl: doc.documentUrl,
        title: doc.title,
        action,
        question,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Analysis failed (${res.status})`);
    }
    return res.json();
  }, [doc]);

  const runAction = useCallback((type: QuickActionType, label: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setEntries((prev) => [...prev, { kind: "loading", label }]);
    callAnalyzeApi(type).then((response) => {
      setEntries((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].kind === "loading") { next[i] = { kind: "action", type, response }; break; }
        }
        return next;
      });
    }).catch((err) => {
      setEntries((prev) => prev.filter((e) => e.kind !== "loading"));
      setEntries((prev) => [...prev, { kind: "action", type, response: {
        type, title: "Analysis unavailable",
        sections: [{ lines: [err.message || "Could not reach the AI service. Check ANTHROPIC_API_KEY is set."], page_refs: [] }],
        confidence: "low", disclaimer: "", suggested_follow_ups: [],
      }}]);
    }).finally(() => setIsLoading(false));
  }, [doc, isLoading, callAnalyzeApi]);

  const runChat = useCallback((question: string) => {
    const q = question.trim();
    if (!q || isLoading) return;
    setChatInput("");
    setIsLoading(true);
    setEntries((prev) => [...prev, { kind: "loading", label: `"${q}"` }]);
    callAnalyzeApi(undefined, q).then((response) => {
      setEntries((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].kind === "loading") { next[i] = { kind: "chat", question: q, response }; break; }
        }
        return next;
      });
    }).catch((err) => {
      setEntries((prev) => prev.filter((e) => e.kind !== "loading"));
      setEntries((prev) => [...prev, { kind: "chat", question: q, response: {
        type: "chat", title: "Error",
        sections: [{ lines: [err.message || "Could not reach the AI service."], page_refs: [] }],
        confidence: "low", disclaimer: "", suggested_follow_ups: [],
      }}]);
    }).finally(() => setIsLoading(false));
  }, [doc, isLoading, callAnalyzeApi]);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">AI Policy Assistant</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Reads the full PDF and answers using Claude AI. Citations link to the source page.
        </p>
      </div>

      {/* Quick-action buttons */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border bg-muted/20">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Quick analysis</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = ICON_MAP[action.icon] ?? FileText;
            return (
              <button
                key={action.type}
                type="button"
                onClick={() => runAction(action.type, action.label)}
                disabled={isLoading}
                className={cn(
                  "flex items-start gap-2 p-2.5 rounded-lg border border-border bg-card text-left transition-all",
                  "hover:border-primary/40 hover:bg-primary/5",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{action.label}</p>
                  <p className="text-[9px] text-muted-foreground">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Response scroll area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-muted-foreground/25" />
              <p className="text-xs text-muted-foreground">Select a quick action or ask a question to analyse this document</p>
            </div>
          )}

          {entries.map((entry, i) => {
            if (entry.kind === "loading") {
              return (
                <div key={i} className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Analysing: <span className="italic">{entry.label}</span>…</span>
                </div>
              );
            }
            if (entry.kind === "chat") {
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-primary text-primary-foreground text-xs">
                      {entry.question}
                    </div>
                  </div>
                  <AnalysisCard response={entry.response} onFollowUp={runChat} doc={doc} />
                </div>
              );
            }
            return (
              <AnalysisCard key={i} response={entry.response} onFollowUp={runChat} doc={doc} />
            );
          })}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* "Ask the PDF" input */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Ask the document</p>
        <div className="flex gap-2 items-end">
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runChat(chatInput); }
            }}
            placeholder="e.g. What does this say about renewable energy subsidies?"
            className="resize-none text-xs min-h-[36px] max-h-[90px] leading-relaxed"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={() => runChat(chatInput)}
            disabled={!chatInput.trim() || isLoading}
            className="h-9 px-3 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-1">
          Enter to send · responses include section references where available
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PolicyDocumentView() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const doc = state?.doc as PolicyDocument | undefined;

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No document selected</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/documents")}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to document library
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-3 w-3" />
          Documents
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <p className="text-xs text-muted-foreground truncate">{doc.title}</p>
      </div>

      {/* Split pane */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={55} minSize={30}>
          <DocumentPanel doc={doc} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={30}>
          <AiPanel doc={doc} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
