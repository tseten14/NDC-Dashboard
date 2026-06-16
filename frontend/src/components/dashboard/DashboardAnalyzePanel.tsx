import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { NDCTarget, SectorId } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import {
  buildDashboardAnalyzeContext,
  DASHBOARD_QUICK_ACTIONS,
  type DashboardQuickAction,
} from "@/lib/dashboard-ai-context";
import type { AnalysisLine, AiAnalysisResponse, AiSourceLink } from "@/data/policy-ai-mock";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

function lineText(line: string | AnalysisLine): string {
  return typeof line === "string" ? line : line.text;
}

function lineCitations(line: string | AnalysisLine): AiSourceLink[] {
  return typeof line === "string" ? [] : (line.citations ?? []);
}

/** Short Perplexity-style label for an inline citation pill. */
function citationPillLabel(source: AiSourceLink): string {
  if (source.id === "uganda_ndc_2022" || source.url.includes("unfccc")) return "unfccc";
  if (source.id.startsWith("climate_trace_") || source.url.includes("climatetrace")) return "climatetrace";
  if (source.id.startsWith("ndc_target_")) return "ndc pledge";
  if (source.id.startsWith("dashboard_progress_")) return "dashboard";
  if (source.id.startsWith("dashboard_timeseries_")) return "trace api";
  if (source.id === "policy_documents") return "policies";
  if (source.id === "climate_trace_api") return "trace api";
  try {
    const host = new URL(source.url, window.location.origin).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "source";
  } catch {
    return "source";
  }
}

function InlineCitationPills({ citations }: { citations: AiSourceLink[] }) {
  if (citations.length === 0) return null;

  const primary = citations[0];
  const extra = citations.length - 1;
  const external = primary.url.startsWith("http");

  return (
    <a
      href={primary.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      title={citations.map((c) => c.label).join(" · ")}
      className="inline-flex items-center rounded-md border border-border/70 bg-muted/80 px-1.5 py-px ml-1 text-[9px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap align-middle"
    >
      {citationPillLabel(primary)}
      {extra > 0 && ` +${extra}`}
    </a>
  );
}

function sourceNumber(sources: AiSourceLink[], id: string): number {
  const idx = sources.findIndex((s) => s.id === id);
  return idx >= 0 ? idx + 1 : 0;
}

function SourceLink({
  source,
  number,
  compact = false,
}: {
  source: AiSourceLink;
  number: number;
  compact?: boolean;
}) {
  const external = source.url.startsWith("http");
  return (
    <a
      href={source.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center gap-1 text-primary hover:underline",
        compact ? "text-[9px] font-medium" : "text-[10px]",
      )}
    >
      {number > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-primary/10 px-1 font-mono text-[9px] font-semibold text-primary shrink-0">
          {number}
        </span>
      )}
      <span className={compact ? "truncate max-w-[140px]" : ""}>{source.label}</span>
      {external && <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />}
    </a>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  BarChart3,
  Satellite,
  Zap,
};

type PanelEntry =
  | { kind: "action"; type: DashboardQuickAction; response: AiAnalysisResponse }
  | { kind: "chat"; question: string; response: AiAnalysisResponse }
  | { kind: "loading"; label: string };

function AnalysisCard({
  response,
  onFollowUp,
}: {
  response: AiAnalysisResponse;
  onFollowUp: (q: string) => void;
}) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  const toggleSection = (i: number) => {
    setOpenSections((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const sources = response.sources ?? [];

  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-foreground">{response.title}</h4>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] h-4 shrink-0",
              response.confidence === "high"
                ? "text-on-track border-on-track/30 bg-on-track/5"
                : response.confidence === "medium"
                  ? "text-muted-foreground border-border bg-muted/50"
                  : "text-muted-foreground",
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
                {openSections.has(si) ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {section.heading}
              </button>
            )}
            {(!section.heading || openSections.has(si)) && (
              <ul className="space-y-1.5">
                {section.lines.map((line, li) => {
                  const citations = lineCitations(line);
                  return (
                    <li
                      key={li}
                      className="flex items-start gap-2 text-xs text-foreground leading-relaxed"
                    >
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span>
                        {lineText(line)}
                        <InlineCitationPills citations={citations} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}

        {sources.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-2">
            <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
              Sources
            </p>
            <ol className="space-y-1.5">
              {sources.map((source, i) => (
                <li key={source.id} className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[9px] font-semibold text-muted-foreground w-4 pt-0.5">
                    {i + 1}
                  </span>
                  <SourceLink source={source} number={0} />
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex items-start gap-1.5 border-t border-border pt-1">
          <AlertCircle className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">{response.disclaimer}</p>
        </div>

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
    async (action?: DashboardQuickAction, question?: string): Promise<AiAnalysisResponse> => {
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
            err.error || "NDC AI is unavailable — set OPENAI_API_KEY on the API server.",
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
              response: {
                type,
                title: "Analysis unavailable",
                sections: [
                  {
                    lines: [
                      err.message ||
                        "Could not reach the AI service. Check OPENAI_API_KEY is set on the API server.",
                    ],
                    page_refs: [],
                  },
                ],
                confidence: "low",
                disclaimer: "",
                suggested_follow_ups: [],
              },
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
            {
              kind: "chat",
              question: q,
              response: {
                type: "chat",
                title: "Error",
                sections: [{ lines: [err.message || "Could not reach the AI service."], page_refs: [] }],
                confidence: "low",
                disclaimer: "",
                suggested_follow_ups: [],
              },
            },
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
          Answers from Climate TRACE observations, NDC targets, and progress on this dashboard — not
          forecasts.
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
                    Analysing: <span className="italic">{entry.label}</span>…
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
          Uses live dashboard context · Tab for example · Enter to send
        </p>
      </div>
    </div>
  );
}
