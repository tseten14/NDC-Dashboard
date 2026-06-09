import { useState, useRef, useEffect, useCallback } from "react";
import {
  queryBrazilData, SUGGESTED_QUESTIONS, DATA_SOURCES,
  type MockResponse, type Citation,
} from "@/data/brazil-mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Send, Search, ExternalLink, ChevronDown, ChevronUp,
  Leaf, Database, Globe, FlaskConical, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageState = "searching" | "streaming" | "done";

interface UserMessage {
  role: "user";
  text: string;
}

interface AssistantMessage {
  role: "assistant";
  state: MessageState;
  response?: MockResponse;
  searching_sources?: string[];
}

type Message = UserMessage | AssistantMessage;

// ── Source type icon map ───────────────────────────────────────────────────────

const SOURCE_TYPE_ICON: Record<string, React.ElementType> = {
  government: Building2,
  ngo: Leaf,
  satellite: Globe,
  academic: FlaskConical,
};

// ── Inline citation parser ────────────────────────────────────────────────────
// Splits text by [N] markers and returns segments with optional citation numbers.

type Segment = { text: string; citationId?: number };

function parseBody(body: string): Segment[] {
  const segments: Segment[] = [];
  // Match both [N] and [N][M] chains. Split on each [N] individually.
  const parts = body.split(/(\[\d+\])/);
  for (const part of parts) {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      segments.push({ text: "", citationId: parseInt(match[1], 10) });
    } else {
      segments.push({ text: part });
    }
  }
  return segments;
}

function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

// ── CitationRef chip ──────────────────────────────────────────────────────────

function CitationRef({
  id,
  citations,
  onClick,
}: {
  id: number;
  citations: Citation[];
  onClick: (id: number) => void;
}) {
  const citation = citations.find((c) => c.id === id);
  if (!citation) return null;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className="inline-flex items-center justify-center align-super h-[14px] min-w-[14px] px-[3px] rounded text-[9px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors mx-0.5 leading-none"
      title={citation.title}
      aria-label={`Citation ${id}: ${citation.title}`}
    >
      {id}
    </button>
  );
}

// ── Rendered body text ────────────────────────────────────────────────────────

function ResponseBody({ body, citations, onCitationClick }: { body: string; citations: Citation[]; onCitationClick: (id: number) => void }) {
  const paragraphs = body.split("\n\n");

  // Re-parse per paragraph for correct line breaks
  return (
    <div className="space-y-3 text-sm text-foreground leading-relaxed">
      {paragraphs.map((para, pi) => {
        const paraSegs = parseBody(para);
        return (
          <p key={pi}>
            {paraSegs.map((seg, si) => {
              if (seg.citationId != null) {
                return <CitationRef key={si} id={seg.citationId} citations={citations} onClick={onCitationClick} />;
              }
              return <span key={si}>{renderBold(seg.text)}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ── Searching animation ───────────────────────────────────────────────────────

const SEARCH_STEPS = [
  "Querying SEEG 11.0 emissions inventory…",
  "Cross-referencing INPE PRODES satellite data…",
  "Verifying against Climate TRACE estimates…",
  "Checking MMA policy database…",
  "Validating UNFCCC NDC registry…",
  "Synthesising verified data…",
];

function SearchingState({ sources }: { sources: string[] }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, SEARCH_STEPS.length - 1)), 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Searching trusted sources…</span>
      </div>

      <div className="space-y-1.5 pl-5">
        {SEARCH_STEPS.slice(0, step + 1).map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 text-xs transition-opacity duration-300",
              i === step ? "opacity-100" : "opacity-40",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", i === step ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 pl-5 pt-1">
        {sources.map((sk) => {
          const src = DATA_SOURCES[sk];
          if (!src) return null;
          return (
            <span key={sk} className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium animate-pulse", src.badge_class)}>
              {src.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Key stats row ─────────────────────────────────────────────────────────────

function KeyStatCard({ label, value, delta, delta_dir, citation, citations, onCitationClick }: {
  label: string;
  value: string;
  delta?: string;
  delta_dir?: "up" | "down" | "neutral";
  citation: number;
  citations: Citation[];
  onCitationClick: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg border border-border bg-muted/30">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex items-end gap-1">
        <span className="text-base font-bold text-foreground">{value}</span>
        <CitationRef id={citation} citations={citations} onClick={onCitationClick} />
      </div>
      {delta && (
        <span className={cn(
          "text-[10px] font-medium",
          delta_dir === "down" ? "text-on-track" : delta_dir === "up" ? "text-off-track" : "text-muted-foreground",
        )}>
          {delta}
        </span>
      )}
    </div>
  );
}

// ── Source provenance pills ───────────────────────────────────────────────────

function SourceProvenance({ sourceKeys }: { sourceKeys: string[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sources verified</span>
      {sourceKeys.map((sk) => {
        const src = DATA_SOURCES[sk];
        if (!src) return null;
        const Icon = SOURCE_TYPE_ICON[src.type] ?? Database;
        return (
          <span key={sk} className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", src.badge_class)}>
            <Icon className="h-2.5 w-2.5" />
            {src.label}
          </span>
        );
      })}
    </div>
  );
}

// ── References section ────────────────────────────────────────────────────────

function ReferencesSection({ citations, highlightId, forceOpen }: { citations: Citation[]; highlightId: number | null; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        References ({citations.length})
      </button>

      {isOpen && (
        <ol className="mt-2 space-y-2 list-none pl-0">
          {citations.map((c) => {
            const src = DATA_SOURCES[c.source_key];
            const Icon = src ? SOURCE_TYPE_ICON[src.type] ?? Database : Database;
            return (
              <li
                key={c.id}
                id={`ref-${c.id}`}
                className={cn(
                  "flex gap-2 p-2 rounded-md text-xs transition-colors",
                  highlightId === c.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50",
                )}
              >
                <span className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold bg-primary/10 text-primary mt-0.5">
                  {c.id}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-foreground leading-snug">{c.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {src && (
                      <span className={cn("inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-medium", src.badge_class)}>
                        <Icon className="h-2 w-2" />
                        {src.label}
                      </span>
                    )}
                    <span className="text-muted-foreground">{c.publisher} · {c.year}</span>
                  </div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {c.url.replace(/^https?:\/\//, "").split("/")[0]}
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ── Data Provenance panel ─────────────────────────────────────────────────────

function DataProvenancePanel({ sourceKeys }: { sourceKeys: string[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Data Provenance</span>
        </div>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border bg-muted/20">
          {sourceKeys.map((sk) => {
            const src = DATA_SOURCES[sk];
            if (!src) return null;
            const Icon = SOURCE_TYPE_ICON[src.type] ?? Database;
            return (
              <div key={sk} className="flex items-start gap-2 pt-2">
                <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0", src.badge_class)}>
                  <Icon className="h-2.5 w-2.5" />
                  {src.label}
                </span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{src.full_name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Assistant response card ───────────────────────────────────────────────────

function AssistantCard({ msg }: { msg: AssistantMessage }) {
  const [highlightCitation, setHighlightCitation] = useState<number | null>(null);
  const refsRef = useRef<HTMLDivElement>(null);

  const handleCitationClick = useCallback((id: number) => {
    setHighlightCitation(id);
    // Auto-open refs and scroll to the ref item
    const el = refsRef.current?.querySelector(`#ref-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  if (msg.state === "searching") {
    return (
      <Card className="max-w-2xl border-border shadow-none">
        <CardContent className="p-4">
          <SearchingState sources={msg.searching_sources ?? []} />
        </CardContent>
      </Card>
    );
  }

  if (!msg.response) return null;
  const r = msg.response;

  return (
    <Card className="max-w-2xl border-border shadow-none">
      <CardContent className="p-4 space-y-4">
        {/* Sources verified header */}
        <SourceProvenance sourceKeys={r.sources_used} />

        <Separator />

        {/* Headline */}
        <h3 className="text-sm font-bold text-foreground">{r.headline}</h3>

        {/* Body with inline citations */}
        <ResponseBody body={r.body} citations={r.citations} onCitationClick={handleCitationClick} />

        {/* Key stats grid */}
        {r.key_stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {r.key_stats.map((stat, i) => (
              <KeyStatCard
                key={i}
                {...stat}
                citations={r.citations}
                onCitationClick={handleCitationClick}
              />
            ))}
          </div>
        )}

        {/* Data provenance panel */}
        <DataProvenancePanel sourceKeys={r.sources_used} />

        {/* References (collapsible) */}
        <div ref={refsRef}>
          <ReferencesSection citations={r.citations} highlightId={highlightCitation} forceOpen={highlightCitation != null} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SEARCH_DELAY_MS = 1800;

export default function BrazilChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || isThinking) return;

    setInput("");
    setIsThinking(true);

    const userMsg: UserMessage = { role: "user", text: trimmed };
    const assistantPlaceholder: AssistantMessage = {
      role: "assistant",
      state: "searching",
      searching_sources: queryBrazilData(trimmed).sources_used,
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);

    // Simulate async search + response
    setTimeout(() => {
      const response = queryBrazilData(trimmed);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = { role: "assistant", state: "done", response };
        return updated;
      });
      setIsThinking(false);
    }, SEARCH_DELAY_MS);
  }, [isThinking]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuery(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border bg-card">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="h-4 w-4 text-emerald-600" />
            <h1 className="text-base font-bold text-foreground">Brazil Climate Intelligence</h1>
            <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground">Demo · Mock Data</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Ask about Brazil's emissions, deforestation, agriculture, energy, or NDC commitments.
            Every answer is grounded in verified datasets from SEEG, INPE, Climate TRACE, and MMA.
          </p>
        </div>
      </div>

      {/* Message area */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-6 space-y-6 max-w-2xl">
          {/* Empty state — suggested questions */}
          {isEmpty && (
            <div className="space-y-4">
              <div className="text-center space-y-1 py-6">
                <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">Ask anything about Brazil's climate data</p>
                <p className="text-xs text-muted-foreground/70">Answers sourced from SEEG · INPE PRODES · Climate TRACE · MMA · UNFCCC</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Suggested questions</p>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => submitQuery(q)}
                      className="text-left px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors text-xs text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-md px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }
            return (
              <div key={i}>
                <AssistantCard msg={msg} />
              </div>
            );
          })}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
        <div className="max-w-2xl flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Brazil's emissions, deforestation, NDC targets…"
            className="resize-none text-sm min-h-[40px] max-h-[120px] leading-relaxed"
            rows={1}
            disabled={isThinking}
          />
          <Button
            size="sm"
            onClick={() => submitQuery(input)}
            disabled={!input.trim() || isThinking}
            className="h-10 px-3 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 max-w-2xl">
          Press Enter to send · Shift+Enter for new line · Answers use verified public datasets — not generative AI
        </p>
      </div>
    </div>
  );
}
