/**
 * Auto-scan ingest: drag/drop multiple files (csv/json/txt/pdf), upload to
 * /api/v1/ingest/scan with live progress, render structured report from the backend.
 */
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileType,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Download,
  Info,
  BarChart3,
  Lightbulb,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  TrendingUp,
  ExternalLink,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ingestApi, resolveApiHost, applyIngestWriteHeaders } from "@/lib/api";
import { safeParseOrLog, ingestScanReportSchema } from "@/lib/schemas";

const BASE = resolveApiHost();
const ACCEPTED = ".csv,.json,.txt,.pdf";
const ACCEPTED_EXT = ["csv", "json", "txt", "pdf"];
const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

interface ColumnSummary {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  nulls: number;
  total: number;
  null_ratio: number;
  stats?: { count: number; min: number; max: number; mean: number } | null;
}

interface TopicEntry {
  term: string;
  count: number;
  label?: string;
}

interface AboutSection {
  title?: string;
  doc_type?: string;
  doc_type_plain?: string;
  ai_description?: string;
  presentation?: "paragraph" | "bullets";
  paragraphs?: string[];
  description?: string;
  purpose?: string;
  topics?: TopicEntry[];
  topics_plain?: TopicEntry[];
  entities?: { ministries?: string[]; years?: number[] };
  summary?: string;
  detected_columns?: { year?: string | null; value?: string | null; sector?: string | null; district?: string | null };
  detected_columns_plain?: { year?: string; value?: string; sector?: string; district?: string };
  shape?: { rows?: number; columns?: number; keys?: number };
}

interface SectorMention { name: string; count: number; label?: string }
interface SectorTotal { name: string; total: number; label?: string }
interface YearCount { year: number; count: number }
interface YearTotal { year: number; total: number }
interface NumberMention { unit: string; value: number; raw: string }
interface NullChart { name: string; null_pct: number }
interface DistrictTotal { name: string; total: number; label?: string }
interface SectorPieSlice { name: string; value: number; pct?: number }
interface ValueHistBin { bin: string; count: number }

interface VisualMeta {
  chart?: string;
  x_column?: string | null;
  y_column?: string | null;
  category_column?: string | null;
  value_column?: string | null;
  x_label?: string;
  y_label?: string;
  metric?: string;
  rows_used?: number;
  aggregation?: string;
}

interface HighlightEntry {
  label: string;
  value: string;
  note?: string;
}

interface ChartGuide {
  id: string;
  title: string;
  what: string;
  how_to_read: string;
}

interface AnalysisValidation {
  notes?: string[];
  value_unit?: string;
  year_column?: string | null;
  value_column?: string | null;
  sector_column?: string | null;
  aggregation_engine?: string;
}

interface AnalysisSection {
  mode?: "narrative" | "tabular" | "object";
  presentation?: "paragraph" | "bullets";
  paragraphs?: string[];
  overview?: string;
  value_unit?: string;
  insights?: string[];
  highlights?: HighlightEntry[];
  chart_guides?: ChartGuide[];
  numbers?: NumberMention[];
  sectors?: SectorMention[];
  years?: YearCount[];
  visuals?: {
    sector_bar?: SectorMention[] | SectorTotal[];
    year_timeline?: YearCount[];
    time_series?: YearTotal[];
    district_bar?: DistrictTotal[];
    sector_pie?: SectorPieSlice[];
    value_histogram?: ValueHistBin[];
    null_chart?: NullChart[];
    unit_histogram?: { unit: string; count: number }[];
  };
  visuals_meta?: {
    time_series?: VisualMeta | null;
    sector_bar?: VisualMeta | null;
    district_bar?: VisualMeta | null;
    sector_pie?: VisualMeta | null;
    value_histogram?: VisualMeta | null;
    completeness?: VisualMeta | null;
  };
}

interface AiInsights {
  verdict: "ready" | "needs_work" | "not_ndc_relevant";
  file_description?: string;
  summary: string;
  quality: string;
  ndc_targets?: string[];
  policy_value?: string;
  policy_uses?: string[];
  risks?: string[];
  next_step?: string;
  key_findings?: string[];
  sources?: { label: string; url: string; why?: string }[];
}

interface FileReport {
  filename: string;
  size_bytes?: number;
  mime?: string;
  extension?: string;
  kind?: "tabular" | "json_array" | "json_object" | "text" | "pdf";
  rows?: number;
  columns?: ColumnSummary[];
  sample?: unknown;
  preview?: string;
  pages?: number;
  lines?: number;
  non_empty_lines?: number;
  words?: number;
  chars?: number;
  keys?: string[];
  keywords?: Record<string, string[]>;
  parse_errors?: { row?: number; code?: string; message?: string }[];
  warnings?: string[];
  parse_mode?: string;
  parse_engine?: string;
  analysis_engine?: string;
  pandas_version?: string;
  validation?: AnalysisValidation;
  about?: AboutSection;
  analysis?: AnalysisSection;
  recommendations?: string[];
  ai_insights?: AiInsights;
  qc?: {
    rows_input?: number;
    rows_used_for_charts?: number;
    rows_dropped_non_national?: number;
    duplicate_key_rows?: number;
    value_coercion_failures?: number;
  };
  error?: string;
}

interface ScanReport {
  report_id: string;
  generated_at: string;
  duration_ms: number;
  summary: {
    files_received: number;
    files_ok: number;
    files_failed: number;
    total_warnings: number;
    keyword_buckets: Record<string, string[]>;
    json_mode?: "strict" | "repair";
    ai_enhanced?: boolean;
    qc?: {
      rows_input: number;
      rows_used_for_charts: number;
      rows_dropped_non_national: number;
      duplicate_key_rows: number;
      value_coercion_failures: number;
      files_repaired_non_strict: number;
    };
  };
  files: FileReport[];
}

type Phase = "idle" | "uploading" | "scanning" | "done" | "error";

export function ScanReportIngest() {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowJsonRepair, setAllowJsonRepair] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (list: FileList | null) => {
      if (!list) return;
      const incoming = Array.from(list);

      const badExt: string[] = [];
      const tooBig: string[] = [];
      const accepted: File[] = [];

      for (const f of incoming) {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ACCEPTED_EXT.includes(ext)) {
          badExt.push(f.name);
          continue;
        }
        if (f.size > MAX_BYTES) {
          tooBig.push(f.name);
          continue;
        }
        if (f.size === 0) {
          toast.error(`"${f.name}" is empty and was skipped`);
          continue;
        }
        if (ext === "json") {
          const text = (await f.text()).trim().replace(/^\uFEFF/, "");
          if (/^\{\\rtf\d/i.test(text) || text.includes("\\rtf1")) {
            toast.error(
              `"${f.name}" is Rich Text (RTF), not JSON. Save as Plain Text UTF-8 in TextEdit, or use docs/samples/ingest-example.json.`,
              { duration: 8000 },
            );
            continue;
          }
          try {
            JSON.parse(text);
          } catch {
            if (!text.startsWith("{") && !text.startsWith("[")) {
              toast.error(`"${f.name}" does not look like JSON (must start with { or [).`);
              continue;
            }
            if (!allowJsonRepair) {
              toast.error(
                `"${f.name}" is not strict JSON. Enable "JSON repair mode" before scanning, or fix the file syntax.`,
                { duration: 6000 },
              );
              continue;
            }
            toast.warning(`"${f.name}" is not strict JSON — repair mode will try to fix common syntax issues.`, {
              duration: 5000,
            });
          }
        }
        accepted.push(f);
      }

      if (badExt.length) toast.error(`Unsupported type: ${badExt.join(", ")}`);
      if (tooBig.length) toast.error(`Too large (max 20 MB): ${tooBig.join(", ")}`);

      const merged = [...files, ...accepted].slice(0, MAX_FILES);
      if (files.length + accepted.length > MAX_FILES) {
        toast.warning(`Only the first ${MAX_FILES} files are kept`);
      }
      setFiles(merged);
    },
    [files, allowJsonRepair],
  );

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    void addFiles(e.dataTransfer.files);
  };

  const reset = () => {
    setFiles([]);
    setProgress(0);
    setPhase("idle");
    setReport(null);
    setError(null);
  };

  const submit = () => {
    if (!files.length) return;
    setError(null);
    setReport(null);
    setPhase("uploading");
    setProgress(0);

    const form = new FormData();
    for (const f of files) form.append("files", f);

    const xhr = new XMLHttpRequest();
    const scanUrl = new URL(`${BASE || window.location.origin}/api/v1/ingest/scan`);
    if (allowJsonRepair) scanUrl.searchParams.set("json_mode", "repair");
    xhr.open("POST", scanUrl.toString());
    applyIngestWriteHeaders(xhr);

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      setProgress(pct);
      if (pct >= 100) setPhase("scanning");
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as ScanReport | { error: string };
        if (xhr.status >= 200 && xhr.status < 300 && "files" in body) {
          const validated = safeParseOrLog(ingestScanReportSchema, body, "ingest.scan");
          if (!validated.ok) {
            setError("Scan response failed schema validation");
            setPhase("error");
            toast.error("Scan response failed schema validation");
            return;
          }
          setReport(validated.data);
          setPhase("done");
          toast.success(
            `Review complete — ${body.summary.files_ok} of ${body.summary.files_received} file${body.summary.files_received !== 1 ? "s" : ""} read successfully`,
          );
        } else {
          const msg = "error" in body ? body.error : `HTTP ${xhr.status}`;
          setError(msg);
          setPhase("error");
          toast.error(msg);
        }
      } catch {
        setError(`Server returned non-JSON response (HTTP ${xhr.status})`);
        setPhase("error");
      }
    };

    xhr.onerror = () => {
      setError(
        import.meta.env.DEV
          ? "Network error during upload. Is the API running on port 8787?"
          : "Network error during upload. Check that the API is deployed and reachable.",
      );
      setPhase("error");
    };

    xhr.send(form);
  };

  const totalBytes = files.reduce((a, f) => a + f.size, 0);

  return (
    <div className="space-y-3">
      {phase !== "done" && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-foreground font-medium">
            Drop .csv, .json, .txt or .pdf here, or click to browse
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Up to {MAX_FILES} files · 20 MB each · we read the file and explain what it contains in plain language
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Tip: save spreadsheets as CSV or Excel. For data files, use a simple table format — not Rich Text.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {files.length > 0 && phase === "idle" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={allowJsonRepair ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setAllowJsonRepair((v) => !v)}
            >
              {allowJsonRepair ? "Auto-fix messy files: ON" : "Auto-fix messy files: OFF"}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Leave OFF for normal files. Turn ON only if a data file fails to open.
            </span>
          </div>
          <div className="space-y-1">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 p-2 rounded border border-border bg-card"
              >
                {iconFor(f.name)}
                <span className="text-xs flex-1 truncate font-medium">{f.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {formatBytes(f.size)}
                </Badge>
                <button
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {files.length} file(s) · {formatBytes(totalBytes)} total
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={reset}>
              Clear
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={!files.length}>
              Review my files
            </Button>
          </div>
        </div>
      )}

      {(phase === "uploading" || phase === "scanning") && (
        <div className="space-y-2 p-3 rounded border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium">
              {phase === "uploading" ? `Uploading… ${progress}%` : "Reading your files…"}
            </span>
          </div>
          <Progress value={phase === "scanning" ? 100 : progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">
            {phase === "scanning"
              ? "Checking the contents and preparing a plain-language summary…"
              : `Sending ${files.length} file${files.length !== 1 ? "s" : ""}…`}
          </p>
        </div>
      )}

      {phase === "error" && error && (
        <div className="p-3 rounded border border-destructive/50 bg-destructive/5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-destructive">Could not read your files</p>
            <p className="text-[10px] text-destructive/80 mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={reset}>
            Try again
          </Button>
        </div>
      )}

      {phase === "done" && report && <ReportView report={report} onReset={reset} />}
    </div>
  );
}

function ReportView({ report, onReset }: { report: ScanReport; onReset: () => void }) {
  const { summary, files } = report;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="h-4 w-4 text-on-track" />
          <span className="text-sm font-semibold">Your file review</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(report.generated_at).toLocaleString()}
          </span>
          {summary.ai_enhanced && (
            <Badge variant="outline" className="text-[9px] bg-primary/8 text-primary border-primary/30 gap-1">
              <Sparkles className="h-2.5 w-2.5" />Includes AI summary
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => downloadJson(report)}
          >
            <Download className="h-3 w-3" />
            Download report
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onReset}>
            Review another file
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Files uploaded" value={summary.files_received} />
        <Stat label="Read successfully" value={summary.files_ok} tone="ok" />
        <Stat
          label="Could not read"
          value={summary.files_failed}
          tone={summary.files_failed ? "bad" : "muted"}
        />
        <Stat
          label="Things to check"
          value={summary.total_warnings}
          tone={summary.total_warnings ? "warn" : "muted"}
        />
      </div>
      {(summary.json_mode === "repair" || summary.qc) && (
        <details className="rounded border border-border bg-muted/20 p-2">
          <summary className="text-[10px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
            More detail for data officers
          </summary>
          <div className="mt-2 space-y-2">
            {summary.json_mode === "repair" && (
              <p className="text-[10px] text-at-risk">
                One or more data files were auto-corrected to open them — please double-check the figures before publishing.
              </p>
            )}
            {summary.qc && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Stat label="Total rows" value={summary.qc.rows_input ?? 0} />
                <Stat label="Rows in charts" value={summary.qc.rows_used_for_charts ?? 0} tone="ok" />
                <Stat label="Rows left out" value={summary.qc.rows_dropped_non_national ?? 0} tone={summary.qc.rows_dropped_non_national ? "warn" : "muted"} />
                <Stat label="Duplicate entries" value={summary.qc.duplicate_key_rows ?? 0} tone={summary.qc.duplicate_key_rows ? "warn" : "muted"} />
                <Stat label="Unreadable numbers" value={summary.qc.value_coercion_failures ?? 0} tone={summary.qc.value_coercion_failures ? "bad" : "muted"} />
                <Stat label="Auto-fixed files" value={summary.qc.files_repaired_non_strict ?? 0} tone={summary.qc.files_repaired_non_strict ? "warn" : "muted"} />
              </div>
            )}
          </div>
        </details>
      )}

      {Object.keys(summary.keyword_buckets).length > 0 && (
        <div className="space-y-1 p-3 rounded border border-border bg-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Keywords
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
            {Object.entries(summary.keyword_buckets).map(([bucket, words]) => (
              <div key={bucket} className="space-y-0.5">
                <p className="text-[10px] font-semibold text-foreground">
                  {friendlyKeywordBucket(bucket)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {words.map((w) => (
                    <Badge key={w} variant="outline" className="text-[9px] h-4">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {files.map((f, i) => (
          <FileCard key={`${f.filename}-${i}`} file={f} />
        ))}
      </div>
    </div>
  );
}

function FileCard({ file }: { file: FileReport }) {
  if (file.error) {
    return (
      <div className="p-3 rounded border border-destructive/40 bg-destructive/5 space-y-1">
        <div className="flex items-center gap-2">
          {iconFor(file.filename)}
          <span className="text-xs font-medium truncate flex-1">{file.filename}</span>
          <Badge
            variant="outline"
            className="text-[9px] bg-destructive/10 text-destructive border-destructive/30"
          >
            Error
          </Badge>
        </div>
        <p className="text-[10px] text-destructive">{file.error}</p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded border border-border bg-card space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {iconFor(file.filename)}
        <span className="text-xs font-medium truncate flex-1">{file.filename}</span>
        {friendlyFileKind(file.kind) && (
          <Badge variant="outline" className="text-[9px]">
            {friendlyFileKind(file.kind)}
          </Badge>
        )}
        {file.size_bytes != null && (
          <Badge variant="outline" className="text-[9px]">
            {formatBytes(file.size_bytes)}
          </Badge>
        )}
        {file.parse_mode && file.parse_mode !== "strict" && (
          <Badge variant="outline" className="text-[9px] bg-at-risk/10 text-at-risk border-at-risk/30">
            Auto-fixed
          </Badge>
        )}
        {file.rows != null && (
          <Badge variant="outline" className="text-[9px]">
            {file.rows} rows
          </Badge>
        )}
        {file.pages != null && (
          <Badge variant="outline" className="text-[9px]">
            {file.pages} pages
          </Badge>
        )}
        {file.words != null && (
          <Badge variant="outline" className="text-[9px]">
            {file.words} words
          </Badge>
        )}
      </div>

      {file.warnings && file.warnings.length > 0 && (
        <div className="space-y-0.5">
          {file.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-at-risk">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {file.about && <AboutCard about={file.about} />}

      {file.ai_insights && <AiInsightsCard insights={file.ai_insights} />}

      {file.analysis && (
        <AnalysisCard
          analysis={file.analysis}
          columns={file.columns}
          preview={file.preview}
          sample={file.sample}
          kind={file.kind}
          keys={file.keys}
          validation={file.validation}
        />
      )}

      {file.recommendations && file.recommendations.length > 0 && (
        <RecommendationsCard items={file.recommendations} />
      )}

      {file.parse_errors && file.parse_errors.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-at-risk font-semibold mb-1">
            Problems reading this file ({file.parse_errors.length})
          </p>
          <ul className="text-[10px] text-at-risk space-y-0.5">
            {file.parse_errors.slice(0, 5).map((e, i) => (
              <li key={i}>
                Line {e.row ?? "?"}: {e.message ?? e.code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AiInsightsCard({ insights }: { insights: AiInsights }) {
  const verdictConfig = {
    ready: { icon: ShieldCheck, color: "text-on-track", bg: "bg-on-track/5 border-on-track/25", label: "Looks good to use" },
    needs_work: { icon: ShieldAlert, color: "text-at-risk", bg: "bg-at-risk/5 border-at-risk/25", label: "Needs cleanup" },
    not_ndc_relevant: { icon: ShieldX, color: "text-muted-foreground", bg: "bg-muted/30 border-border", label: "Not climate-related" },
  };
  const cfg = verdictConfig[insights.verdict] ?? verdictConfig.needs_work;
  const VerdictIcon = cfg.icon;

  return (
    <div className={cn("rounded-md border p-3 space-y-3", cfg.bg)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-primary">Quick assessment</span>
        <div className="flex-1" />
        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold", cfg.bg, cfg.color)}>
          <VerdictIcon className="h-3 w-3" />
          {cfg.label}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground leading-snug">{insights.summary}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{insights.quality}</p>
      </div>

      {/* Key findings */}
      {insights.key_findings && insights.key_findings.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">What stood out</p>
          <ul className="space-y-1">
            {insights.key_findings.map((f, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] text-foreground leading-snug">
                <TrendingUp className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Policy value */}
      {insights.policy_value && (
        <div className="rounded border border-border bg-card/60 p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Why this matters for planning</p>
          <p className="text-[11px] text-foreground leading-relaxed">{insights.policy_value}</p>
        </div>
      )}

      {/* Policy planning uses */}
      {insights.policy_uses && insights.policy_uses.length > 0 && (
        <div className="rounded border border-primary/20 bg-primary/[0.03] p-2.5 space-y-1.5">
          <p className="text-[9px] uppercase tracking-wider text-primary font-semibold">Ways to use this in planning</p>
          <ul className="space-y-2">
            {insights.policy_uses.map((use, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] text-foreground leading-relaxed">
                <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>{use}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* NDC targets + risks in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {insights.ndc_targets && insights.ndc_targets.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Climate targets this may support</p>
            <div className="flex flex-wrap gap-1">
              {insights.ndc_targets.map((t) => (
                <Badge key={t} variant="outline" className="text-[9px] bg-primary/8 text-primary border-primary/30">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {insights.risks && insights.risks.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Watch out for</p>
            <ul className="space-y-0.5">
              {insights.risks.map((r, i) => (
                <li key={i} className="flex gap-1 text-[10px] text-at-risk leading-snug">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next step */}
      {insights.next_step && (
        <div className="flex items-start gap-2 pt-1 border-t border-border/40">
          <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground font-medium leading-snug">
            <span className="text-muted-foreground font-normal">Next step: </span>{insights.next_step}
          </p>
        </div>
      )}

      {/* Verified sources */}
      {insights.sources && insights.sources.length > 0 && (
        <div className="pt-2 border-t border-border/40 space-y-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Official sources to check</p>
          <ul className="space-y-1">
            {insights.sources.map((s) => (
              <li key={s.url} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <ExternalLink className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline underline-offset-2"
                  >
                    {s.label}
                  </a>
                  {s.why && <span className="text-muted-foreground"> — {s.why}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, accent }: { icon: React.ReactNode; title: string; accent: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 mb-2 pb-1.5 border-b", accent)}>
      {icon}
      <span className="text-[10px] uppercase tracking-wider font-bold">{title}</span>
    </div>
  );
}

export function AboutCard({ about }: { about: AboutSection }) {
  const topics = about.topics_plain?.length ? about.topics_plain : about.topics;
  const docLabel = about.doc_type_plain ?? about.doc_type;
  const paragraphMode = about.presentation === "paragraph" && (about.paragraphs?.length ?? 0) > 0;
  const hasAiDescription = Boolean(about.ai_description?.trim());

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <SectionHeader
        icon={<Info className="h-3.5 w-3.5 text-primary" />}
        title={hasAiDescription ? "About this file" : "About this document"}
        accent="border-primary/30 text-primary"
      />
      <div className="space-y-2">
        {hasAiDescription && (
          <p className="text-xs text-foreground leading-relaxed">{about.ai_description}</p>
        )}
        {paragraphMode && !hasAiDescription ? (
          <div className="space-y-3">
            {about.paragraphs!.map((para, i) => (
              <p key={i} className="text-[11px] text-foreground/90 leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        ) : !hasAiDescription ? (
          <>
            {about.title && (
              <p className="text-xs font-semibold text-foreground leading-snug">{about.title}</p>
            )}
            {docLabel && (
              <Badge variant="outline" className="text-[9px] bg-primary/5">
                {docLabel}
              </Badge>
            )}
            {about.description && (
              <p className="text-[11px] text-foreground/90 leading-relaxed">{about.description}</p>
            )}
            {!about.description && about.summary && (
              <p className="text-[11px] text-foreground/80 leading-relaxed">{about.summary}</p>
            )}
            {about.purpose && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground/80">Why it matters: </span>
                {about.purpose}
              </p>
            )}
          </>
        ) : (
          <>
            {docLabel && (
              <Badge variant="outline" className="text-[9px] bg-primary/5">
                {docLabel}
              </Badge>
            )}
            {about.purpose && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground/80">Why it matters: </span>
                {about.purpose}
              </p>
            )}
          </>
        )}

        {!paragraphMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {topics && topics.length > 0 && (
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">
                Main themes in the text
              </p>
              <div className="flex flex-wrap gap-1">
                {topics.slice(0, 6).map((t) => (
                  <Badge key={t.term} variant="outline" className="text-[9px] h-4">
                    {t.label ?? t.term}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {about.entities?.ministries && about.entities.ministries.length > 0 && (
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">
                Government bodies mentioned
              </p>
              <div className="flex flex-wrap gap-1">
                {about.entities.ministries.map((m) => (
                  <Badge key={m} variant="outline" className="text-[9px] h-4">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {about.entities?.years && about.entities.years.length > 0 && (
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">
                Years referenced
              </p>
              <p className="text-[11px] text-foreground/80">
                {about.entities.years.slice(0, 8).join(", ")}
                {about.entities.years.length > 8 ? " …" : ""}
              </p>
            </div>
          )}
          {about.detected_columns_plain && (
            <div className="md:col-span-2">
              <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">
                What we found in your spreadsheet
              </p>
              <ul className="text-[11px] text-foreground/80 space-y-0.5">
                {(["year", "value", "sector", "district"] as const).map((k) => {
                  const line = about.detected_columns_plain?.[k];
                  if (!line) return null;
                  const ok = !line.toLowerCase().includes("no ");
                  return (
                    <li key={k} className={cn("flex gap-1.5", ok ? "text-foreground" : "text-muted-foreground")}>
                      <span className={ok ? "text-on-track" : "text-at-risk"}>{ok ? "✓" : "○"}</span>
                      <span>{line}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {about.shape && !about.detected_columns_plain && (
            <div>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">Size of file</p>
              <p className="text-[11px] text-foreground/80">
                {about.shape.rows != null && `${about.shape.rows} rows of data`}
                {about.shape.rows != null && about.shape.columns != null && " · "}
                {about.shape.columns != null && `${about.shape.columns} columns`}
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

const CHART_COLOR = "hsl(var(--primary))";
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

export function AnalysisCard({
  analysis,
  columns,
  preview,
  sample,
  kind,
  keys,
  validation,
}: {
  analysis: AnalysisSection;
  columns?: ColumnSummary[];
  preview?: string;
  sample?: unknown;
  kind?: string;
  keys?: string[];
  validation?: AnalysisValidation;
}) {
  const v = analysis.visuals ?? {};
  const meta = analysis.visuals_meta ?? {};
  const guides = analysis.chart_guides ?? [];
  const guideFor = (id: string) => guides.find((g) => g.id === id);
  const isTabular = analysis.mode === "tabular";

  const sectorData = (v.sector_bar ?? []).map((s, i) => ({
    name: ("label" in s && s.label) || s.name,
    value: "total" in s ? s.total : s.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const yearData = v.time_series ?? v.year_timeline?.map((y) => ({ year: y.year, total: y.count })) ?? [];
  const districtData = (v.district_bar ?? []).map((d, i) => ({
    name: d.label ?? d.name,
    value: d.total,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const pieData = v.sector_pie ?? [];
  const histData = v.value_histogram ?? [];
  const nullChart = v.null_chart ?? [];
  const completenessData = nullChart.map((row) => ({
    name: row.name,
    fill_pct: +(100 - row.null_pct).toFixed(1),
  }));
  const unitHist = v.unit_histogram ?? [];

  const sectorGuide = guideFor("sector_bar");
  const yearGuide = guideFor(isTabular ? "time_series" : "year_timeline");
  const districtGuide = guideFor("district_bar");
  const pieGuide = guideFor("sector_pie");
  const histGuide = guideFor("value_histogram");
  const completenessGuide = guideFor("completeness");
  const nullGuide = guideFor("null_chart");
  const unitGuide = guideFor("unit_histogram");

  const paragraphMode =
    analysis.presentation === "paragraph" && (analysis.paragraphs?.length ?? 0) > 0;
  const hasTabularCharts = isTabular;
  const hasNarrativeCharts =
    !isTabular &&
    (sectorData.length > 0 || yearData.length > 0 || nullChart.length > 0 || unitHist.length > 0);
  const hasCharts = hasTabularCharts || hasNarrativeCharts;
  const valueUnit = analysis.value_unit || validation?.value_unit || "";
  const unitSuffix = valueUnit ? ` (${valueUnit})` : "";

  const slot3Type = districtData.length > 0 ? "district" : histData.length > 0 ? "histogram" : null;
  const slot4Type = pieData.length > 0 ? "pie" : completenessData.length > 0 ? "completeness" : null;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <SectionHeader
        icon={<BarChart3 className="h-3.5 w-3.5 text-on-track" />}
        title="What's in the numbers"
        accent="border-on-track/30 text-on-track"
      />

      {validation?.notes && validation.notes.length > 0 && (
        <div className="mb-3 rounded border border-border bg-muted/30 p-2 space-y-1">
          <p className="text-[9px] uppercase text-muted-foreground font-semibold">How we added up the figures</p>
          {validation.notes.map((note, i) => (
            <p key={i} className="text-[10px] text-foreground/85 leading-relaxed">
              {note}
            </p>
          ))}
        </div>
      )}

      {paragraphMode && (
        <div className="space-y-3 mb-1">
          {analysis.paragraphs!.map((para, i) => (
            <p key={i} className="text-[11px] text-foreground/90 leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      )}

      {!paragraphMode && analysis.overview && (
        <p className="text-[11px] text-foreground/85 leading-relaxed mb-3">{analysis.overview}</p>
      )}

      {!paragraphMode && analysis.highlights && analysis.highlights.length > 0 && (
        <div className="mb-3 rounded border border-on-track/20 bg-on-track/5 p-2.5 space-y-2">
          <p className="text-[9px] uppercase text-on-track font-semibold tracking-wider">Main figures at a glance</p>
          {analysis.highlights.map((h, i) => (
            <div key={i}>
              <p className="text-[11px] font-semibold text-foreground">{h.label}</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{h.value}</p>
              {h.note && <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{h.note}</p>}
            </div>
          ))}
        </div>
      )}

      {!paragraphMode && analysis.insights && analysis.insights.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">What we noticed</p>
          <ul className="space-y-1">
            {analysis.insights.map((line, i) => (
              <li key={i} className="text-[11px] text-foreground leading-snug flex gap-1.5">
                <span className="text-on-track mt-0.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasCharts && (
        <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-2">Charts</p>
      )}

      {hasTabularCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {yearData.length > 0 ? (
            <Chart
              title={(yearGuide?.title ?? "Trend over time") + unitSuffix}
              subtitle={metaSubtitle(meta.time_series)}
              caption={yearGuide ? chartCaption(yearGuide) : undefined}
            >
              <LineChart data={yearData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="year"
                  label={meta.time_series?.x_label ? { value: meta.time_series.x_label, position: "insideBottom", offset: -2, fontSize: 9 } : undefined}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  label={meta.time_series?.y_label ? { value: meta.time_series.y_label, angle: -90, position: "insideLeft", fontSize: 9 } : undefined}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RTooltip {...tooltipStyle()} />
                <Line type="monotone" dataKey="total" stroke={CHART_COLOR} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </Chart>
          ) : (
            <ChartPlaceholder
              title="Trend over time"
              reason="Add a Year column and an Amount column to see how figures change over time."
            />
          )}

          {sectorData.length > 0 ? (
            <Chart
              title={(sectorGuide?.title ?? "Totals by sector") + unitSuffix}
              subtitle={metaSubtitle(meta.sector_bar)}
              caption={sectorGuide ? chartCaption(sectorGuide) : undefined}
            >
              <BarChart data={sectorData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={100} stroke="hsl(var(--muted-foreground))" />
                <RTooltip {...tooltipStyle()} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {sectorData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </Chart>
          ) : (
            <ChartPlaceholder
              title="Totals by sector"
              reason="Add Sector and Amount columns to compare energy, forests, agriculture, and other parts of the economy."
            />
          )}

          {slot3Type === "district" ? (
            <Chart
              title={(districtGuide?.title ?? "Top districts or regions") + unitSuffix}
              subtitle={metaSubtitle(meta.district_bar)}
              caption={districtGuide ? chartCaption(districtGuide) : undefined}
            >
              <BarChart data={districtData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  label={meta.district_bar?.x_label ? { value: meta.district_bar.x_label, position: "insideBottom", offset: -18, fontSize: 9 } : undefined}
                  tick={{ fontSize: 8 }}
                  stroke="hsl(var(--muted-foreground))"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  label={meta.district_bar?.y_label ? { value: meta.district_bar.y_label, angle: -90, position: "insideLeft", fontSize: 9 } : undefined}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RTooltip {...tooltipStyle()} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {districtData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </Chart>
          ) : slot3Type === "histogram" ? (
            <Chart
              title={histGuide?.title ?? "How amounts are distributed"}
              subtitle={metaSubtitle(meta.value_histogram)}
              caption={histGuide ? chartCaption(histGuide) : undefined}
            >
              <BarChart data={histData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="bin"
                  label={meta.value_histogram?.x_label ? { value: meta.value_histogram.x_label, position: "insideBottom", offset: -2, fontSize: 9 } : undefined}
                  tick={{ fontSize: 8 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  label={meta.value_histogram?.y_label ? { value: meta.value_histogram.y_label, angle: -90, position: "insideLeft", fontSize: 9 } : undefined}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RTooltip {...tooltipStyle()} />
                <Bar dataKey="count" fill={CHART_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </Chart>
          ) : (
            <ChartPlaceholder
              title="District or value spread"
              reason="Add a District or Region column for regional totals, or ensure the Amount column has enough numeric rows for a distribution chart."
            />
          )}

          {slot4Type === "pie" ? (
            <Chart
              title={pieGuide?.title ?? "Sector share"}
              subtitle={meta.sector_pie?.aggregation}
              caption={pieGuide ? chartCaption(pieGuide) : undefined}
            >
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={52}
                  label={({ name, pct }) => (pct != null && pct >= 8 ? `${name} ${pct}%` : "")}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip
                  {...tooltipStyle()}
                  formatter={(value: number, _name: string, props: { payload?: SectorPieSlice }) => {
                    const pct = props.payload?.pct;
                    return pct != null ? [`${value} (${pct}%)`, "Total"] : [value, "Total"];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
              </PieChart>
            </Chart>
          ) : slot4Type === "completeness" ? (
            <Chart
              title={completenessGuide?.title ?? "Data completeness"}
              subtitle={meta.completeness?.metric}
              caption={completenessGuide ? chartCaption(completenessGuide) : undefined}
            >
              <AreaChart data={completenessData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 8 }}
                  stroke="hsl(var(--muted-foreground))"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" unit="%" />
                <RTooltip {...tooltipStyle()} formatter={(v: number) => [`${v}% filled`, "Completeness"]} />
                <Area type="monotone" dataKey="fill_pct" stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.35} />
              </AreaChart>
            </Chart>
          ) : (
            <ChartPlaceholder
              title="Sector share or completeness"
              reason="Add Sector and Amount columns for a share chart, or include more columns so we can show how complete each field is."
            />
          )}
        </div>
      )}

      {hasNarrativeCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sectorData.length > 0 && (
            <Chart
              title={(sectorGuide?.title ?? "Emissions or values by sector") + unitSuffix}
              caption={sectorGuide ? chartCaption(sectorGuide) : undefined}
            >
              <BarChart data={sectorData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={100} stroke="hsl(var(--muted-foreground))" />
                <RTooltip {...tooltipStyle()} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {sectorData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </Chart>
          )}

          {yearData.length > 0 && (
            <Chart
              title={(yearGuide?.title ?? "Which years come up?")}
              caption={yearGuide ? chartCaption(yearGuide) : undefined}
            >
              <LineChart data={yearData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip {...tooltipStyle()} />
                <Line type="monotone" dataKey="total" stroke={CHART_COLOR} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </Chart>
          )}

          {nullChart.length > 0 && (
            <Chart
              title={nullGuide?.title ?? "Where is data missing?"}
              caption={nullGuide ? chartCaption(nullGuide) : undefined}
            >
              <BarChart data={nullChart} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 8 }}
                  stroke="hsl(var(--muted-foreground))"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <RTooltip {...tooltipStyle()} />
                <Bar dataKey="null_pct" radius={[3, 3, 0, 0]}>
                  {nullChart.map((row, i) => (
                    <Cell key={i} fill={row.null_pct >= 50 ? "hsl(var(--at-risk))" : CHART_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </Chart>
          )}

          {unitHist.length > 0 && (
            <Chart
              title={unitGuide?.title ?? "What kinds of numbers appear?"}
              caption={unitGuide ? chartCaption(unitGuide) : undefined}
            >
              <BarChart data={unitHist} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="unit" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip {...tooltipStyle()} />
                <Bar dataKey="count" fill={CHART_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </Chart>
          )}
        </div>
      )}

      {!paragraphMode && analysis.numbers && analysis.numbers.length > 0 && (
        <details className="mt-3">
          <summary className="text-[9px] uppercase text-muted-foreground font-semibold cursor-pointer hover:text-foreground">
            All figures mentioned ({analysis.numbers.length})
          </summary>
          <p className="text-[10px] text-muted-foreground mt-1 mb-1">
            Every number we spotted in the document. The highlights above are the most important ones.
          </p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
            {analysis.numbers.slice(0, 24).map((n, i) => (
              <Badge key={i} variant="outline" className="text-[9px] h-4 font-mono">
                {n.raw}
              </Badge>
            ))}
          </div>
        </details>
      )}

      {columns && columns.length > 0 && (
        <details className="mt-3">
          <summary className="text-[9px] uppercase text-muted-foreground font-semibold cursor-pointer hover:text-foreground">
            Column details ({columns.length})
          </summary>
          <div className="max-h-44 overflow-auto border border-border rounded mt-1">
            <table className="w-full text-[10px]">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left p-1.5">Column</th>
                  <th className="text-left p-1.5">Kind</th>
                  <th className="text-right p-1.5">Empty</th>
                  <th className="text-right p-1.5">Lowest</th>
                  <th className="text-right p-1.5">Highest</th>
                  <th className="text-right p-1.5">Average</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((c) => (
                  <tr key={c.name} className="border-t border-border/30">
                    <td className="p-1.5 font-medium text-foreground">{c.name}</td>
                    <td className="p-1.5">{friendlyColumnType(c.type)}</td>
                    <td
                      className={cn(
                        "p-1.5 text-right tabular-nums",
                        c.null_ratio > 0.5 && "text-at-risk font-semibold",
                      )}
                    >
                      {c.nulls}/{c.total}
                    </td>
                    <td className="p-1.5 text-right tabular-nums">{c.stats?.min ?? "—"}</td>
                    <td className="p-1.5 text-right tabular-nums">{c.stats?.max ?? "—"}</td>
                    <td className="p-1.5 text-right tabular-nums">{c.stats?.mean ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {keys && keys.length > 0 && (
        <div className="mt-3">
          <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">
            Data fields found ({keys.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {keys.slice(0, 30).map((k) => (
              <Badge key={k} variant="outline" className="text-[9px] h-4">
                {k}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(preview || (kind === "json_object" && sample) || (Array.isArray(sample) && sample.length > 0)) && (
        <details className="mt-3">
          <summary className="text-[9px] uppercase text-muted-foreground font-semibold cursor-pointer hover:text-foreground">
            Original file snippet
          </summary>
          <pre className="text-[10px] bg-muted/30 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap break-words mt-1">
            {preview ?? JSON.stringify(sample, null, 2).slice(0, 1200)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function RecommendationsCard({ items }: { items: string[] }) {
  const paragraphStyle = items.length <= 2 && items.some((r) => r.length > 120);

  return (
    <div className="rounded-md border border-at-risk/30 bg-at-risk/5 p-3">
      <SectionHeader
        icon={<Lightbulb className="h-3.5 w-3.5 text-at-risk" />}
        title="How to improve this file"
        accent="border-at-risk/30 text-at-risk"
      />
      {paragraphStyle ? (
        <div className="space-y-2">
          {items.map((r, i) => (
            <p key={i} className="text-[11px] text-foreground leading-relaxed">
              {r}
            </p>
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((r, i) => (
            <li key={i} className="text-[11px] text-foreground leading-snug flex gap-1.5">
              <span className="text-at-risk mt-0.5">→</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function chartCaption(guide: ChartGuide) {
  return `${guide.what} ${guide.how_to_read}`;
}

function metaSubtitle(m?: VisualMeta | null): string | undefined {
  if (!m) return undefined;
  const parts: string[] = [];
  if (m.x_label && m.y_label) parts.push(`${m.x_label} × ${m.y_label}`);
  else if (m.x_label) parts.push(m.x_label);
  else if (m.y_label) parts.push(m.y_label);
  else if (m.metric) parts.push(m.metric);
  if (m.aggregation) parts.push(m.aggregation);
  return parts.length ? parts.join(" · ") : undefined;
}

function Chart({
  title,
  subtitle,
  caption,
  children,
}: {
  title: string;
  subtitle?: string;
  caption?: string;
  children: React.ReactElement;
}) {
  return (
    <div className="border border-border rounded bg-card p-2">
      <p className="text-[10px] font-semibold text-foreground mb-0.5 leading-snug">{title}</p>
      {subtitle && (
        <p className="text-[9px] text-muted-foreground leading-snug mb-1">{subtitle}</p>
      )}
      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {caption && (
        <p className="text-[10px] text-muted-foreground leading-snug mt-1.5 border-t border-border/50 pt-1.5">
          {caption}
        </p>
      )}
    </div>
  );
}

function ChartPlaceholder({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="border border-dashed border-border rounded bg-muted/10 p-2 flex flex-col justify-center min-h-[200px]">
      <p className="text-[10px] font-semibold text-muted-foreground mb-1">{title}</p>
      <p className="text-[10px] text-muted-foreground leading-snug">{reason}</p>
    </div>
  );
}

function tooltipStyle() {
  return {
    contentStyle: {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 6,
      fontSize: 10,
      padding: "4px 8px",
    },
    labelStyle: { fontSize: 10 },
    itemStyle: { fontSize: 10 },
  };
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "ok" | "bad" | "warn" | "muted" | "default";
}) {
  const cls =
    tone === "ok"
      ? "text-on-track"
      : tone === "bad"
        ? "text-destructive"
        : tone === "warn"
          ? "text-at-risk"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="p-2 rounded border border-border bg-card">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className={cn("text-lg font-bold tabular-nums", cls)}>{value}</p>
    </div>
  );
}

function iconFor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv")
    return <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />;
  if (ext === "json") return <FileJson className="h-4 w-4 text-primary shrink-0" />;
  if (ext === "pdf") return <FileType className="h-4 w-4 text-primary shrink-0" />;
  return <FileText className="h-4 w-4 text-primary shrink-0" />;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function friendlyFileKind(kind?: string): string | null {
  if (!kind) return null;
  const labels: Record<string, string> = {
    tabular: "Spreadsheet",
    json_array: "Data list",
    json_object: "Structured data",
    text: "Text document",
    pdf: "PDF document",
  };
  return labels[kind] ?? kind.replace(/_/g, " ");
}

function friendlyColumnType(type: string): string {
  const labels: Record<string, string> = {
    string: "Text",
    number: "Number",
    date: "Date",
    boolean: "Yes/No",
  };
  return labels[type] ?? type;
}

function friendlyKeywordBucket(bucket: string): string {
  const labels: Record<string, string> = {
    emissions: "Emissions",
    sectors: "Sectors",
    ndc_terms: "Climate targets & reporting",
    uganda: "Uganda places",
    finance: "Finance & budgets",
    climate_trace: "Satellite data",
  };
  return labels[bucket] ?? bucket.replace(/_/g, " ");
}

function downloadJson(report: ScanReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.report_id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
