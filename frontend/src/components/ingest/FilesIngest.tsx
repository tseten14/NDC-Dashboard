// Files Ingest — PDF/CSV/JSON upload, server-side parse, column mapping, confirm import.
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  UploadCloud,
  FileSpreadsheet,
  FileJson,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Loader2,
  History,
  Database,
  LayoutDashboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ingestApi,
  type IngestJobRow,
  type IngestParseWarning,
  type IngestConfirmResponse,
  type IngestUploadResponse,
  type ObservationField,
} from "@/lib/api";
import { AboutCard, AnalysisCard, RecommendationsCard } from "@/components/ingest/ScanReportIngest";

const ACCEPTED_EXT = [".pdf", ".csv", ".json"];
const ACCEPTED_MIME = new Set([
  "application/pdf",
  "text/csv",
  "application/json",
  "text/plain",
]);

const OBS_FIELDS: { key: ObservationField; label: string; required?: boolean }[] = [
  { key: "year", label: "Year", required: true },
  { key: "value", label: "Value", required: true },
  { key: "source", label: "Source" },
  { key: "target_id", label: "Target / indicator" },
];

const TYPE_BADGE: Record<string, string> = {
  number: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  date: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  text: "bg-muted text-muted-foreground border-border",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-at-risk/10 text-at-risk border-at-risk/30",
  processing: "bg-primary/10 text-primary border-primary/30",
  complete: "bg-on-track/10 text-on-track border-on-track/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = extOf(name);
  if (ext === ".json") return FileJson;
  if (ext === ".pdf") return FileText;
  return FileSpreadsheet;
}

function formatCell(value: unknown, type?: string): string {
  if (value == null || value === "") return "—";
  if (type === "number") {
    const n = Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(n)) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (type === "date") {
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
    }
  }
  return String(value);
}

function mappingReady(mapping: Partial<Record<ObservationField, string | null>>): boolean {
  return Boolean(mapping.year && mapping.value);
}

export function FilesIngest() {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<IngestUploadResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<
    Partial<Record<ObservationField, string | null>>
  >({});
  const [importDone, setImportDone] = useState(false);
  const [confirmResult, setConfirmResult] = useState<IngestConfirmResponse | null>(null);
  const [jobs, setJobs] = useState<IngestJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    void import("papaparse");
    void import("xlsx");
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await ingestApi.listJobs(10);
      setJobs(res.jobs);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const validateFile = (file: File): boolean => {
    const ext = extOf(file.name);
    if (!ACCEPTED_EXT.includes(ext) && !ACCEPTED_MIME.has(file.type)) {
      toast.error(`Unsupported file type. Upload PDF, CSV, or JSON (got ${ext || file.type || "unknown"}).`);
      return false;
    }
    return true;
  };

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;
    setSelectedFile(file);
    setUploading(true);
    setImportDone(false);
    setConfirmResult(null);
    setUploadResult(null);
    try {
      const result = await ingestApi.uploadFile(file);
      setUploadResult(result);
      setColumnMapping(result.columnMapping);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) void handleUpload(f);
  };

  const onConfirm = async () => {
    if (!uploadResult || !mappingReady(columnMapping)) return;
    setConfirming(true);
    try {
      const res = await ingestApi.confirmImport({
        jobId: uploadResult.jobId,
        finalColumnMapping: columnMapping,
      });
      setConfirmResult(res);
      if (res.status === "complete" && res.persisted) {
        toast.success(`Stored ${res.rowsImported} observation row(s) in the database`);
      } else if (res.status === "complete" && !res.persisted) {
        toast.warning("Import validated but nothing was stored — database not connected");
      } else {
        toast.error(res.errors[0]?.message ?? "Import failed");
      }
      setImportDone(true);
      await loadJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setColumnMapping({});
    setImportDone(false);
    setConfirmResult(null);
  };

  const previewRows = uploadResult?.preview ?? [];
  const previewHeaders = uploadResult?.headers ?? [];
  const inferredTypes = uploadResult?.inferredTypes ?? {};
  const warnings = uploadResult?.warnings ?? [];

  const downloadTemplate = () => {
    const a = document.createElement("a");
    a.href = "/samples/indicator-import-template.csv";
    a.download = "indicator-import-template.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-[10px] text-muted-foreground">
          Sample CSV for indicator targets (forest cover <code className="text-[9px]">t2</code>, electricity{" "}
          <code className="text-[9px]">t3</code>, CSA <code className="text-[9px]">t8</code>).
        </p>
        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={downloadTemplate}>
          <FileSpreadsheet className="h-3 w-3" />
          Download template
        </Button>
      </div>

      {/* Drop zone */}
      {!uploadResult && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-8 text-center transition cursor-pointer",
            uploading ? "opacity-60 pointer-events-none" : "hover:border-primary",
          )}
          onClick={() => !uploading && document.getElementById("ingest-file-input")?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
          ) : (
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-xs text-foreground font-medium">
            {uploading ? "Parsing on server…" : "Drop PDF, CSV, or JSON here, or click to browse"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Structured observation import · auto column detection
          </p>
          <input
            id="ingest-file-input"
            type="file"
            accept=".pdf,.csv,.json,application/pdf,text/csv,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {selectedFile && uploadResult && (
        <>
          {/* Selected file chip */}
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const Icon = fileIcon(selectedFile.name);
              return <Icon className="h-4 w-4 text-primary shrink-0" />;
            })()}
            <span className="text-xs font-medium text-foreground">{selectedFile.name}</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {uploadResult.fileType}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {formatBytes(selectedFile.size)}
            </Badge>
            {!importDone && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={reset}>
                Change file
              </Button>
            )}
          </div>

          {/* Parse result panel */}
          <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">Parse result</span>
              <span className="text-muted-foreground">
                {uploadResult.rowCount.toLocaleString()} rows · {previewHeaders.length} columns
                {warnings.length > 0 && ` · ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {previewHeaders.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {previewHeaders.map((h) => (
                  <Badge
                    key={h}
                    variant="outline"
                    className={cn("text-[10px] font-normal gap-1", TYPE_BADGE[inferredTypes[h] ?? "text"])}
                  >
                    <span className="font-medium">{h}</span>
                    <span className="opacity-70">{inferredTypes[h] ?? "text"}</span>
                  </Badge>
                ))}
              </div>
            )}

            {/* Column mapping editor */}
            {previewHeaders.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Column mapping
                </p>
                <div className="overflow-x-auto touch-scroll-x">
                  <table className="w-full text-[10px] min-w-[320px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left p-1.5 font-semibold">Field</th>
                        <th className="text-left p-1.5 font-semibold">Source column</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OBS_FIELDS.map(({ key, label, required }) => (
                        <tr key={key} className="border-b border-border/30">
                          <td className="p-1.5 align-middle">
                            <span className="font-medium text-foreground">{label}</span>
                            {required && <span className="text-destructive ml-0.5">*</span>}
                          </td>
                          <td className="p-1.5">
                            <Select
                              value={columnMapping[key] ?? "__none__"}
                              onValueChange={(v) =>
                                setColumnMapping((m) => ({
                                  ...m,
                                  [key]: v === "__none__" ? null : v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="— not mapped —" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— not mapped —</SelectItem>
                                {previewHeaders.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Data preview */}
            {previewHeaders.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Preview (first {Math.min(10, uploadResult.rowCount)} rows)
                </p>
                <div className="max-h-56 overflow-auto touch-scroll-x border border-border rounded">
                  <table className="w-full text-[10px]">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        {previewHeaders.map((h) => (
                          <th
                            key={h}
                            className={cn(
                              "text-left p-1.5 font-semibold whitespace-nowrap",
                              inferredTypes[h] === "number" && "text-right",
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.preview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t border-border/30">
                          {previewHeaders.map((h) => (
                            <td
                              key={h}
                              className={cn(
                                "p-1.5 whitespace-nowrap max-w-[140px] truncate",
                                inferredTypes[h] === "number" && "text-right tabular-nums",
                              )}
                              title={String(row[h] ?? "")}
                            >
                              {formatCell(row[h], inferredTypes[h])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {uploadResult.fileType === "pdf" && uploadResult.rowCount === 0 && !uploadResult.pdfInsights && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded p-2">
                <AlertTriangle className="h-4 w-4 text-at-risk shrink-0 mt-0.5" />
                <p>
                  PDF text could not be analyzed. Try the Auto-scan tab, or export your data as CSV or JSON
                  for structured observation import.
                </p>
              </div>
            )}
          </div>

          {uploadResult.pdfInsights && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                PDF analysis
                {uploadResult.pdfInsights.pages > 0 && (
                  <span className="font-normal normal-case ml-1">
                    · {uploadResult.pdfInsights.pages} page(s) · {uploadResult.pdfInsights.chars.toLocaleString()} chars
                  </span>
                )}
              </p>
              <AboutCard about={uploadResult.pdfInsights.about as Parameters<typeof AboutCard>[0]["about"]} />
              <AnalysisCard
                analysis={uploadResult.pdfInsights.analysis as Parameters<typeof AnalysisCard>[0]["analysis"]}
                kind="pdf"
              />
              {uploadResult.pdfInsights.recommendations?.length > 0 && (
                <RecommendationsCard items={uploadResult.pdfInsights.recommendations} />
              )}
            </div>
          )}

          {/* Warnings panel */}
          {warnings.length > 0 && (
            <div className="rounded-lg border border-at-risk/30 bg-at-risk/5 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-at-risk font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Warnings
              </p>
              <div className="space-y-1">
                {warnings.map((w: IngestParseWarning, i) => (
                  <WarningRow key={i} warning={w} />
                ))}
              </div>
            </div>
          )}

          {/* Confirm */}
          {!importDone ? (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!mappingReady(columnMapping) || confirming || uploadResult.rowCount === 0}
                onClick={() => void onConfirm()}
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Importing…
                  </>
                ) : (
                  "Confirm & import"
                )}
              </Button>
              {!mappingReady(columnMapping) && uploadResult.rowCount > 0 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  Map year and value columns to enable import
                </span>
              )}
            </div>
          ) : (
            <ImportSuccessPanel result={confirmResult} onReset={reset} />
          )}
        </>
      )}

      {/* Import history */}
      <div className="pt-3 border-t border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
          <History className="h-3 w-3" /> Import history
        </p>
        {jobsLoading ? (
          <p className="text-[10px] text-muted-foreground">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">No ingest jobs yet.</p>
        ) : (
          <div className="max-h-48 overflow-auto touch-scroll-x">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left p-1.5">Time</th>
                  <th className="text-left p-1.5">File</th>
                  <th className="text-left p-1.5">Type</th>
                  <th className="text-left p-1.5">Status</th>
                  <th className="text-right p-1.5">Rows</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-border/30">
                    <td className="p-1.5 whitespace-nowrap">
                      {j.created_at.replace("T", " ").slice(0, 16)}
                    </td>
                    <td className="p-1.5 font-medium text-foreground max-w-[120px] truncate" title={j.filename}>
                      {j.filename}
                    </td>
                    <td className="p-1.5 uppercase">{j.file_type}</td>
                    <td className="p-1.5">
                      <Badge variant="outline" className={cn("text-[9px] h-4 capitalize", STATUS_BADGE[j.status])}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="p-1.5 text-right tabular-nums">{j.row_count ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportSuccessPanel({
  result,
  onReset,
}: {
  result: IngestConfirmResponse | null;
  onReset: () => void;
}) {
  const persisted = result?.persisted ?? false;
  const borderClass = persisted
    ? "border-on-track/30 bg-on-track/5"
    : "border-at-risk/30 bg-at-risk/5";

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", borderClass)}>
      <div className="flex items-start gap-2">
        {persisted ? (
          <CheckCircle2 className="h-5 w-5 text-on-track shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-at-risk shrink-0 mt-0.5" />
        )}
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {persisted
              ? `${result?.rowsImported ?? 0} observation row(s) written to the database`
              : "Import finished — nothing was stored"}
          </p>
          {result?.storage && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3 shrink-0" />
              Stored in <span className="font-mono text-foreground">{result.storage}</span>
              {result.auditFile && (
                <span className="text-muted-foreground"> · audit copy at {result.auditFile}</span>
              )}
            </p>
          )}
          {result?.targetKeys && result.targetKeys.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Target keys:{" "}
              <span className="font-medium text-foreground">{result.targetKeys.join(", ")}</span>
              {result.yearRange && (
                <span>
                  {" "}
                  · years {result.yearRange.min}–{result.yearRange.max}
                </span>
              )}
            </p>
          )}
          {result?.rowsSkipped ? (
            <p className="text-[11px] text-at-risk">
              {result.rowsSkipped} row(s) skipped — see warnings above or fix mapping.
            </p>
          ) : null}
          {result?.dashboardHint && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{result.dashboardHint}</p>
          )}
          {persisted && (
            <Button asChild size="sm" variant="outline" className="h-7 text-xs mt-1">
              <Link to="/dashboard">
                <LayoutDashboard className="h-3 w-3 mr-1" />
                Open Dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onReset}>
        Import another file
      </Button>
    </div>
  );
}

function WarningRow({ warning }: { warning: IngestParseWarning }) {
  const [open, setOpen] = useState(false);
  const hasRows = Boolean(warning.rowNumbers?.length);

  if (!hasRows) {
    return <p className="text-[10px] text-foreground/90">{warning.message}</p>;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-left w-full hover:text-foreground">
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
        <span>{warning.message}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 pt-1 text-[10px] text-muted-foreground font-mono">
        Rows: {warning.rowNumbers!.slice(0, 50).join(", ")}
        {warning.rowNumbers!.length > 50 && ` … +${warning.rowNumbers!.length - 50} more`}
      </CollapsibleContent>
    </Collapsible>
  );
}
