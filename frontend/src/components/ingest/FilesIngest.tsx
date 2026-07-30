/**
 * Import: upload a file.
 *
 * The main import path. A file is uploaded, inspected, and shown back to the
 * user with the app's interpretation of each column and any quality problems it
 * found. Nothing is saved until the user confirms, and if the figures would
 * overwrite existing ones they are told before it happens rather than after.
 */
// Data Pipeline — upload → map columns → preview clean rows → save to database.
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UploadCloud,
  FileSpreadsheet,
  FileJson,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  History,
  Database,
  LayoutDashboard,
  ArrowRight,
  Download,
} from "lucide-react";
import { cleanedFilename, cleanedRowsToCsv, downloadCsv } from "@/lib/csvExport";
import { recordUpload } from "@/lib/uploaded-files-store";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ingestApi,
  IngestConflictError,
  type IngestJobRow,
  type IngestConfirmResponse,
  type IngestExecutionMode,
  type IngestUploadResponse,
  type ObservationField,
  type PipelineScanResponse,
  type PipelineFilterOptions,
  type ConflictCheck,
} from "@/lib/api";

const ACCEPTED_EXT = [".pdf", ".csv", ".json"];
const ROW_COUNT_VALUE_COLUMN = "__row_count__";

const MAP_FIELDS: {
  key: ObservationField;
  label: string;
  hint: string;
  required?: boolean;
}[] = [
  { key: "year", label: "Year or date", hint: "Publication date or reporting year", required: true },
  { key: "target_id", label: "Category / indicator", hint: "Sector, category, or target name", required: true },
  { key: "source", label: "Source", hint: "Publisher or data provider" },
];

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

function formatCell(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

function groupConflictItems(items: ConflictCheck["items"]): { label: string; years: number[]; isProtected: boolean }[] {
  const byLabel = new Map<string, { years: Set<number>; isProtected: boolean }>();
  for (const item of items) {
    const entry = byLabel.get(item.label) ?? { years: new Set<number>(), isProtected: false };
    entry.years.add(item.year);
    if (item.existingStatus !== "ingested") entry.isProtected = true;
    byLabel.set(item.label, entry);
  }
  return [...byLabel.entries()].map(([label, { years, isProtected }]) => ({
    label,
    years: [...years].sort((a, b) => a - b),
    isProtected,
  }));
}

function mappingReady(
  mapping: Partial<Record<ObservationField, string | null>>,
  documentCountMode?: boolean,
): boolean {
  return Boolean(mapping.year && mapping.target_id && (documentCountMode || mapping.value));
}

function amountModeLabel(
  mapping: Partial<Record<ObservationField, string | null>>,
  documentCountMode?: boolean,
): string {
  if (documentCountMode) return "1 per row (document count)";
  if (mapping.value) return `from “${mapping.value}” column`;
  return "not detected — re-upload or use an indicator CSV with a value column";
}

export function FilesIngest() {
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<IngestUploadResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Partial<Record<ObservationField, string | null>>>({});
  const [pipelineResult, setPipelineResult] = useState<PipelineScanResponse | null>(null);
  const [pipelineFilters, setPipelineFilters] = useState<PipelineFilterOptions>({
    ugandaOnly: true,
    dropDuplicates: true,
    latestYearOnly: false,
    documentCountMode: false,
  });
  const [importDone, setImportDone] = useState(false);
  const [confirmResult, setConfirmResult] = useState<IngestConfirmResponse | null>(null);
  const [jobs, setJobs] = useState<IngestJobRow[]>([]);
  const [fileKind, setFileKind] = useState<"policy_catalog" | "indicator" | null>(null);
  const [conflictCheck, setConflictCheck] = useState<ConflictCheck | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const effectiveMapping = (): Partial<Record<ObservationField, string | null>> => {
    if (pipelineFilters.documentCountMode) {
      return { ...columnMapping, value: ROW_COUNT_VALUE_COLUMN };
    }
    return columnMapping;
  };

  const loadJobs = useCallback(async () => {
    try {
      const res = await ingestApi.listJobs(8);
      setJobs(res.jobs);
    } catch {
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const reset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setColumnMapping({});
    setPipelineResult(null);
    setImportDone(false);
    setConfirmResult(null);
    setFileKind(null);
    setConflictCheck(null);
    setShowConflictModal(false);
  };

  const applyCleanResult = (res: PipelineScanResponse, download = false) => {
    setPipelineResult(res);
    setConflictCheck(res.conflictCheck ?? null);
    if (res.rowsOutput === 0) {
      toast.warning("No rows passed the filters — check your column mapping.");
      return;
    }
    if (download && selectedFile && uploadResult) {
      const csv = cleanedRowsToCsv(uploadResult.headers, res.cleanedRows);
      downloadCsv(cleanedFilename(selectedFile.name), csv);
      toast.success(`Downloaded ${res.rowsOutput.toLocaleString()} cleaned rows`);
    }
  };

  const handleUpload = async (file: File) => {
    const ext = extOf(file.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      toast.error("Upload a CSV, JSON, or PDF file.");
      return;
    }
    setUploading(true);
    setUploadResult(null);
    setColumnMapping({});
    setPipelineResult(null);
    setImportDone(false);
    setConfirmResult(null);
    setSelectedFile(file);
    try {
      const result = await ingestApi.uploadFile(file);
      setUploadResult(result);
      setColumnMapping(result.columnMapping);
      setFileKind(result.fileKind ?? null);
      recordUpload({ name: file.name, ext, size: file.size, rows: result.rowCount, status: "uploaded" });
      setPipelineFilters(
        result.pipelineDefaults ?? {
          ugandaOnly: Boolean(result.headers.some((h) => /geograph|country|region/i.test(h))),
          dropDuplicates: true,
          latestYearOnly: false,
          documentCountMode: !result.columnMapping.value,
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const runClean = async () => {
    if (!uploadResult || !mappingReady(columnMapping, pipelineFilters.documentCountMode)) return;
    setScanning(true);
    try {
      const res = await ingestApi.pipelineScan({
        jobId: uploadResult.jobId,
        columnMapping: effectiveMapping(),
        filters: pipelineFilters,
      });
      applyCleanResult(res, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clean failed");
    } finally {
      setScanning(false);
    }
  };

  const onDownloadCleaned = () => {
    if (pipelineResult?.cleanedRows?.length) {
      const csv = cleanedRowsToCsv(headers, pipelineResult.cleanedRows);
      downloadCsv(cleanedFilename(selectedFile!.name), csv);
      return;
    }
    void runClean();
  };

  const doConfirm = async (executionMode?: IngestExecutionMode) => {
    if (!uploadResult || !mappingReady(columnMapping, pipelineFilters.documentCountMode)) return;
    setConfirming(true);
    try {
      const res = await ingestApi.confirmImport({
        jobId: uploadResult.jobId,
        finalColumnMapping: effectiveMapping(),
        pipelineFilters,
        executionMode,
      });
      setConfirmResult(res);
      setShowConflictModal(false);
      if (res.status === "complete" && (res.persisted || res.rowsImported > 0)) {
        setImportDone(true);
        const skippedNote = res.skippedConflicts ? ` (${res.skippedConflicts} row(s) left untouched)` : "";
        toast.success(
          res.storage
            ? `Saved ${res.rowsImported} row(s) → ${res.storage}${skippedNote}`
            : `Saved ${res.rowsImported} row(s)${skippedNote}`,
        );
      } else if (res.status === "complete" && res.skippedConflicts) {
        // Nothing new to write, but not an error — every row matched existing/protected data.
        toast.info(res.dashboardHint ?? "No new rows — matching data already existed.");
      } else {
        toast.error(res.errors[0]?.message ?? res.dashboardHint ?? "Save failed");
      }
      await loadJobs();
    } catch (err) {
      if (err instanceof IngestConflictError) {
        setConflictCheck(err.conflictCheck);
        setShowConflictModal(true);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setConfirming(false);
    }
  };

  const onSave = () => void doConfirm(undefined);

  const headers = uploadResult?.headers ?? [];
  const usedColumns = new Set(
    Object.values(columnMapping).filter((v): v is string => Boolean(v)),
  );
  const previewColumns = [
    columnMapping.year,
    pipelineFilters.documentCountMode ? "document_count" : columnMapping.value,
    columnMapping.target_id,
    columnMapping.source,
    headers.find((h) => /geograph/i.test(h)),
  ].filter((v, i, a) => v && a.indexOf(v) === i) as string[];

  const step = !uploadResult ? 1 : importDone ? 3 : 2;

  return (
    <div className="space-y-4 max-w-3xl">
      <StepBar step={step} />

      {!uploadResult && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void handleUpload(f);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById("pipeline-file-input")?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition",
            uploading ? "opacity-60 pointer-events-none" : "border-border hover:border-primary",
          )}
        >
          {uploading ? (
            <Loader2 className="h-9 w-9 mx-auto text-primary animate-spin mb-2" />
          ) : (
            <UploadCloud className="h-9 w-9 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-sm font-medium text-foreground">
            {uploading ? "Reading file…" : "Drop your CSV or JSON here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Raw data is cleaned and filtered before it is saved
          </p>
          <input
            id="pipeline-file-input"
            type="file"
            accept=".csv,.json,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {selectedFile && uploadResult && !importDone && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const Icon = fileIcon(selectedFile.name);
              return <Icon className="h-4 w-4 text-primary" />;
            })()}
            <span className="text-sm font-medium truncate max-w-[240px]">{selectedFile.name}</span>
            <Badge variant="outline" className="text-[10px]">
              {uploadResult.rowCount.toLocaleString()} rows
            </Badge>
            {fileKind === "policy_catalog" && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Policy catalog defaults applied
              </Badge>
            )}
            <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={reset}>
              Change file
            </Button>
          </div>

          {uploadResult.fileType === "pdf" ? (
            <p className="text-xs text-muted-foreground">
              PDF files cannot be saved as dashboard observations. Use <strong>Quick scan</strong> for a
              summary, or export as CSV.
            </p>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">1. Map columns</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MAP_FIELDS.map(({ key, label, hint, required }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-medium text-foreground">
                        {label}
                        {required && <span className="text-destructive ml-0.5">*</span>}
                      </label>
                      <Select
                        value={columnMapping[key] ?? "__none__"}
                        onValueChange={(v) => {
                          setPipelineResult(null);
                          setColumnMapping((m) => ({
                            ...m,
                            [key]: v === "__none__" ? null : v,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Choose column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— not mapped —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem
                              key={h}
                              value={h}
                              disabled={usedColumns.has(h) && columnMapping[key] !== h}
                            >
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-2">
                  Amount: {amountModeLabel(columnMapping, pipelineFilters.documentCountMode)}
                  {fileKind === "policy_catalog" ? " — applied automatically for policy document lists." : ""}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">2. Cleaning filters</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <FilterToggle
                    label="Uganda only"
                    checked={pipelineFilters.ugandaOnly}
                    onChange={(ugandaOnly) => {
                      setPipelineResult(null);
                      setPipelineFilters((f) => ({ ...f, ugandaOnly }));
                    }}
                  />
                  <FilterToggle
                    label="Remove duplicates"
                    checked={pipelineFilters.dropDuplicates}
                    onChange={(dropDuplicates) => {
                      setPipelineResult(null);
                      setPipelineFilters((f) => ({ ...f, dropDuplicates }));
                    }}
                  />
                  <FilterToggle
                    label="Latest year only"
                    checked={pipelineFilters.latestYearOnly}
                    onChange={(latestYearOnly) => {
                      setPipelineResult(null);
                      setPipelineFilters((f) => ({ ...f, latestYearOnly }));
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={scanning || !mappingReady(columnMapping, pipelineFilters.documentCountMode)}
                  onClick={() => void runClean()}
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Cleaning…
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Clean &amp; download CSV
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  disabled={confirming || !mappingReady(columnMapping, pipelineFilters.documentCountMode)}
                  onClick={() => void onSave()}
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      Save to database
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              </div>

              {conflictCheck?.hasConflicts && (
                <p className="text-[10px] text-at-risk flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Existing data found for {conflictCheck.count} categor{conflictCheck.count === 1 ? "y" : "ies"}/year
                  {conflictCheck.count === 1 ? "" : "s"} — you’ll choose Append or Overwrite when saving.
                </p>
              )}

              {pipelineResult && (
                <CleanSummary
                  result={pipelineResult}
                  onDownload={onDownloadCleaned}
                  filename={selectedFile ? cleanedFilename(selectedFile.name) : "cleaned.csv"}
                />
              )}

              {previewColumns.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                    {pipelineResult ? "Clean preview" : "Mapped columns preview"}
                  </p>
                  <div className="max-h-48 overflow-auto border border-border rounded text-[10px]">
                    <table className="w-full">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          {previewColumns.map((h) => (
                            <th key={h} className="text-left p-2 font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(pipelineResult?.preview ?? uploadResult.preview).slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-t border-border/40">
                            {previewColumns.map((h) => (
                              <td key={h} className="p-2 whitespace-nowrap max-w-[160px] truncate">
                                {formatCell(
                                  h === "document_count"
                                    ? pipelineFilters.documentCountMode
                                      ? 1
                                      : null
                                    : row[h],
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {importDone && (
        <ImportSuccessPanel result={confirmResult} onReset={reset} />
      )}

      {jobs.length > 0 && (
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer font-semibold uppercase tracking-wider flex items-center gap-1">
            <History className="h-3 w-3" /> Recent imports ({jobs.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {jobs.map((j) => (
              <li key={j.id} className="flex gap-2">
                <span className="text-foreground/80 truncate">{j.filename}</span>
                <span className="ml-auto tabular-nums">{j.row_count ?? "—"} rows</span>
                <Badge variant="outline" className="text-[9px] h-4 capitalize">
                  {j.status}
                </Badge>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={showConflictModal} onOpenChange={(open) => !confirming && setShowConflictModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Existing data found</DialogTitle>
            <DialogDescription>
              A dataset for this region/document already exists. Choose how to save the overlapping rows.
            </DialogDescription>
          </DialogHeader>
          {conflictCheck && (
            <div className="max-h-40 overflow-auto text-xs space-y-1.5 border border-border rounded p-2">
              {groupConflictItems(conflictCheck.items).map((g) => (
                <div key={g.label} className="flex justify-between gap-3">
                  <span className="font-medium text-foreground truncate">{g.label}</span>
                  <span className="text-muted-foreground shrink-0 text-right">
                    {g.years.join(", ")}
                    {g.isProtected ? " — official data, won’t be overwritten" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={confirming}
              onClick={() => setShowConflictModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={confirming}
              onClick={() => void doConfirm("append")}
            >
              {confirming && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Append Data
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={confirming}
              onClick={() => void doConfirm("overwrite")}
            >
              {confirming && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Overwrite Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  const items = ["Upload file", "Map & clean", "Saved"];
  return (
    <div className="flex items-center gap-2 text-[10px]">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step >= n;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/50">→</span>}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5 border",
                active ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                  active ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {n}
              </span>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}

function CleanSummary({
  result,
  onDownload,
  filename,
}: {
  result: PipelineScanResponse;
  onDownload: () => void;
  filename: string;
}) {
  return (
    <div className="rounded-md border border-on-track/25 bg-on-track/5 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground">
          {result.rowsOutput.toLocaleString()} cleaned rows
          <span className="font-normal text-muted-foreground">
            {" "}
            (from {result.rowsInput.toLocaleString()} raw)
          </span>
        </p>
        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] ml-auto" onClick={onDownload}>
          <Download className="h-3 w-3 mr-1" />
          Download {filename}
        </Button>
      </div>
      {result.steps
        .filter((s) => s.removed > 0 || s.id === "document_count")
        .map((s) => (
          <p key={s.id} className="text-[10px] text-muted-foreground">
            <span className="text-foreground/90">{s.label}:</span>{" "}
            {s.removed > 0 ? `removed ${s.removed.toLocaleString()} rows` : s.detail}
          </p>
        ))}
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
  const ok = (result?.persisted ?? false) || (result?.rowsImported ?? 0) > 0;
  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        ok ? "border-on-track/30 bg-on-track/5" : "border-at-risk/30 bg-at-risk/5",
      )}
    >
      <div className="flex gap-2">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-on-track shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-at-risk shrink-0" />
        )}
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold">
            {ok || (result?.rowsImported ?? 0) > 0
              ? `${result?.rowsImported ?? 0} observations saved`
              : "Nothing was saved"}
          </p>
          {result?.storage && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3 shrink-0" />
              {result.storage}
            </p>
          )}
          {result?.dashboardHint && (
            <p className="text-xs text-muted-foreground">{result.dashboardHint}</p>
          )}
          {result?.targetKeys && result.targetKeys.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Categories saved: {result.targetKeys.slice(0, 6).join(", ")}
              {result.targetKeys.length > 6 ? " …" : ""}
            </p>
          )}
        </div>
      </div>
      {ok && (
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link to="/dashboard">
            <LayoutDashboard className="h-3 w-3 mr-1" />
            Open Dashboard
          </Link>
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onReset}>
        Import another file
      </Button>
    </div>
  );
}
