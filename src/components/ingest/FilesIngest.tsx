// Files Ingest — XLSX/CSV dropzone, parse, column-mapping wizard, validation preview, Draft → Publish.
import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "drop" | "map" | "preview" | "done";
type DatasetKind = "indicator_progress" | "activity_outputs" | "district_values";

const REQUIRED_COLS: Record<DatasetKind, string[]> = {
  indicator_progress: ["indicator_id", "period_end", "value", "validation_status"],
  activity_outputs: ["activity_id", "output_description", "quantity", "unit"],
  district_values: ["indicator_id", "district", "year", "value"],
};

interface ImportLog {
  ts: string;
  filename: string;
  kind: DatasetKind;
  rows_total: number;
  rows_ok: number;
  errors: { row: number; message: string }[];
  status: "Draft" | "Published";
}

export function FilesIngest() {
  const [step, setStep] = useState<Step>("drop");
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [kind, setKind] = useState<DatasetKind>("indicator_progress");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>(() => {
    try { return JSON.parse(localStorage.getItem("ingest_logs") ?? "[]"); } catch { return []; }
  });

  const onDrop = useCallback(async (file: File) => {
    setFilename(file.name);
    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
      setRows(parsed.data); setHeaders(parsed.meta.fields ?? []);
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      setRows(json); setHeaders(Object.keys(json[0] ?? {}));
    } else {
      toast.error("Unsupported file type. Use .xlsx or .csv.");
      return;
    }
    setStep("map");
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onDrop(f);
  };

  const validate = () => {
    const required = REQUIRED_COLS[kind];
    const errs: { row: number; message: string }[] = [];
    rows.forEach((r, idx) => {
      required.forEach(col => {
        const src = mapping[col];
        if (!src || r[src] === "" || r[src] === undefined || r[src] === null) {
          errs.push({ row: idx + 2, message: `Missing required column "${col}".` });
        }
      });
    });
    setErrors(errs);
    setStep("preview");
  };

  const publish = (status: "Draft" | "Published") => {
    const log: ImportLog = {
      ts: new Date().toISOString(),
      filename,
      kind,
      rows_total: rows.length,
      rows_ok: rows.length - errors.length,
      errors: errors.slice(0, 100),
      status,
    };
    const next = [log, ...logs].slice(0, 30);
    setLogs(next);
    localStorage.setItem("ingest_logs", JSON.stringify(next));
    toast.success(`${rows.length - errors.length} rows ${status === "Published" ? "published" : "saved as Draft"}`);
    setStep("done");
  };

  const reset = () => { setStep("drop"); setFilename(""); setRows([]); setHeaders([]); setMapping({}); setErrors([]); };

  return (
    <div className="space-y-3">
      {step === "drop" && (
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
          onClick={() => document.getElementById("file-input")?.click()}>
          <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-foreground font-medium">Drop .xlsx or .csv here, or click to browse</p>
          <p className="text-[10px] text-muted-foreground mt-1">Indicator progress · Activity outputs · District values</p>
          <input id="file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onDrop(f); }} />
        </div>
      )}

      {step === "map" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{filename}</span>
            <Badge variant="outline" className="text-[10px]">{rows.length} rows</Badge>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dataset type</label>
            <Select value={kind} onValueChange={(v: DatasetKind) => { setKind(v); setMapping({}); }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indicator_progress">Indicator progress (id, period_end, value, validation_status)</SelectItem>
                <SelectItem value="activity_outputs">Activity outputs (activity_id, output_description, quantity, unit)</SelectItem>
                <SelectItem value="district_values">District values (indicator_id, district, year, value)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Map columns</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {REQUIRED_COLS[kind].map(req => (
                <div key={req} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-foreground w-32">{req}</span>
                  <Select value={mapping[req] ?? ""} onValueChange={v => setMapping(m => ({ ...m, [req]: v }))}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="— pick column —" /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={reset}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={validate}
              disabled={REQUIRED_COLS[kind].some(c => !mapping[c])}>Validate & preview</Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {errors.length === 0
              ? <><CheckCircle2 className="h-4 w-4 text-on-track" /><span className="text-xs text-foreground">All {rows.length} rows pass validation.</span></>
              : <><AlertTriangle className="h-4 w-4 text-at-risk" /><span className="text-xs text-foreground">{errors.length} row(s) have errors.</span></>
            }
          </div>
          {errors.length > 0 && (
            <div className="max-h-48 overflow-auto border border-border rounded text-[10px]">
              <table className="w-full">
                <thead className="bg-muted/30"><tr><th className="text-left p-1.5">Row</th><th className="text-left p-1.5">Error</th></tr></thead>
                <tbody>{errors.slice(0, 50).map((e, i) => (<tr key={i} className="border-t border-border/30"><td className="p-1.5">{e.row}</td><td className="p-1.5">{e.message}</td></tr>))}</tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={reset}>Cancel</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => publish("Draft")}>Save as Draft</Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => publish("Published")} disabled={errors.length > 0}>Publish</Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="text-center py-6 space-y-2">
          <CheckCircle2 className="h-8 w-8 text-on-track mx-auto" />
          <p className="text-xs text-foreground font-medium">Import recorded.</p>
          <Button size="sm" className="h-7 text-xs" onClick={reset}>Import another file</Button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Import log (audit trail)</p>
          <div className="max-h-40 overflow-auto">
            <table className="w-full text-[10px]">
              <thead><tr className="text-muted-foreground border-b border-border">
                <th className="text-left p-1">Timestamp</th><th className="text-left p-1">File</th><th className="text-left p-1">Kind</th>
                <th className="text-right p-1">OK/Total</th><th className="text-left p-1">Status</th>
              </tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="p-1">{l.ts.replace("T"," ").slice(0,16)}</td>
                    <td className="p-1 font-medium text-foreground">{l.filename}</td>
                    <td className="p-1">{l.kind}</td>
                    <td className="p-1 text-right">{l.rows_ok}/{l.rows_total}</td>
                    <td className="p-1"><Badge variant="outline" className={cn("text-[9px] h-4", l.status === "Published" ? "bg-on-track/10 text-on-track border-on-track/30" : "bg-at-risk/10 text-at-risk border-at-risk/30")}>{l.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
