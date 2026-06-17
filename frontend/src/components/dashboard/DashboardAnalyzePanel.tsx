import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { NDCTarget, SectorId } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import {
  buildDashboardAnalyzeContext,
  DASHBOARD_QUICK_ACTIONS,
  type DashboardQuickAction,
} from "@/lib/dashboard-ai-context";
import {
  citationDomainSlug,
  type AnswerSegment,
  type GroundedAnalysisResponse,
  type GroundedCitation,
} from "@/lib/grounded-analysis";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Send,
  Sparkles,
  Target,
  BarChart3,
  Satellite,
  Zap,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

/** Dedupe citations by external URL, keeping the highest-confidence instance. */
function uniqueByUrl(citations: GroundedCitation[]): GroundedCitation[] {
  const byUrl = new Map<string, GroundedCitation>();
  for (const c of citations) {
    const existing = byUrl.get(c.source_url);
    if (!existing || c.confidence > existing.confidence) byUrl.set(c.source_url, c);
  }
  return Array.from(byUrl.values());
}

// Per-claim inline citation chips were removed by request — all sources are
// shown once in the aggregated footer below. The per-card "could not be
// grounded" banner still surfaces unverified claims at the card level.
function SegmentParagraph({ segment }: { segment: AnswerSegment }) {
  return <p className="text-xs text-foreground leading-relaxed">{segment.text}</p>;
}

function SourcesFooter({ response }: { response: GroundedAnalysisResponse }) {
  const all = useMemo(
    () => uniqueByUrl(response.answer_segments.flatMap((s) => s.citations)),
    [response],
  );
  if (all.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
      <span className="text-[10px] text-muted-foreground shrink-0">
        {all.length} source{all.length === 1 ? "" : "s"}
      </span>
      <div className="flex flex-wrap gap-1">
        {all.map((c) => (
          <a
            key={c.source_url}
            href={c.source_url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${c.source_title}${c.supporting_snippet ? ` · “${c.supporting_snippet}”` : ""}`}
            className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {citationDomainSlug(c.source_url)}
            <ExternalLink className="h-2 w-2 opacity-60" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  BarChart3,
  Satellite,
  Zap,
};

type PanelEntry =
  | { kind: "action"; type: DashboardQuickAction; response: GroundedAnalysisResponse }
  | { kind: "chat"; question: string; response: GroundedAnalysisResponse }
  | { kind: "loading"; label: string };

function AnalysisCard({
  response,
  onFollowUp,
}: {
  response: GroundedAnalysisResponse;
  onFollowUp: (q: string) => void;
}) {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-xs font-bold text-foreground">{response.title}</h4>

        <div className="space-y-2.5">
          {response.answer_segments.map((segment, i) => (
            <SegmentParagraph key={i} segment={segment} />
          ))}
        </div>

        <SourcesFooter response={response} />

        {response.unverified_claims.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
            <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-500">
              <ShieldAlert className="h-3 w-3" />
              {response.unverified_claims.length} claim
              {response.unverified_claims.length === 1 ? "" : "s"} could not be grounded
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground leading-relaxed">
              No external source was found containing these exact figures — they are shown
              without a citation rather than linked to an unverified page.
            </p>
          </div>
        )}

        {response.disclaimer && (
          <div className="flex items-start gap-1.5 border-t border-border pt-1">
            <AlertCircle className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">{response.disclaimer}</p>
          </div>
        )}

        {response.suggested_follow_ups.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              Follow-up questions
            </p>
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

const CHAT_EXAMPLE = "Is AFOLU on track vs the 2030 pledge?";

function errorResponse(type: string, message: string): GroundedAnalysisResponse {
  return {
    type,
    title: "Analysis unavailable",
    answer_segments: [{ text: message, citations: [] }],
    unverified_claims: [],
    confidence: "low",
    disclaimer: "",
    suggested_follow_ups: [],
  };
}

interface DashboardAnalyzePanelProps {
  selectedSector: SectorId;
  selectedTarget: NDCTarget | null;
}

export function DashboardAnalyzePanel({ selectedSector, selectedTarget }: DashboardAnalyzePanelProps) {
  const emissions = useEmissionsData();
  const [entries, setEntries] = useState<PanelEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(
    () => buildDashboardAnalyzeContext(emissions, selectedSector, selectedTarget),
    [emissions, selectedSector, selectedTarget],
  );

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const callAnalyzeApi = useCallback(
    async (action?: DashboardQuickAction, question?: string): Promise<GroundedAnalysisResponse> => {
      const res = await fetch("/api/v1/dashboard/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, question, context }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 404) {
          throw new Error(
            "NDC AI endpoint not found. Restart the API server (npm run start:api) or redeploy the latest backend.",
          );
        }
        if (res.status === 503) {
          throw new Error(
            err.error || "NDC AI is unavailable — set ANTHROPIC_API_KEY on the API server.",
          );
        }
        throw new Error(err.error || `Analysis failed (${res.status})`);
      }
      return res.json();
    },
    [context],
  );

  const runAction = useCallback(
    (type: DashboardQuickAction, label: string) => {
      if (isLoading) return;
      setIsLoading(true);
      setEntries((prev) => [...prev, { kind: "loading", label }]);
      callAnalyzeApi(type)
        .then((response) => {
          setEntries((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].kind === "loading") {
                next[i] = { kind: "action", type, response };
                break;
              }
            }
            return next;
          });
        })
        .catch((err) => {
          setEntries((prev) => prev.filter((e) => e.kind !== "loading"));
          setEntries((prev) => [
            ...prev,
            {
              kind: "action",
              type,
              response: errorResponse(
                type,
                err.message || "Could not reach the AI service. Check ANTHROPIC_API_KEY is set on the API server.",
              ),
            },
          ]);
        })
        .finally(() => setIsLoading(false));
    },
    [isLoading, callAnalyzeApi],
  );

  const runChat = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q || isLoading) return;
      setChatInput("");
      setIsLoading(true);
      setEntries((prev) => [...prev, { kind: "loading", label: `"${q}"` }]);
      callAnalyzeApi(undefined, q)
        .then((response) => {
          setEntries((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].kind === "loading") {
                next[i] = { kind: "chat", question: q, response };
                break;
              }
            }
            return next;
          });
        })
        .catch((err) => {
          setEntries((prev) => prev.filter((e) => e.kind !== "loading"));
          setEntries((prev) => [
            ...prev,
            { kind: "chat", question: q, response: errorResponse("chat", err.message || "Could not reach the AI service.") },
          ]);
        })
        .finally(() => setIsLoading(false));
    },
    [isLoading, callAnalyzeApi],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">NDC AI</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Per-claim citations to verified external sources (Climate TRACE, UNFCCC NDC Registry,
          CPR, and others) — not forecasts.
        </p>
        {selectedTarget && (
          <p className="text-[10px] text-foreground/80 mt-1 line-clamp-2">
            Focus: {context.selected_target?.summary}
          </p>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border bg-muted/20">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Quick analysis
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DASHBOARD_QUICK_ACTIONS.map((action) => {
            const Icon = ICON_MAP[action.icon] ?? Target;
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

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-muted-foreground/25" />
              <p className="text-xs text-muted-foreground">
                Select a quick action or ask about NDC progress, Climate TRACE data, or sector gaps
              </p>
            </div>
          )}

          {entries.map((entry, i) => {
            if (entry.kind === "loading") {
              return (
                <div key={i} className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>
                    Researching &amp; verifying: <span className="italic">{entry.label}</span>…
                  </span>
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
                  <AnalysisCard response={entry.response} onFollowUp={runChat} />
                </div>
              );
            }
            return <AnalysisCard key={i} response={entry.response} onFollowUp={runChat} />;
          })}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Ask NDC AI
        </p>
        <div className="flex gap-2 items-end">
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && !e.shiftKey && !chatInput.trim()) {
                e.preventDefault();
                setChatInput(CHAT_EXAMPLE);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                runChat(chatInput);
              }
            }}
            placeholder={`e.g. ${CHAT_EXAMPLE}`}
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
          Retrieves &amp; verifies real sources · Tab for example · Enter to send
        </p>
      </div>
    </div>
  );
}
