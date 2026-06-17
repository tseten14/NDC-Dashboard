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

/** Perplexity-style domain slug from a source URL (e.g. unfccc.int → unfccc). */
function citationDomainSlug(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^api\./, "");
    const parts = host.split(".");
    if (host.includes("climatetrace")) return "climatetrace";
    if (host.includes("climatepolicyradar")) return "climatepolicyradar";
    if (host.includes("unfccc")) return "unfccc";
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "source";
  } catch {
    return "source";
  }
}

function uniqueCitationsByDomain(citations: AiSourceLink[]): AiSourceLink[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const slug = c.domain ?? citationDomainSlug(c.url);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

// Inline per-line citation chips were removed by request — all sources are
// shown once in the aggregated footer (SourcesFooter) below.

function collectResponseSources(response: AiAnalysisResponse): AiSourceLink[] {
  const byId = new Map<string, AiSourceLink>();
  for (const s of response.sources ?? []) byId.set(s.id, s);
  for (const section of response.sections) {
    for (const line of section.lines) {
      for (const c of lineCitations(line)) byId.set(c.id, c);
    }
    for (const c of section.citations ?? []) byId.set(c.id, c);
  }
  return Array.from(byId.values());
}

function SourcesFooter({ sources }: { sources: AiSourceLink[] }) {
  const unique = uniqueCitationsByDomain(sources);
  if (unique.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
      <span className="text-[10px] text-muted-foreground shrink-0">
        {unique.length} source{unique.length === 1 ? "" : "s"}
      </span>
      <div className="flex flex-wrap gap-1">
        {unique.map((c) => {
          const slug = c.domain ?? citationDomainSlug(c.url);
          const href = c.viewer_url && c.domain === "climatetrace" ? c.viewer_url : c.url;
          return (
            <a
              key={c.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${c.claim ?? c.label}${c.url !== href ? ` · API: ${c.url}` : ""}`}
              className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {slug}
              <ExternalLink className="h-2 w-2 opacity-60" aria-hidden />
            </a>
          );
        })}
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
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const allSources = useMemo(() => collectResponseSources(response), [response]);

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
        <h4 className="text-xs font-bold text-foreground">{response.title}</h4>

        {response.sections.map((section, si) => (
          <div key={si} className="space-y-2">
            {section.heading && (
              <button
                type="button"
                onClick={() => toggleSection(si)}
                className="flex items-center gap-1 text-[11px] font-semibold text-foreground hover:text-primary transition-colors w-full text-left"
              >
                {openSections.has(si) ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
                {section.heading}
              </button>
            )}
            {(!section.heading || openSections.has(si)) && (
              <div className="space-y-2.5">
                {section.lines.map((line, li) => (
                  <p key={li} className="text-xs text-foreground leading-relaxed">
                    {lineText(line)}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

        <SourcesFooter sources={allSources} />

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
          Per-paragraph citations to Climate TRACE, UNFCCC NDC, and other public sources — not forecasts.
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
