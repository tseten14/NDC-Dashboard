import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { PolicyDocument } from "@/lib/policy-documents";
import {
  QUICK_ACTIONS,
  type AiAnalysisResponse, type QuickActionType,
} from "@/data/policy-ai-mock";
import { ClimatePolicyRadarBadge } from "@/components/ClimatePolicyRadarBadge";
import { CPR_PASSAGE_ATTRIBUTION, resolveCprLink } from "@/lib/policy-lineage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, FileText, List, Target, Zap, ExternalLink,
  Loader2, Send, ChevronDown, ChevronUp, AlertCircle,
  BookOpen, Search, Tags,
} from "lucide-react";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, List, Target, Zap,
};

// ── Passages panel ────────────────────────────────────────────────────────────

function PassagesPanel({ cprDocumentId }: { cprDocumentId: string }) {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [topicId, setTopicId] = useState("");
  const [page, setPage] = useState(0);
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [q, topicId]);

  const topicsQuery = useQuery({
    queryKey: ["documents", "topics", cprDocumentId],
    queryFn: () => documentsApi.listTopics(cprDocumentId),
    staleTime: 1000 * 60 * 60,
  });

  const passagesQuery = useQuery({
    queryKey: ["documents", "passages", cprDocumentId, q, topicId, page],
    queryFn: () =>
      documentsApi.listPassages(cprDocumentId, {
        q: q || undefined,
        topicId: topicId || undefined,
        limit,
        offset: page * limit,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const total = passagesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const topics = topicsQuery.data?.topics ?? [];

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="shrink-0 px-3 py-2 border-b border-border bg-card/50">
        <p className="text-[10px] font-semibold text-foreground">Passages</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">{CPR_PASSAGE_ATTRIBUTION}</p>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search passages…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="h-7 pl-7 text-[10px]"
          />
        </div>
      </div>

      {topics.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/20 max-h-28 overflow-y-auto">
          <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
            <Tags className="h-2.5 w-2.5" /> Topics
          </p>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={topicId === "" ? "default" : "outline"}
              className="h-5 text-[8px] px-1.5"
              onClick={() => setTopicId("")}
            >
              All
            </Button>
            {topics.slice(0, 12).map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={topicId === t.id ? "default" : "outline"}
                className="h-5 text-[8px] px-1.5"
                onClick={() => setTopicId(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {passagesQuery.isLoading && (
            <p className="text-[10px] text-muted-foreground p-2">Loading passages…</p>
          )}
          {passagesQuery.data?.passages.map((p) => (
            <Card key={p.id} className="shadow-none border-border">
              <CardContent className="p-2 space-y-1">
                <p className="text-[10px] text-foreground leading-relaxed line-clamp-4">{p.text}</p>
                {p.topicLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.topicLabels.map((tl) => (
                      <Badge key={`${p.id}-${tl.id}`} variant="outline" className="text-[7px] h-3.5 px-1">
                        {tl.label}
                        {tl.isFullParagraph && " · full ¶"}
                      </Badge>
                    ))}
                  </div>
                )}
                {p.topicLabellers.includes("bert") && (
                  <p className="text-[8px] text-muted-foreground italic">
                    Topic match may be full paragraph (BERT classifier)
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {!passagesQuery.isLoading && passagesQuery.data?.passages.length === 0 && (
            <p className="text-[10px] text-muted-foreground p-2">No passages match.</p>
          )}
        </div>
      </ScrollArea>

      {total > limit && (
        <div className="shrink-0 flex items-center justify-between px-2 py-1.5 border-t border-border">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[9px]"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </Button>
          <span className="text-[9px] text-muted-foreground">
            {page + 1}/{totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[9px]"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ── AI response renderer ──────────────────────────────────────────────────────

function AnalysisCard({ response, onFollowUp, doc }: { response: AiAnalysisResponse; onFollowUp: (q: string) => void; doc?: PolicyDocument }) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const cprLink = doc ? resolveCprLink(doc) : null;

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
                    <RichLine line={typeof line === "string" ? line : line.text} documentUrl={cprLink ?? doc?.documentUrl} />
                  </li>
                ))}
              </ul>
            )}
            {section.page_refs.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-3">
                {section.page_refs.filter((ref) => /p\.?\s*\d+/i.test(ref) && !/^§/.test(ref)).map((ref) => {
                  const pageNum = ref.match(/p\.?\s*(\d+)/i)?.[1];
                  const href = pageNum && cprLink ? `${cprLink}#page=${pageNum}` : null;
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

        {doc && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold shrink-0">Source</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {cprLink ? (
                <a
                  href={cprLink}
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
                  PDF ↗
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start gap-1.5 border-t border-border pt-1">
          <AlertCircle className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">{response.disclaimer}</p>
        </div>

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
        documentUrl: resolveCprLink(doc) ?? doc.documentUrl,
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
  }, [isLoading, callAnalyzeApi]);

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
  }, [isLoading, callAnalyzeApi]);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">AI Policy Assistant</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Reads the full PDF and answers using Claude AI. Citations link to the source page.
        </p>
      </div>

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

function useResolvedDocument(): {
  doc: PolicyDocument | undefined;
  isLoading: boolean;
  error: boolean;
} {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const stateDoc = state?.doc as PolicyDocument | undefined;
  const catalogId = searchParams.get("catalogId");
  const cprDocumentId = searchParams.get("cprDocumentId");

  const catalogQuery = useQuery({
    queryKey: ["documents", "catalog", catalogId],
    queryFn: () => documentsApi.getCatalogDocument(catalogId!),
    enabled: !stateDoc?.title && !!catalogId,
    staleTime: 1000 * 60 * 30,
  });

  const cprQuery = useQuery({
    queryKey: ["documents", "cpr", cprDocumentId],
    queryFn: () => documentsApi.getPassageDocument(cprDocumentId!),
    enabled: !stateDoc?.title && !catalogId && !!cprDocumentId,
    staleTime: 1000 * 60 * 30,
  });

  const doc = useMemo(() => {
    if (stateDoc?.title && (stateDoc.documentUrl || stateDoc.cprUrl || stateDoc.contentUrl)) {
      return stateDoc;
    }
    if (catalogQuery.data?.document) {
      return catalogQuery.data.document;
    }
    if (cprQuery.data) {
      const p = cprQuery.data;
      return {
        id: p.catalogId ?? p.cprDocumentId,
        title: p.title,
        familyName: p.title,
        familySummary: p.familySummary,
        familyDate: null,
        familyUrl: p.cprUrl,
        documentUrl: p.cprUrl,
        contentUrl: null,
        documentType: null,
        category: "Executive",
        source: null,
        geographies: ["UGA"],
        languages: "English",
        hasPassages: true,
        cprDocumentId: p.cprDocumentId,
        passageCount: p.passageCount,
        taggedPassageCount: p.taggedPassageCount,
        cprUrl: p.cprUrl,
        slug: p.slug,
      } satisfies PolicyDocument;
    }
    return stateDoc;
  }, [stateDoc, catalogQuery.data, cprQuery.data]);

  const isLoading =
    (!doc?.title && !!catalogId && catalogQuery.isLoading) ||
    (!doc?.title && !catalogId && !!cprDocumentId && cprQuery.isLoading);

  const error =
    (!doc?.title && !!catalogId && catalogQuery.isError) ||
    (!doc?.title && !catalogId && !!cprDocumentId && cprQuery.isError);

  return { doc, isLoading, error };
}

export default function PolicyDocumentView() {
  const navigate = useNavigate();
  const { doc, isLoading, error } = useResolvedDocument();
  const cprLink = doc ? resolveCprLink(doc) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading document…</span>
      </div>
    );
  }

  if (!doc || error) {
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

  const showPassages = !!doc.cprDocumentId && doc.hasPassages;

  return (
    <div className="flex flex-col h-full">
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
        <p className="text-xs text-muted-foreground truncate flex-1">{doc.title}</p>
        <ClimatePolicyRadarBadge className="hidden sm:inline-flex items-center gap-1 shrink-0 rounded border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/12 transition-colors" />
        <div className="flex gap-1 shrink-0">
          {cprLink && (
            <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
              <a href={cprLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />View on CPR
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

      <div className="flex-1 min-h-0 flex">
        {showPassages && doc.cprDocumentId && (
          <div className="w-[38%] min-w-[240px] max-w-md shrink-0 hidden md:block">
            <PassagesPanel cprDocumentId={doc.cprDocumentId} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <AiPanel doc={doc} />
        </div>
      </div>
    </div>
  );
}
